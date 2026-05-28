import { existsSync } from "fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchIdentity, getDiscogsAuthFromEnvOrThrow, searchMarketplaceByRelease } from "@/lib/discogs";

export const runtime = "nodejs";

// A well-known Discogs release that always has marketplace listings (Thriller by Michael Jackson).
const PROBE_RELEASE_ID = 365318;

async function checkBrowser(): Promise<{ ok: boolean; path: string | null; error: string | null }> {
  const path = process.env.CHROMIUM_PATH ?? null;
  if (path && !existsSync(path)) {
    return { ok: false, path, error: "CHROMIUM_PATH is set but the binary does not exist at that path" };
  }

  try {
    const playwright = await import("playwright-core");
    const launchOptions = path
      ? { headless: true as const, executablePath: path }
      : { headless: true as const, channel: "msedge" as const };

    const browser = await playwright.chromium.launch(launchOptions);
    await browser.close();
    return { ok: true, path, error: null };
  } catch (err) {
    return { ok: false, path, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkStage1(auth: { kind: string; token: string; tokenSecret?: string }) {

  // Hit the same API endpoint the app uses for stage 1.
  const url = new URL("https://api.discogs.com/marketplace/search");
  url.searchParams.set("release_id", String(PROBE_RELEASE_ID));
  url.searchParams.set("per_page", "5");
  url.searchParams.set("page", "1");

  const headers: Record<string, string> = {
    "User-Agent": process.env.DISCOGS_USER_AGENT ?? "discogs-wantlist-shopper/0.1.0",
    Accept: "application/json",
  };

  if (auth.kind === "token") {
    headers.Authorization = `Discogs token=${auth.token}`;
  }

  const response = await fetch(url.toString(), { method: "GET", headers });
  const raw = await response.text();
  let body: unknown;
  try { body = JSON.parse(raw); } catch { body = raw.slice(0, 300); }

  const listings = Array.isArray((body as Record<string, unknown>)?.listings)
    ? ((body as Record<string, unknown>).listings as unknown[]).length
    : null;

  return {
    status: response.status,
    listingsReturned: listings,
    paginationPages: (body as Record<string, unknown>)?.pagination
      ? ((body as Record<string, unknown>).pagination as Record<string, unknown>)?.pages
      : null,
    rawPreview: typeof body === "string" ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300),
  };
}

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_PUBLIC_URL: process.env.APP_PUBLIC_URL ?? "(not set)",
      CHROMIUM_PATH: process.env.CHROMIUM_PATH ?? "(not set)",
      DISCOGS_USER_AGENT: process.env.DISCOGS_USER_AGENT ?? "(not set)",
      hasConsumerKey: Boolean(process.env.DISCOGS_CONSUMER_KEY),
      hasConsumerSecret: Boolean(process.env.DISCOGS_CONSUMER_SECRET),
      hasPersonalToken: Boolean(process.env.DISCOGS_PERSONAL_ACCESS_TOKEN),
      DISCOGS_USERNAME: process.env.DISCOGS_USERNAME ?? "(not set)",
    },
  };

  // Auth check
  let auth: { kind: string; token: string; tokenSecret?: string } | null = null;
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("discogs_access_token")?.value;
    const accessSecret = cookieStore.get("discogs_access_secret")?.value;
    if (accessToken && accessSecret) {
      auth = { kind: "oauth", token: accessToken, tokenSecret: accessSecret };
      result.authSource = "oauth-cookie";
    } else {
      auth = getDiscogsAuthFromEnvOrThrow();
      result.authSource = "env-token";
    }
  } catch (err) {
    result.authSource = "none";
    result.authError = err instanceof Error ? err.message : String(err);
  }

  // Identity check
  if (auth) {
    try {
      const identity = auth.kind === "token"
        ? { username: process.env.DISCOGS_USERNAME ?? "" }
        : await fetchIdentity(auth);
      result.identity = identity;
    } catch (err) {
      result.identity = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Browser check
  result.browser = await checkBrowser();

  // Stage 1 API probe (only if we have auth)
  if (auth) {
    try {
      result.stage1Probe = await checkStage1(auth);
    } catch (err) {
      result.stage1Probe = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Full search probe for the known release (runs both stages, shows what comes back)
  if (auth && (auth.kind === "token" || (auth.kind === "oauth" && auth.tokenSecret))) {
    const typedAuth = auth as Parameters<typeof searchMarketplaceByRelease>[1];
    try {
      const listings = await searchMarketplaceByRelease(PROBE_RELEASE_ID, typedAuth);
      result.fullSearchProbe = {
        releaseId: PROBE_RELEASE_ID,
        listingsFound: listings.length,
        sampleSeller: listings[0]?.seller ?? null,
        samplePrice: listings[0]?.price ?? null,
      };
    } catch (err) {
      result.fullSearchProbe = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json(result, { status: 200 });
}
