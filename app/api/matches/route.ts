import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSellerMatches } from "@/lib/filter";
import { fetchIdentity, getDiscogsAuthFromEnvOrThrow, searchMarketplaceByRelease } from "@/lib/discogs";
import type { MarketplaceListing } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  selectedReleaseIds: z.array(z.number().int().positive()).default([]),
  filters: z.object({
    minSellerRating: z.number().min(0).max(100).default(0),
    maxListingPrice: z.number().positive().nullable().default(null),
    maxShippingPrice: z.number().positive().nullable().default(null),
    allowedConditions: z.array(z.string()).default([]),
    shipsFrom: z.string().default(""),
    onlyAllSelected: z.boolean().default(false),
  }),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("discogs_access_token")?.value;
    const accessSecret = cookieStore.get("discogs_access_secret")?.value;

    let auth = undefined;
    if (accessToken && accessSecret) {
      auth = { kind: "oauth", token: accessToken, tokenSecret: accessSecret } as const;
    } else {
      auth = getDiscogsAuthFromEnvOrThrow();
    }

    const identity = auth.kind === "token"
      ? { username: process.env.DISCOGS_USERNAME ?? "" }
      : await fetchIdentity(auth);

    if (!identity.username) {
      return NextResponse.json({ error: "Set DISCOGS_USERNAME when using a personal access token." }, { status: 400 });
    }

    const listingsByRelease = new Map<number, MarketplaceListing[]>();

    // Process releases in sequence with delays to respect rate limits
    for (const releaseId of payload.selectedReleaseIds) {
      try {
        const listings = await searchMarketplaceByRelease(releaseId, auth);
        listingsByRelease.set(releaseId, listings);
      } catch (error) {
        // Log error but continue with other releases
        console.error(`Failed to search marketplace for release ${releaseId}:`, error);
        listingsByRelease.set(releaseId, []);
      }
    }

    const matches = buildSellerMatches(payload.selectedReleaseIds, listingsByRelease, payload.filters);
    return NextResponse.json({ username: identity.username, matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to search marketplace" },
      { status: 400 },
    );
  }
}