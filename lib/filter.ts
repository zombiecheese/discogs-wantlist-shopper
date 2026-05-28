import type { MarketplaceListing, MatchFilters, SellerMatch } from "./types";

function toConditionGrade(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  const inParens = normalized.match(/\(([^)]+)\)/)?.[1]?.trim().toUpperCase();
  if (inParens) {
    return inParens;
  }

  if (normalized.includes("NEAR MINT") || normalized === "NM" || normalized === "M-") {
    return "NM";
  }
  if (normalized.includes("MINT") || normalized === "M") {
    return "M";
  }
  if (normalized.includes("VERY GOOD PLUS") || normalized === "VG+") {
    return "VG+";
  }
  if (normalized.includes("VERY GOOD") || normalized === "VG") {
    return "VG";
  }
  if (normalized.includes("GOOD PLUS") || normalized === "G+") {
    return "G+";
  }
  if (normalized.includes("GOOD") || normalized === "G") {
    return "G";
  }
  if (normalized.includes("FAIR") || normalized === "F") {
    return "F";
  }
  if (normalized.includes("POOR") || normalized === "P") {
    return "P";
  }

  return normalized;
}

function matchesCondition(condition: string | null, allowedConditions: string[]) {
  if (allowedConditions.length === 0) {
    return true;
  }

  if (!condition) {
    return false;
  }

  const conditionGrade = toConditionGrade(condition);
  if (!conditionGrade) {
    return false;
  }

  return allowedConditions.some((value) => toConditionGrade(value) === conditionGrade);
}

function matchesShipsFrom(shipsFrom: string | null, expected: string) {
  if (!expected) {
    return true;
  }

  return Boolean(shipsFrom?.toLowerCase().includes(expected.toLowerCase()));
}

function matchesPrice(price: number | null, maxPrice: number | null) {
  if (maxPrice === null) {
    return true;
  }

  if (price === null) {
    return false;
  }

  return price <= maxPrice;
}

function matchesSellerRating(rating: number | null, minimumRating: number) {
  if (rating === null) {
    return false;
  }

  return rating >= minimumRating;
}

export function buildSellerMatches(
  selectedReleaseIds: number[],
  listingsByRelease: Map<number, MarketplaceListing[]>,
  filters: MatchFilters,
): SellerMatch[] {
  const sellerBuckets = new Map<string, SellerMatch>();

  for (const [releaseId, listings] of listingsByRelease.entries()) {
    if (selectedReleaseIds.length > 0 && !selectedReleaseIds.includes(releaseId)) {
      continue;
    }

    for (const listing of listings) {
      if (listing.isMarketplaceAggregate) {
        continue;
      }

      if (!listing.isMarketplaceAggregate && !matchesSellerRating(listing.sellerRating, filters.minSellerRating)) {
        continue;
      }

      if (!listing.isMarketplaceAggregate && !matchesCondition(listing.condition, filters.allowedConditions)) {
        continue;
      }

      if (!listing.isMarketplaceAggregate && !matchesShipsFrom(listing.shipsFrom, filters.shipsFrom)) {
        continue;
      }

      if (!matchesPrice(listing.price, filters.maxListingPrice)) {
        continue;
      }

      if (!listing.isMarketplaceAggregate && !matchesPrice(listing.shipping, filters.maxShippingPrice)) {
        continue;
      }

      const existing = sellerBuckets.get(listing.seller);
      if (existing) {
        existing.listings.push(listing);
        existing.totalPrice += listing.price ?? 0;
        existing.totalShipping += listing.shipping ?? 0;
        if (!existing.matchedReleaseIds.includes(releaseId)) {
          existing.matchedReleaseIds.push(releaseId);
        }
        if (!existing.matchedTitles.includes(listing.title)) {
          existing.matchedTitles.push(listing.title);
        }
        if (existing.sellerRating === null && listing.sellerRating !== null) {
          existing.sellerRating = listing.sellerRating;
        }
        if (!existing.shipsFrom && listing.shipsFrom) {
          existing.shipsFrom = listing.shipsFrom;
        }
      } else {
        sellerBuckets.set(listing.seller, {
          seller: listing.seller,
          sellerRating: listing.sellerRating,
          shipsFrom: listing.shipsFrom,
          totalPrice: listing.price ?? 0,
          totalShipping: listing.shipping ?? 0,
          matchedReleaseIds: [releaseId],
          matchedTitles: [listing.title],
          listings: [listing],
          hasAllSelected: false,
        });
      }
    }
  }

  return [...sellerBuckets.values()]
    .map((seller) => ({
      ...seller,
      matchedReleaseIds: [...new Set(seller.matchedReleaseIds)],
      hasAllSelected: selectedReleaseIds.length > 0 && selectedReleaseIds.every((releaseId) => seller.matchedReleaseIds.includes(releaseId)),
    }))
    .filter((seller) => (filters.onlyAllSelected ? seller.hasAllSelected : true))
    .sort((left, right) => {
      if (left.hasAllSelected !== right.hasAllSelected) {
        return left.hasAllSelected ? -1 : 1;
      }

      const leftTotal = left.totalPrice + left.totalShipping;
      const rightTotal = right.totalPrice + right.totalShipping;

      if (leftTotal !== rightTotal) {
        return leftTotal - rightTotal;
      }

      return (right.sellerRating ?? -1) - (left.sellerRating ?? -1);
    });
}