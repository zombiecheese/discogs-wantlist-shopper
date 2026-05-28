import crypto from "crypto";
import OAuth from "oauth-1.0a";
import type { DiscogsWantlistItem, MarketplaceListing } from "./types";

const API_BASE = "https://api.discogs.com";
const releaseListingIdCache = new Map<number, number[]>();

type BrowserLike = {
  newContext: (options: {
    userAgent: string;
    locale: string;
  }) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, options: { waitUntil: "domcontentloaded"; timeout: number }) => Promise<void>;
      waitForTimeout: (ms: number) => Promise<void>;
      $$eval: <T>(selector: string, pageFunction: (elements: Element[]) => T) => Promise<T>;
    }>;
    close: () => Promise<void>;
  }>;
  close: () => Promise<void>;
};

let discoveryBrowserPromise: Promise<BrowserLike | null> | null = null;

export type DiscogsAuth =
  | {
      kind: "oauth";
      token: string;
      tokenSecret: string;
    }
  | {
      kind: "token";
      token: string;
    };

export type DiscogsIdentity = {
  username: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function userAgent() {
  return process.env.DISCOGS_USER_AGENT ?? "discogs-wantlist-shopper/0.1.0";
}

function createOAuthClient() {
  return new OAuth({
    consumer: {
      key: requiredEnv("DISCOGS_CONSUMER_KEY"),
      secret: requiredEnv("DISCOGS_CONSUMER_SECRET"),
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

function authHeaders(url: string, method: "GET" | "POST", auth?: DiscogsAuth, data: Record<string, string> = {}) {
  const oauth = createOAuthClient();

  if (auth?.kind === "token") {
    return {
      Authorization: `Discogs token=${auth.token}`,
      "User-Agent": userAgent(),
      Accept: "application/json",
    };
  }

  const requestData = {
    url,
    method,
    data,
  };

  const token = auth?.kind === "oauth" ? { key: auth.token, secret: auth.tokenSecret } : undefined;
  const signed = oauth.authorize(requestData, token);

  return {
    ...oauth.toHeader(signed),
    "User-Agent": userAgent(),
    Accept: "application/json",
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson<T>(url: string, init: RequestInit, retryCount = 0): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();

  // Handle rate limiting with exponential backoff
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    // Use Retry-After if provided, otherwise use exponential backoff starting at 8s
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount + 3) * 1000;

    if (retryCount < 6) {
      await delay(waitMs);
      return requestJson<T>(url, init, retryCount + 1);
    }

    throw new Error(`Discogs request failed (429 Too Many Requests after ${retryCount} retries)`);
  }

  if (!response.ok) {
    throw new Error(`Discogs request failed (${response.status}): ${raw.slice(0, 250)}`);
  }

  return JSON.parse(raw) as T;
}

function firstString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => firstString(item)).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object" && "name" in value) {
    return firstString((value as { name?: unknown }).name);
  }

  return "";
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") {
    return value ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => stringList(item)).filter(Boolean);
  }

  if (value && typeof value === "object" && "name" in value) {
    return stringList((value as { name?: unknown }).name);
  }

  return [];
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(path, API_BASE);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function parseListingIdFromUri(uri: string | null): number | null {
  if (!uri) {
    return null;
  }

  const matched = uri.match(/\/sell\/item\/(\d+)/i) ?? uri.match(/\/marketplace\/listings\/(\d+)/i);
  if (!matched?.[1]) {
    return null;
  }

  const parsed = Number(matched[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stablePositiveHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) + 1;
}

export async function createRequestToken(callbackUrl: string) {
  const url = `${API_BASE}/oauth/request_token`;
  const body = new URLSearchParams({ oauth_callback: callbackUrl }).toString();
  const headers = authHeaders(url, "POST", undefined, { oauth_callback: callbackUrl });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discogs request token failed (${response.status}): ${text.slice(0, 250)}`);
  }

  const params = new URLSearchParams(text);
  const token = params.get("oauth_token");
  const tokenSecret = params.get("oauth_token_secret");

  if (!token || !tokenSecret) {
    throw new Error("Discogs did not return a request token");
  }

  return { token, tokenSecret };
}

export async function exchangeAccessToken(requestToken: string, requestTokenSecret: string, verifier: string) {
  const url = `${API_BASE}/oauth/access_token`;
  const body = new URLSearchParams({ oauth_verifier: verifier }).toString();
  const headers = authHeaders(url, "POST", { kind: "oauth", token: requestToken, tokenSecret: requestTokenSecret }, { oauth_verifier: verifier });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discogs access token failed (${response.status}): ${text.slice(0, 250)}`);
  }

  const params = new URLSearchParams(text);
  const token = params.get("oauth_token");
  const tokenSecret = params.get("oauth_token_secret");

  if (!token || !tokenSecret) {
    throw new Error("Discogs did not return an access token");
  }

  return { token, tokenSecret };
}

export async function fetchIdentity(auth?: DiscogsAuth): Promise<DiscogsIdentity> {
  const response = await requestJson<{ username?: string; uname?: string }>(`${API_BASE}/oauth/identity`, {
    method: "GET",
    headers: authHeaders(`${API_BASE}/oauth/identity`, "GET", auth),
  });

  const username = response.username ?? response.uname;
  if (!username) {
    throw new Error("Discogs identity response did not include a username");
  }

  return { username };
}

export async function fetchWantlist(username: string, auth?: DiscogsAuth): Promise<DiscogsWantlistItem[]> {
  async function fetchWantlistPage(page: number) {
    const url = buildUrl(`/users/${encodeURIComponent(username)}/wants`, { page, per_page: 100 });
    return requestJson<{
      wants?: Array<Record<string, unknown>>;
      pagination?: { pages?: number };
    }>(url, {
      method: "GET",
      headers: authHeaders(url, "GET", auth),
    });
  }

  const wants: DiscogsWantlistItem[] = [];
  const firstPage = await fetchWantlistPage(1);
  const rawEntries: Array<Record<string, unknown>> = [...(firstPage.wants ?? [])];
  const totalPages = firstPage.pagination?.pages ?? 1;

  // Reduced batch size from 4 to 2 to avoid rate limiting
  const pageBatchSize = 2;
  for (let startPage = 2; startPage <= totalPages; startPage += pageBatchSize) {
    const endPage = Math.min(startPage + pageBatchSize - 1, totalPages);
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
    const responses = await Promise.all(pages.map((page) => fetchWantlistPage(page)));

    for (const response of responses) {
      rawEntries.push(...(response.wants ?? []));
    }

    // Add delay between batches to reduce API load
    if (startPage + pageBatchSize <= totalPages) {
      await delay(500);
    }
  }

  for (const entry of rawEntries) {
    const release = (entry.release ?? entry.basic_information ?? entry) as Record<string, unknown>;
    const artists = release.artists ?? release.artists_sort ?? release.artist;
    const labels = release.labels ?? release.label;
    const genres = release.genres ?? release.genre;
    wants.push({
      wantId: toNumber(entry.id) ?? toNumber(release.id) ?? 0,
      releaseId: toNumber(release.id) ?? toNumber(entry.release_id) ?? 0,
      title: firstString(release.title),
      artist: firstString(artists),
      label: firstString(labels) || null,
      genres: [...new Set(stringList(genres))],
      year: toNumber(release.year),
      condition: firstString(entry.condition) || null,
      notes: firstString(entry.notes) || null,
      coverImage: firstString(release.thumb) || firstString(release.cover_image) || null,
      uri: firstString(release.uri) || null,
    });
  }

  return wants.filter((item) => item.releaseId > 0);
}

export async function searchMarketplaceByRelease(releaseId: number, auth?: DiscogsAuth): Promise<MarketplaceListing[]> {
  // Stage 1: attempt API-driven listing discovery first.
  try {
    const listings = await fetchMarketplaceListingsByRelease(releaseId, auth);
    if (listings.length > 0) {
      await delay(600);
      return listings;
    }
  } catch {
    // Fall through to stage 2 discovery below.
  }

  // Stage 2: discover listing IDs from sell page and hydrate via listing-get.
  const listingIds = await discoverListingIdsByReleaseViaSellPage(releaseId);
  if (listingIds.length === 0) {
    await delay(600);
    return [];
  }

  const hydrated: MarketplaceListing[] = [];
  for (const listingId of listingIds.slice(0, 80)) {
    try {
      const listing = await fetchMarketplaceListingById(listingId, releaseId, auth);
      if (listing) {
        hydrated.push(listing);
      }
    } catch {
      // Ignore bad listing IDs and keep building the result set.
    }
    await delay(800);
  }

  await delay(600);
  return hydrated;
}

async function discoverListingIdsByReleaseViaSellPage(releaseId: number): Promise<number[]> {
  const cached = releaseListingIdCache.get(releaseId);
  if (cached) {
    return cached;
  }

  try {
    const browser = await getDiscoveryBrowser();
    if (!browser) {
      return [];
    }

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    const page = await context.newPage();

    const sellUrl = `https://www.discogs.com/sell/release/${releaseId}?sort=price,asc&limit=250`;
    await page.goto(sellUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);

    const listingIds = await page.$$eval("a[href*='/sell/item/']", (anchors) => {
      const ids = anchors
        .map((anchor) => {
          const href = anchor.getAttribute("href") ?? "";
          const matched = href.match(/\/sell\/item\/(\d+)/i);
          if (!matched?.[1]) {
            return null;
          }

          const parsed = Number(matched[1]);
          return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        })
        .filter((value): value is number => value !== null);

      return Array.from(new Set(ids));
    });

    await context.close();
    releaseListingIdCache.set(releaseId, listingIds);
    return listingIds;
  } catch {
    return [];
  }
}

async function getDiscoveryBrowser(): Promise<BrowserLike | null> {
  if (!discoveryBrowserPromise) {
    discoveryBrowserPromise = (async () => {
      try {
        const playwright = await import("playwright-core");
        return (await playwright.chromium.launch({
          headless: true,
          channel: "msedge",
        })) as unknown as BrowserLike;
      } catch {
        return null;
      }
    })();
  }

  return discoveryBrowserPromise;
}

async function fetchMarketplaceListingById(listingId: number, releaseId: number, auth?: DiscogsAuth): Promise<MarketplaceListing | null> {
  const url = `${API_BASE}/marketplace/listings/${listingId}`;
  const response = await requestJson<Record<string, unknown>>(url, {
    method: "GET",
    headers: authHeaders(url, "GET", auth),
  });

  const sellerRecord = response.seller && typeof response.seller === "object" ? response.seller as Record<string, unknown> : null;
  const releaseRecord = response.release && typeof response.release === "object" ? response.release as Record<string, unknown> : null;
  const priceRecord = response.price && typeof response.price === "object" ? response.price as Record<string, unknown> : null;
  const shippingRecord = response.shipping_price && typeof response.shipping_price === "object" ? response.shipping_price as Record<string, unknown> : null;

  const resolvedReleaseId = toNumber(releaseRecord?.id) ?? releaseId;
  if (!resolvedReleaseId || resolvedReleaseId <= 0) {
    return null;
  }

  const seller = firstString(sellerRecord?.username) || firstString(sellerRecord?.name) || firstString(response.seller);
  if (!seller) {
    return null;
  }

  const listing: MarketplaceListing = {
    listingId,
    releaseId: resolvedReleaseId,
    title: firstString(releaseRecord?.description) || firstString(response.title) || `Release ${resolvedReleaseId}`,
    seller,
    sellerRating: toNumber(sellerRecord?.stats && typeof sellerRecord.stats === "object" ? (sellerRecord.stats as Record<string, unknown>).rating : sellerRecord?.rating),
    condition: firstString(response.condition) || null,
    shipsFrom: firstString(response.ships_from) || null,
    price: toNumber(priceRecord?.value),
    currency: firstString(priceRecord?.currency) || null,
    shipping: toNumber(shippingRecord?.value),
    numForSale: null,
    isMarketplaceAggregate: false,
    thumbnail: firstString(releaseRecord?.thumbnail) || null,
    uri: firstString(response.uri) || `https://www.discogs.com/sell/item/${listingId}`,
  };

  return listing;
}

async function fetchMarketplaceListingsByRelease(releaseId: number, auth?: DiscogsAuth): Promise<MarketplaceListing[]> {
  const perPage = 50;
  const firstPageUrl = buildUrl("/marketplace/search", {
    release_id: releaseId,
    per_page: perPage,
    page: 1,
    sort: "price",
    sort_order: "asc",
  });

  const firstPage = await requestJson<{
    listings?: Array<Record<string, unknown>>;
    results?: Array<Record<string, unknown>>;
    pagination?: { pages?: number };
    items?: Array<Record<string, unknown>>;
    data?: Array<Record<string, unknown>>;
  }>(firstPageUrl, {
    method: "GET",
    headers: authHeaders(firstPageUrl, "GET", auth),
  });

  const rawListings: Array<Record<string, unknown>> = [
    ...(firstPage.listings ?? firstPage.results ?? firstPage.items ?? firstPage.data ?? []),
  ];
  const totalPages = Math.min(firstPage.pagination?.pages ?? 1, 2);

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page += 1) {
      const pageUrl = buildUrl("/marketplace/search", {
        release_id: releaseId,
        per_page: perPage,
        page,
        sort: "price",
        sort_order: "asc",
      });

      const response = await requestJson<{
        listings?: Array<Record<string, unknown>>;
        results?: Array<Record<string, unknown>>;
      }>(pageUrl, {
        method: "GET",
        headers: authHeaders(pageUrl, "GET", auth),
      });

      rawListings.push(...(response.listings ?? response.results ?? []));
      await delay(600);
    }
  }

  // Some Discogs responses for release-specific marketplace data use a slightly
  // different shape; try an alternate query before giving up.
  if (rawListings.length === 0) {
    const altUrl = buildUrl("/marketplace/search", {
      release_id: releaseId,
      status: "For Sale",
      per_page: 100,
      page: 1,
    });

    const altPage = await requestJson<{
      listings?: Array<Record<string, unknown>>;
      results?: Array<Record<string, unknown>>;
    }>(altUrl, {
      method: "GET",
      headers: authHeaders(altUrl, "GET", auth),
    });

    rawListings.push(...(altPage.listings ?? altPage.results ?? []));
  }

  const normalized = rawListings
    .map((result) => normalizeMarketplaceListing(result, releaseId))
    .filter((listing) => listing.seller && listing.listingId > 0);

  const seen = new Set<number>();
  return normalized.filter((listing) => {
    if (seen.has(listing.listingId)) {
      return false;
    }
    seen.add(listing.listingId);
    return true;
  });
}

async function fetchReleaseSummary(releaseId: number, auth?: DiscogsAuth) {
  const url = `${API_BASE}/releases/${releaseId}`;
  const response = await requestJson<{
    title?: string;
    artists_sort?: string;
  }>(url, {
    method: "GET",
    headers: authHeaders(url, "GET", auth),
  });

  return {
    title: response.artists_sort ? `${response.artists_sort} - ${response.title ?? `Release ${releaseId}`}` : response.title ?? `Release ${releaseId}`,
  };
}

async function fetchMarketplaceStats(releaseId: number, auth?: DiscogsAuth) {
  const url = `${API_BASE}/marketplace/stats/${releaseId}`;
  const response = await requestJson<{
    num_for_sale?: number;
    lowest_price?: { value?: number; currency?: string };
  }>(url, {
    method: "GET",
    headers: authHeaders(url, "GET", auth),
  });

  return {
    numForSale: response.num_for_sale ?? null,
    lowestPrice: response.lowest_price?.value ?? null,
    currency: response.lowest_price?.currency ?? null,
  };
}

function normalizeMarketplaceListing(result: Record<string, unknown>, releaseId: number): MarketplaceListing {
  const sellerRecord = result.seller && typeof result.seller === "object" ? result.seller as Record<string, unknown> : null;
  const nestedListing = result.listing && typeof result.listing === "object" ? result.listing as Record<string, unknown> : null;
  const candidateUri =
    firstString(result.uri) ||
    firstString(result.resource_url) ||
    firstString((nestedListing as Record<string, unknown> | null)?.uri) ||
    null;
  const sellerName =
    firstString(sellerRecord?.username) ||
    firstString(sellerRecord?.name) ||
    firstString(result.seller_name) ||
    firstString(result.seller) ||
    firstString(result.username) ||
    "Unknown seller";
  const price = typeof result.price === "object" && result.price !== null
    ? toNumber((result.price as Record<string, unknown>).value)
    : toNumber(result.price);

  const shipping = typeof result.shipping === "object" && result.shipping !== null
    ? toNumber((result.shipping as Record<string, unknown>).value)
    : toNumber(result.shipping);

  const title = firstString(result.title) || firstString(result.name) || `Release ${releaseId}`;
  const condition = firstString(result.condition) || null;
  const listingId =
    toNumber(result.id) ??
    toNumber(result.listing_id) ??
    toNumber(nestedListing?.id) ??
    parseListingIdFromUri(candidateUri) ??
    stablePositiveHash(`${releaseId}|${sellerName}|${title}|${price ?? ""}|${shipping ?? ""}|${condition ?? ""}|${candidateUri ?? ""}`);

  return {
    listingId,
    releaseId,
    title,
    seller: sellerName,
    sellerRating: toNumber(sellerRecord?.rating) ?? toNumber(result.seller_rating) ?? toNumber(result.rating),
    condition,
    shipsFrom: firstString(sellerRecord?.location) || firstString(result.ships_from) || firstString(result.location) || null,
    price,
    currency: firstString((result.price as Record<string, unknown> | undefined)?.currency) || firstString(result.currency) || firstString(result.price_currency) || null,
    shipping,
    numForSale: null,
    isMarketplaceAggregate: false,
    thumbnail: firstString(result.thumb) || firstString(result.thumbnail) || null,
    uri: listingId > 0
      ? `https://www.discogs.com/sell/item/${listingId}`
      : candidateUri,
  };
}

export function getDiscogsAuthFromEnvOrThrow(): DiscogsAuth {
  const token = process.env.DISCOGS_PERSONAL_ACCESS_TOKEN;

  if (token) {
    return { kind: "token", token };
  }

  if (process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET) {
    throw new Error("OAuth session required");
  }

  throw new Error("No Discogs authentication is configured");
}