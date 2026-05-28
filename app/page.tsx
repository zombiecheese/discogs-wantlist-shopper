"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getGenrePresentation } from "@/lib/genre-theme";
import type { DiscogsWantlistItem, SellerMatch } from "@/lib/types";

type WantlistResponse = {
  connected: boolean;
  username?: string;
  wantlist?: DiscogsWantlistItem[];
  authUrl?: string;
  error?: string;
};

type MatchResponse = {
  username?: string;
  matches?: SellerMatch[];
  error?: string;
};

type PriceMode = "total" | "listing";

type SearchCheckpoint = {
  version: 1;
  timestamp: number;
  selectedIds: number[];
  minRating: number;
  maxListingPrice: string;
  maxShippingPrice: string;
  shipsFrom: string;
  onlyAllSelected: boolean;
  allowedConditions: string[];
  batchSize: number;
  nextBatchIndex: number;
  partialMatches: SellerMatch[];
  modeLabel: string;
};

const SEARCH_CHECKPOINT_KEY = "discogsWantlistShopper.searchCheckpoint.v1";

const conditionOptions = ["Mint (M)", "Near Mint (NM or M-)", "Very Good Plus (VG+)", "Very Good (VG)", "Good Plus (G+)", "Good (G)"];

const darkThemeVariables = {
  "--bg": "#0d0f14",
  "--bg-soft": "#13161e",
  "--panel": "rgba(18, 21, 30, 0.9)",
  "--panel-strong": "rgba(22, 26, 38, 0.96)",
  "--line": "rgba(100, 120, 160, 0.18)",
  "--line-strong": "rgba(100, 120, 160, 0.34)",
  "--text": "#e2e8f4",
  "--muted": "#7f93b4",
  "--accent": "#4f8ef7",
  "--accent-strong": "#2563eb",
  "--paper": "#c8d6ee",
  "--danger": "#f87171",
  "--highlight": "#60a5fa",
  "--glow": "rgba(79, 142, 247, 0.2)",
  "--font-display": '"Bebas Neue", "Impact", sans-serif',
  "--font-body": '"Segoe UI", "Roboto", sans-serif',
  "--font-weight": "600",
  "--letter-spacing": "0.03em",
  "--radius-lg": "20px",
  "--radius-md": "14px",
  "--radius-sm": "10px",
  "--radius-pill": "999px",
  "--shadow-soft": "0 12px 32px rgba(0, 0, 0, 0.3)",
  "--shadow-strong": "0 20px 48px rgba(94, 101, 117, 0.15)",
} as CSSProperties;

function currencyLabel(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getMonogram(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function parseListParam(value: string | null) {
  if (!value) {
    return [];
  }

  return value.split(",").map((item) => decodeURIComponent(item)).filter(Boolean);
}

function parseNumberListParam(value: string | null) {
  return parseListParam(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseBooleanParam(value: string | null, fallback: boolean) {
  if (value === null) {
    return fallback;
  }

  return value === "true";
}

function getInitialUrlState() {
  if (typeof window === "undefined") {
    return {
      artistFilters: [] as string[],
      wantlistSearch: "",
      selectedIds: [] as number[],
      minRating: 0,
      maxListingPrice: "",
      maxShippingPrice: "",
      shipsFrom: "",
      onlyAllSelected: false,
      priceMode: "total" as PriceMode,
      allowedConditions: conditionOptions,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    artistFilters: parseListParam(params.get("artists")),
    wantlistSearch: params.get("q") ?? "",
    selectedIds: parseNumberListParam(params.get("selected")),
    minRating: (() => {
      const raw = params.get("minRating");
      const parsed = raw === null ? 0 : Number(raw);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    })(),
    maxListingPrice: params.get("maxPrice") ?? "",
    maxShippingPrice: params.get("maxShipping") ?? "",
    shipsFrom: params.get("shipsFrom") ?? "",
    onlyAllSelected: parseBooleanParam(params.get("allSelected"), false),
    priceMode: params.get("priceMode") === "listing" ? "listing" as PriceMode : "total" as PriceMode,
    allowedConditions: parseListParam(params.get("conditions")).length > 0 ? parseListParam(params.get("conditions")) : conditionOptions,
  };
}

function isRateLimitError(message: string | null) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("429") || normalized.includes("too many requests") || normalized.includes("rate limit");
}

function mergeSellerMatches(existingMatches: SellerMatch[], incomingMatches: SellerMatch[], selectedReleaseIds: number[]) {
  const merged = new Map<string, SellerMatch>();

  for (const seller of existingMatches) {
    merged.set(seller.seller, {
      ...seller,
      matchedReleaseIds: [...seller.matchedReleaseIds],
      matchedTitles: [...seller.matchedTitles],
      listings: [...seller.listings],
    });
  }

  for (const seller of incomingMatches) {
    const existing = merged.get(seller.seller);
    if (!existing) {
      merged.set(seller.seller, {
        ...seller,
        matchedReleaseIds: [...new Set(seller.matchedReleaseIds)],
        matchedTitles: [...new Set(seller.matchedTitles)],
        listings: [...seller.listings],
        hasAllSelected: selectedReleaseIds.length > 0 && selectedReleaseIds.every((releaseId) => seller.matchedReleaseIds.includes(releaseId)),
      });
      continue;
    }

    existing.listings = [...existing.listings, ...seller.listings];
    existing.totalPrice += seller.totalPrice;
    existing.totalShipping += seller.totalShipping;
    existing.matchedReleaseIds = Array.from(new Set([...existing.matchedReleaseIds, ...seller.matchedReleaseIds]));
    existing.matchedTitles = Array.from(new Set([...existing.matchedTitles, ...seller.matchedTitles]));
    existing.hasAllSelected = selectedReleaseIds.length > 0 && selectedReleaseIds.every((releaseId) => existing.matchedReleaseIds.includes(releaseId));

    if (existing.sellerRating === null && seller.sellerRating !== null) {
      existing.sellerRating = seller.sellerRating;
    }
    if (!existing.shipsFrom && seller.shipsFrom) {
      existing.shipsFrom = seller.shipsFrom;
    }
  }

  return [...merged.values()].sort((a, b) => {
    if (a.hasAllSelected !== b.hasAllSelected) return a.hasAllSelected ? -1 : 1;
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    return (b.sellerRating || 0) - (a.sellerRating || 0);
  });
}

export default function Home() {
  const initialUrlState = getInitialUrlState();
  const didInitialWantlistLoad = useRef(false);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [wantlist, setWantlist] = useState<DiscogsWantlistItem[]>([]);
  const [artistFilters, setArtistFilters] = useState<string[]>(initialUrlState.artistFilters);
  const [wantlistSearch, setWantlistSearch] = useState(initialUrlState.wantlistSearch);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialUrlState.selectedIds);
  const [minRating, setMinRating] = useState(initialUrlState.minRating);
  const [maxListingPrice, setMaxListingPrice] = useState(initialUrlState.maxListingPrice);
  const [maxShippingPrice, setMaxShippingPrice] = useState(initialUrlState.maxShippingPrice);
  const [shipsFrom, setShipsFrom] = useState(initialUrlState.shipsFrom);
  const [onlyAllSelected, setOnlyAllSelected] = useState(initialUrlState.onlyAllSelected);
  const [priceMode, setPriceMode] = useState<PriceMode>(initialUrlState.priceMode);
  const [allowedConditions, setAllowedConditions] = useState<string[]>(initialUrlState.allowedConditions);
  const [matches, setMatches] = useState<SellerMatch[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [pinnedSellers, setPinnedSellers] = useState<string[]>([]);
  const [hiddenSellers, setHiddenSellers] = useState<string[]>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [filtersMinimized, setFiltersMinimized] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerSort, setSellerSort] = useState<"matches" | "price" | "rating">("matches");
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStageLabel, setSearchStageLabel] = useState("");
  const [loadingWantlist, setLoadingWantlist] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [searchOutcomeSummary, setSearchOutcomeSummary] = useState<string | null>(null);
  const [searchCheckpoint, setSearchCheckpoint] = useState<SearchCheckpoint | null>(null);
  const [hasSearchedMatches, setHasSearchedMatches] = useState(false);

  useEffect(() => {
    if (didInitialWantlistLoad.current) {
      return;
    }

    didInitialWantlistLoad.current = true;
    void loadWantlist();
  }, []);

  async function loadWantlist() {
    setLoadingWantlist(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/wantlist", { cache: "no-store" });
      const payload = (await response.json()) as WantlistResponse;

      if (!response.ok || !payload.connected || !payload.wantlist) {
        setConnected(false);
        setUsername(null);
        setWantlist([]);
        setAuthError(payload.error ?? "Connect Discogs to load your wantlist.");
        return;
      }

      setConnected(true);
      setUsername(payload.username ?? null);
      const wantlistItems = payload.wantlist;
      setWantlist(wantlistItems);
      setSelectedIds((current) => (current.length > 0 ? current : wantlistItems.slice(0, 10).map((item) => item.releaseId)));
    } catch (error) {
      setConnected(false);
      setAuthError(error instanceof Error ? error.message : "Failed to load wantlist");
    } finally {
      setLoadingWantlist(false);
    }
  }

  async function runMatchSearch() {
    await runMatchSearchWithOptions();
  }

  async function resumeFromCheckpoint(checkpoint: SearchCheckpoint, safeMode = false) {
    setSelectedIds(checkpoint.selectedIds);
    setMinRating(checkpoint.minRating);
    setMaxListingPrice(checkpoint.maxListingPrice);
    setMaxShippingPrice(checkpoint.maxShippingPrice);
    setShipsFrom(checkpoint.shipsFrom);
    setOnlyAllSelected(checkpoint.onlyAllSelected);
    setAllowedConditions(checkpoint.allowedConditions);
    await runMatchSearchWithOptions({ checkpoint, safeMode });
  }

  async function runMatchSearchWithOptions(options?: { safeMode?: boolean; checkpoint?: SearchCheckpoint }) {
    const checkpoint = options?.checkpoint;
    const activeSelectedIds = checkpoint?.selectedIds ?? selectedIds;
    const activeMinRating = checkpoint?.minRating ?? minRating;
    const activeMaxListingPrice = checkpoint?.maxListingPrice ?? maxListingPrice;
    const activeMaxShippingPrice = checkpoint?.maxShippingPrice ?? maxShippingPrice;
    const activeShipsFrom = checkpoint?.shipsFrom ?? shipsFrom;
    const activeOnlyAllSelected = checkpoint?.onlyAllSelected ?? onlyAllSelected;
    const activeAllowedConditions = checkpoint?.allowedConditions ?? allowedConditions;

    if (activeSelectedIds.length === 0) {
      setSearchError("Select at least one wantlist item first.");
      return;
    }

    const forceSafeMode = options?.safeMode ?? false;
    const batchSize = checkpoint?.batchSize ?? (forceSafeMode ? 2 : 5);
    const startBatchIndex = checkpoint?.nextBatchIndex ?? 0;

    const selectedSnapshot = [...activeSelectedIds];

    setHasSearchedMatches(true);
    setLoadingMatches(true);
    setFiltersMinimized(true);
    setSearchProgress(0);
    setSearchStageLabel("Preparing two-stage marketplace search...");
    setSearchError(null);
    setSearchNotice(null);
    setSearchOutcomeSummary(null);
    setMatches(checkpoint?.partialMatches ?? []);

    try {
      async function searchBatches(requireAllSelected: boolean, modeLabel: string, initialMatches: SellerMatch[], fromBatchIndex: number) {
        const batches: number[][] = [];

        for (let i = 0; i < selectedSnapshot.length; i += batchSize) {
          batches.push(selectedSnapshot.slice(i, i + batchSize));
        }

        let allMatches: SellerMatch[] = [...initialMatches];
        const totalSteps = Math.max(1, batches.length * 2);

        for (let batchIndex = fromBatchIndex; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const stageOneStep = batchIndex * 2 + 1;

          setSearchStageLabel(`Stage 1/2 (${modeLabel}): Discovering listing IDs (batch ${batchIndex + 1} of ${batches.length})`);
          setSearchProgress(Math.round((stageOneStep / totalSteps) * 100));

          const response = await fetch("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectedReleaseIds: batch,
              filters: {
                minSellerRating: activeMinRating,
                maxListingPrice: activeMaxListingPrice ? Number(activeMaxListingPrice) : null,
                maxShippingPrice: activeMaxShippingPrice ? Number(activeMaxShippingPrice) : null,
                allowedConditions: activeAllowedConditions,
                shipsFrom: activeShipsFrom,
                onlyAllSelected: requireAllSelected,
              },
            }),
          });

          const payload = (await response.json()) as MatchResponse;
          if (!response.ok) {
            throw new Error(payload.error ?? "Marketplace search failed");
          }

          const batchResults = payload.matches ?? [];
          allMatches = mergeSellerMatches(allMatches, batchResults, selectedSnapshot);
          setMatches(allMatches);
          setSelectedSeller((current) => current ?? allMatches[0]?.seller ?? null);

          const nextBatchIndex = batchIndex + 1;
          const checkpointPayload: SearchCheckpoint = {
            version: 1,
            timestamp: Date.now(),
            selectedIds: selectedSnapshot,
            minRating: activeMinRating,
            maxListingPrice: activeMaxListingPrice,
            maxShippingPrice: activeMaxShippingPrice,
            shipsFrom: activeShipsFrom,
            onlyAllSelected: requireAllSelected,
            allowedConditions: activeAllowedConditions,
            batchSize,
            nextBatchIndex,
            partialMatches: allMatches,
            modeLabel,
          };
          localStorage.setItem(SEARCH_CHECKPOINT_KEY, JSON.stringify(checkpointPayload));
          setSearchCheckpoint(checkpointPayload);

          const stageTwoStep = batchIndex * 2 + 2;
          setSearchStageLabel(`Stage 2/2 (${modeLabel}): Hydrating listings and grouping sellers (batch ${batchIndex + 1} of ${batches.length})`);
          setSearchProgress(Math.round((stageTwoStep / totalSteps) * 100));
        }

        return allMatches;
      }

      let sortedMatches = await searchBatches(
        activeOnlyAllSelected,
        checkpoint?.modeLabel ?? (activeOnlyAllSelected ? (forceSafeMode ? "strict safe" : "strict") : (forceSafeMode ? "partial safe" : "partial")),
        checkpoint?.partialMatches ?? [],
        startBatchIndex,
      );
      const strictCount = sortedMatches.length;

      if (sortedMatches.length === 0 && activeOnlyAllSelected) {
        setSearchNotice("No single seller covers every selected release. Showing partial seller matches instead.");
        sortedMatches = await searchBatches(false, forceSafeMode ? "fallback safe" : "fallback", [], 0);
        setSearchOutcomeSummary(`Strict: ${strictCount} sellers -> Partial: ${sortedMatches.length} sellers`);
      } else {
        setSearchOutcomeSummary(`${activeOnlyAllSelected ? "Strict" : "Partial"}: ${sortedMatches.length} sellers`);
      }

      setMatches(sortedMatches);
      setSelectedSeller(sortedMatches.length > 0 ? sortedMatches[0].seller : null);
      localStorage.removeItem(SEARCH_CHECKPOINT_KEY);
      setSearchCheckpoint(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to search marketplace";
      if (!checkpoint?.partialMatches?.length) {
        setSelectedSeller(null);
      }
      setSearchError(message);
    } finally {
      setLoadingMatches(false);
      setSearchProgress(0);
      setSearchStageLabel("");
    }
  }

  async function logOutDiscogs() {
    setLoggingOut(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/auth/discogs/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to log off Discogs");
      }

      setConnected(false);
      setUsername(null);
      setWantlist([]);
      setMatches([]);
      setHasSearchedMatches(false);
      setSearchOutcomeSummary(null);
      setSelectedIds([]);
      await loadWantlist();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to log off Discogs");
    } finally {
      setLoggingOut(false);
    }
  }

  function toggleSelected(releaseId: number) {
    setSelectedIds((current) =>
      current.includes(releaseId)
        ? current.filter((value) => value !== releaseId)
        : [...current, releaseId],
    );
  }

  function toggleCondition(value: string) {
    setAllowedConditions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleArtistFilter(value: string) {
    setArtistFilters((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  const selectedCount = selectedIds.length;
  const matchingCount = matches.length;
  const artistOptions = [...new Set(wantlist.map((item) => item.artist.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const normalizedSearch = wantlistSearch.trim().toLowerCase();
  const filteredWantlist = wantlist.filter((item) => {
    const matchesArtist = artistFilters.length === 0 || artistFilters.some((artist) => artist.toLowerCase() === item.artist.toLowerCase());
    const searchHaystack = [item.artist, item.title, item.label ?? "", String(item.year ?? ""), String(item.releaseId)]
      .join(" ")
      .toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || searchHaystack.includes(normalizedSearch);

    return matchesArtist && matchesSearch;
  });
  const filteredSelectedCount = filteredWantlist.filter((item) => selectedIds.includes(item.releaseId)).length;
  const selectedReleases = wantlist.filter((item) => selectedIds.includes(item.releaseId));
  const wantlistByRelease = new Map(wantlist.map((item) => [item.releaseId, item]));
  const normalizedSellerSearch = sellerSearch.trim().toLowerCase();
  const filteredSellers = matches
    .filter((s) => {
      if (hiddenSellers.includes(s.seller)) {
        return false;
      }
      if (showPinnedOnly && !pinnedSellers.includes(s.seller)) {
        return false;
      }
      if (!normalizedSellerSearch) return true;
      return (
        s.seller.toLowerCase().includes(normalizedSellerSearch) ||
        (s.shipsFrom ?? "").toLowerCase().includes(normalizedSellerSearch)
      );
    })
    .sort((a, b) => {
      const aPinned = pinnedSellers.includes(a.seller);
      const bPinned = pinnedSellers.includes(b.seller);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      if (sellerSort === "price") {
        const aPrice = priceMode === "total" ? (a.totalPrice + a.totalShipping) : a.totalPrice;
        const bPrice = priceMode === "total" ? (b.totalPrice + b.totalShipping) : b.totalPrice;
        return aPrice - bPrice;
      }
      if (sellerSort === "rating") return (b.sellerRating ?? 0) - (a.sellerRating ?? 0);
      // "matches" — default: coverage first, then match count
      if (a.hasAllSelected !== b.hasAllSelected) return a.hasAllSelected ? -1 : 1;
      return b.matchedReleaseIds.length - a.matchedReleaseIds.length;
    });
  const visibleSellers = selectedSeller
    ? filteredSellers.filter((seller) => seller.seller === selectedSeller)
    : filteredSellers;

  useEffect(() => {
    if (selectedSeller && !filteredSellers.some((seller) => seller.seller === selectedSeller)) {
      setSelectedSeller(filteredSellers[0].seller);
    }
  }, [filteredSellers, selectedSeller]);

  useEffect(() => {
    const raw = localStorage.getItem(SEARCH_CHECKPOINT_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SearchCheckpoint;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.selectedIds) && Array.isArray(parsed.partialMatches)) {
        setSearchCheckpoint(parsed);
      }
    } catch {
      localStorage.removeItem(SEARCH_CHECKPOINT_KEY);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (artistFilters.length > 0) {
      params.set("artists", artistFilters.map((value) => encodeURIComponent(value)).join(","));
    }
    if (wantlistSearch.trim()) {
      params.set("q", wantlistSearch.trim());
    }
    if (selectedIds.length > 0) {
      params.set("selected", selectedIds.join(","));
    }
    if (minRating !== 0) {
      params.set("minRating", String(minRating));
    }
    if (maxListingPrice) {
      params.set("maxPrice", maxListingPrice);
    }
    if (maxShippingPrice) {
      params.set("maxShipping", maxShippingPrice);
    }
    if (shipsFrom.trim()) {
      params.set("shipsFrom", shipsFrom.trim());
    }
    if (onlyAllSelected) {
      params.set("allSelected", "true");
    }
    if (priceMode !== "total") {
      params.set("priceMode", priceMode);
    }
    if (allowedConditions.length !== conditionOptions.length) {
      params.set("conditions", allowedConditions.map((value) => encodeURIComponent(value)).join(","));
    }

    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [allowedConditions, artistFilters, maxListingPrice, maxShippingPrice, minRating, onlyAllSelected, priceMode, selectedIds, shipsFrom, wantlistSearch]);

  return (
    <main className="shell" style={darkThemeVariables} data-theme="dark">
      <section className="hero">
        <div className="brand">
          <h1>Crate Diggazz</h1>
           <h2>A Discogs Marketplace Search Tool</h2>
          <div className="actions">
            {connected ? (
              <button className="button-secondary" type="button" disabled>
                Discogs connected
              </button>
            ) : (
              <a className="button" href="/api/auth/discogs/start">
                Connect Discogs account
              </a>
            )}
            <button className="button-secondary" type="button" onClick={() => void loadWantlist()}>
              Reload wantlist
            </button>
            {connected ? (
              <button className="button-secondary" type="button" onClick={() => void logOutDiscogs()} disabled={loggingOut}>
                {loggingOut ? "Logging off..." : "Log off Discogs"}
              </button>
            ) : null}
          </div>
          <aside className="status-card">
            <span className="status-badge">Marketplace summary</span>
            <div className="status-grid">
              <div className="status-line">
                <span>Discogs connection</span>
                <strong>{connected ? "Connected" : "Not connected"}</strong>
              </div>
              <div className="status-line">
                <span>Discogs account</span>
                <strong>{username ?? "Waiting for sign-in"}</strong>
              </div>
              <div className="status-line">
                <span>Wantlist items</span>
                <strong>{wantlist.length}</strong>
              </div>
              <div className="status-line">
                <span>Filtered items</span>
                <strong>{filteredWantlist.length}</strong>
              </div>
              <div className="status-line">
                <span>Selected items</span>
                <strong>{selectedCount}</strong>
              </div>
              <div className="status-line">
                <span>Marketplace matches</span>
                <strong>{matchingCount}</strong>
              </div>
            </div>
            {authError ? <div className="error">{authError}</div> : null}
          </aside>
        </div>
      </section>

      {loadingMatches && searchProgress > 0 && (
        <div className="search-progress">
          <div className="progress-container">
            <div className="progress-info">
              <span className="progress-label">
                {searchStageLabel || `Searching ${selectedIds.length} release${selectedIds.length === 1 ? "" : "s"}...`}
              </span>
              <span className="progress-percent">{searchProgress}%</span>
            </div>
            {matches.length > 0 && (
              <p className="meta">Progressive results: {matches.length} seller{matches.length === 1 ? "" : "s"} found so far</p>
            )}
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${searchProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      <section className={`filter-columns ${filtersMinimized ? "minimized" : ""}`}>
        <button
          className="filters-toggle"
          type="button"
          onClick={() => setFiltersMinimized(!filtersMinimized)}
          title={filtersMinimized ? "Show filters" : "Hide filters"}
        >
          <span className="toggle-icon">{filtersMinimized ? "▶" : "▼"}</span>
          <span className="toggle-label">{filtersMinimized ? "Show" : "Hide"} filters</span>
        </button>

        {!filtersMinimized && (
          <>
        <article className="panel filter-column column-coverage">
          <span className="section-badge">Match coverage & wantlist</span>
          <h2>Coverage and selected items</h2>
          <div className="divider-motif" aria-hidden="true" />

          <div className="controls">
            <div className="field">
              <label htmlFor="only-all">Match coverage</label>
              <select id="only-all" value={onlyAllSelected ? "true" : "false"} onChange={(event) => setOnlyAllSelected(event.target.value === "true")}>
                <option value="true">Require matches for every selected item</option>
                <option value="false">Allow partial matches</option>
              </select>
            </div>

              <div className="field">
                <label htmlFor="price-mode">Cost comparison mode</label>
                <select id="price-mode" value={priceMode} onChange={(event) => setPriceMode(event.target.value as PriceMode)}>
                  <option value="total">Item + shipping total</option>
                  <option value="listing">Item price only</option>
                </select>
              </div>

            <div className="actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setSelectedIds((current) => [...new Set([...current, ...filteredWantlist.map((item) => item.releaseId)])])}
              >
                Select filtered items
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setSelectedIds((current) => current.filter((releaseId) => !filteredWantlist.some((item) => item.releaseId === releaseId)))}
              >
                Clear filtered items
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </button>
            </div>
          </div>

          <p className="meta" style={{ marginTop: "1rem" }}>
            Showing {filteredWantlist.length} of {wantlist.length} wantlist items. {filteredSelectedCount} visible item{filteredSelectedCount === 1 ? " is" : "s are"} selected.
          </p>

          <div className="wantlist" style={{ marginTop: "1rem" }}>
            {wantlist.length === 0 ? (
              <div className="empty">
                {connected ? "No wantlist items were returned." : "Connect your Discogs account to load your wantlist."}
              </div>
            ) : filteredWantlist.length === 0 ? (
              <div className="empty">No wantlist items match the current filters.</div>
            ) : (
              filteredWantlist.map((item) => (
                <label key={item.wantId} className="want-item">

                  <input type="checkbox" checked={selectedIds.includes(item.releaseId)} onChange={() => toggleSelected(item.releaseId)} />
                  <div>
                    <strong>{item.artist ? `${item.artist} - ${item.title}` : item.title}</strong>
                    <small>
                      {item.label ? `${item.label} · ${item.year ?? "Unknown year"}` : item.year ?? "Unknown year"}
                      {item.genres.length > 0 ? ` · ${item.genres[0]}` : ""}
                    </small>
                  </div>
                  <div className="want-meta">
                    <small className="genre-stamp">{getGenrePresentation(item).glyph}</small>
                    <small>Release {item.releaseId}</small>
                  </div>
                </label>
              ))
            )}
          </div>
        </article>

        <article className="panel filter-column column-artist">
          <span className="section-badge">Artists</span>
          <h2>Filter by artist</h2>
          <div className="divider-motif" aria-hidden="true" />

          <div className="field">
            <label>Artist list</label>
            <div className="pill-row">
              <button
                type="button"
                className="pill"
                aria-pressed={artistFilters.length === 0}
                onClick={() => setArtistFilters([])}
              >
                All artists
              </button>
              {artistOptions.map((artist) => (
                <button
                  key={artist}
                  type="button"
                  className="pill"
                  aria-pressed={artistFilters.includes(artist)}
                  onClick={() => toggleArtistFilter(artist)}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="panel filter-column column-search">
          <span className="section-badge">Granular filters</span>
          <h2>Search and price constraints</h2>
          <div className="divider-motif" aria-hidden="true" />

          <div className="controls">
            <div className="field-grid">
              <div className="field">
                <label htmlFor="wantlist-search">Search wantlist</label>
                <input
                  id="wantlist-search"
                  type="text"
                  placeholder="Search title, artist, label, year, release..."
                  value={wantlistSearch}
                  onChange={(event) => setWantlistSearch(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="min-rating">Minimum seller rating</label>
                <input id="min-rating" type="number" min={0} max={100} value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="ships-from">Seller location contains</label>
                <input id="ships-from" type="text" placeholder="US, EU, Berlin..." value={shipsFrom} onChange={(event) => setShipsFrom(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="max-price">Maximum listing price</label>
                <input id="max-price" type="number" min={0} step="0.01" value={maxListingPrice} onChange={(event) => setMaxListingPrice(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="max-shipping">Maximum shipping price</label>
                <input id="max-shipping" type="number" min={0} step="0.01" value={maxShippingPrice} onChange={(event) => setMaxShippingPrice(event.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Allowed conditions</label>
              <div className="pill-row">
                {conditionOptions.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    className="pill"
                    aria-pressed={allowedConditions.includes(condition)}
                    onClick={() => toggleCondition(condition)}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions">
              <button className="button" type="button" onClick={() => void runMatchSearch()} disabled={loadingMatches}>
                {loadingMatches ? "Searching..." : "Find marketplace matches"}
              </button>
              {searchCheckpoint && !loadingMatches ? (
                <button className="button-secondary" type="button" onClick={() => void resumeFromCheckpoint(searchCheckpoint)}>
                  Resume last search
                </button>
              ) : null}
            </div>

            {searchError ? <div className="error">{searchError}</div> : null}
            {isRateLimitError(searchError) ? (
              <div className="warning-block">
                <strong>Discogs rate limited this request.</strong>
                <p className="meta">Use Safe retry for slower batched calls and stronger retry backoff, or resume the last checkpoint.</p>
                <div className="actions">
                  <button className="button-secondary" type="button" onClick={() => void runMatchSearchWithOptions({ safeMode: true })} disabled={loadingMatches}>
                    Retry in safe mode
                  </button>
                  {searchCheckpoint && !loadingMatches ? (
                    <button className="button-secondary" type="button" onClick={() => void resumeFromCheckpoint(searchCheckpoint, true)}>
                      Resume checkpoint in safe mode
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {searchNotice ? <p className="meta">{searchNotice}</p> : null}
            {searchOutcomeSummary ? <p className="meta"><strong>{searchOutcomeSummary}</strong></p> : null}
          </div>
        </article>
          </>
        )}
      </section>

      <section className="panel results-panel">
        <span className="section-badge">Marketplace results</span>
        <h2>Review matching marketplace listings</h2>
        <p>This section groups Discogs marketplace listings by seller for your selected wantlist items, including seller details, pricing, and direct listing links.</p>
        <div className="divider-motif" aria-hidden="true" />

        {matches.length === 0 ? (
          <div className="empty">
            {hasSearchedMatches
              ? "No marketplace item listings were returned for the current selection and filters. This view only shows listing-level items (grouped by seller), and Discogs may not expose per-item listings for some releases via API."
              : "Run a marketplace search after selecting items. Grouped seller matches will appear here with artwork, condition, price, and direct links."}
          </div>
        ) : (
          <div className="results-grid">
            <div className="sellers-column">
              <h3>Sellers ({matches.length})</h3>
              <div className="actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => setShowPinnedOnly((current) => !current)}
                >
                  {showPinnedOnly ? "Show all sellers" : "Compare pinned only"}
                </button>
                {hiddenSellers.length > 0 && (
                  <button className="button-secondary" type="button" onClick={() => setHiddenSellers([])}>
                    Show hidden sellers
                  </button>
                )}
              </div>
              <div className="seller-filters">
                <input
                  type="text"
                  className="seller-search"
                  placeholder="Filter by name or location..."
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                />
                <select
                  className="seller-sort"
                  value={sellerSort}
                  onChange={(e) => setSellerSort(e.target.value as "matches" | "price" | "rating")}
                >
                  <option value="matches">Sort: matches</option>
                  <option value="price">Sort: lowest {priceMode === "total" ? "total" : "item"} price</option>
                  <option value="rating">Sort: highest rating</option>
                </select>
              </div>
              {normalizedSellerSearch && (
                <p className="meta" style={{ marginBottom: "0.5rem" }}>
                  {filteredSellers.length} of {matches.length} seller{matches.length === 1 ? "" : "s"}
                </p>
              )}
              <div className="sellers-list">
                {filteredSellers.map((seller) => (
                  <div key={seller.seller}>
                    <button
                      type="button"
                      className={`seller-button ${selectedSeller === seller.seller ? "active" : ""}`}
                      onClick={() => setSelectedSeller((current) => (current === seller.seller ? null : seller.seller))}
                    >
                      <div className="seller-name">{seller.seller}</div>
                      <div className="seller-info">
                        {seller.seller === "Discogs marketplace summary" ? (
                          <span className="seller-detail">Marketplace stats</span>
                        ) : (
                          <>
                            <span className="seller-detail">Rating {seller.sellerRating ?? "n/a"}</span>
                            <span className="seller-detail">{seller.shipsFrom ?? "Unknown"}</span>
                            <span className="seller-detail">Items found {seller.listings.length}</span>
                          </>
                        )}
                      </div>
                      <div className="seller-matches">
                        <span className="match-count">{seller.matchedReleaseIds.length}</span>
                        <span className="match-label">release{seller.matchedReleaseIds.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="seller-price">
                        {currencyLabel(priceMode === "total" ? seller.totalPrice + seller.totalShipping : seller.totalPrice)}
                      </div>
                      {seller.hasAllSelected && <div className="seller-badge">All selected</div>}
                      {pinnedSellers.includes(seller.seller) && <div className="seller-badge">Pinned</div>}
                    </button>
                    <div className="seller-actions">
                      <button
                        className="button-secondary seller-action-button"
                        type="button"
                        onClick={() =>
                          setPinnedSellers((current) =>
                            current.includes(seller.seller)
                              ? current.filter((value) => value !== seller.seller)
                              : [...current, seller.seller],
                          )
                        }
                      >
                        {pinnedSellers.includes(seller.seller) ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="button-secondary seller-action-button"
                        type="button"
                        onClick={() => {
                          setHiddenSellers((current) => (current.includes(seller.seller) ? current : [...current, seller.seller]));
                          setSelectedSeller((current) => (current === seller.seller ? null : current));
                        }}
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="items-column">
              <div className="grouped-results">
                {visibleSellers.map((seller) => (
                  <div key={seller.seller} className="seller-group">
                    <div className="seller-group-header">
                      <div>
                        <h3>{seller.seller}</h3>
                        {seller.seller !== "Discogs marketplace summary" && (
                          <div className="seller-meta">
                            <span>Rating {seller.sellerRating ?? "n/a"}</span>
                            <span>Ships from {seller.shipsFrom ?? "unknown"}</span>
                            <span>Matched releases {seller.matchedReleaseIds.length} | Items found {seller.listings.length}</span>
                            {seller.hasAllSelected && <span className="seller-badge-inline">All selected covered</span>}
                          </div>
                        )}
                      </div>
                      <div className="seller-group-summary">
                        <strong>{currencyLabel(priceMode === "total" ? seller.totalPrice + seller.totalShipping : seller.totalPrice)}</strong>
                        <div className="meta">Mode: {priceMode === "total" ? "Item + shipping" : "Item only"}</div>
                        <div className="meta">{seller.listings.length} item{seller.listings.length === 1 ? "" : "s"}</div>
                      </div>
                    </div>

                    <div className="listing-list">
                      {seller.listings.map((listing) => (
                        <div key={listing.listingId} className="listing">

                          <div className="listing-card-grid">
                            <div className="sleeve-frame">
                              {wantlistByRelease.get(listing.releaseId)?.coverImage ? (
                                <img
                                  className="sleeve-image"
                                  src={wantlistByRelease.get(listing.releaseId)?.coverImage ?? ""}
                                  alt={listing.title}
                                />
                              ) : (
                                <div className="sleeve-fallback">
                                  <span>{getMonogram(wantlistByRelease.get(listing.releaseId)?.artist || listing.title)}</span>
                                </div>
                              )}
                            </div>
                            <div className="listing-body">
                              <div className="listing-top">
                                <strong>{listing.title}</strong>
                                <span>
                                  {priceMode === "total"
                                    ? currencyLabel((listing.price ?? 0) + (listing.shipping ?? 0), listing.currency)
                                    : currencyLabel(listing.price, listing.currency)}
                                </span>
                              </div>
                              <div className="genre-chip-row">
                                <span className="genre-stamp">{getGenrePresentation(wantlistByRelease.get(listing.releaseId)).glyph}</span>
                                <span className="meta">{getGenrePresentation(wantlistByRelease.get(listing.releaseId)).label}</span>
                              </div>
                              <div className="meta">
                                {wantlistByRelease.get(listing.releaseId)?.genres?.[0] ? `${wantlistByRelease.get(listing.releaseId)?.genres[0]} · ` : ""}
                                {listing.isMarketplaceAggregate
                                  ? `${listing.numForSale ?? 0} for sale · Lowest listed price ${currencyLabel(listing.price, listing.currency)} · Release ${listing.releaseId}`
                                  : `Condition ${listing.condition ?? "n/a"} · Shipping ${currencyLabel(listing.shipping, listing.currency)} · Item ${currencyLabel(listing.price, listing.currency)} · Release ${listing.releaseId}`}
                              </div>
                              <div className="meta">
                                {listing.isMarketplaceAggregate ? (
                                  listing.uri ? (
                                    <>
                                      <span>Item listing URL unavailable for this release.</span>{" "}
                                      <a href={listing.uri} target="_blank" rel="noreferrer">
                                        Open release marketplace
                                      </a>
                                    </>
                                  ) : (
                                    "Item listing URL unavailable for this release"
                                  )
                                ) : listing.uri ? (
                                  <a href={listing.uri} target="_blank" rel="noreferrer">
                                    Open Discogs listing
                                  </a>
                                ) : (
                                  "Listing link unavailable"
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {filteredSellers.length === 0 && (
                <div className="empty" style={{ marginTop: "2rem" }}>
                  {normalizedSellerSearch ? "No sellers match your search." : "Run a marketplace search to see results."}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}