export type DiscogsWantlistItem = {
  wantId: number;
  releaseId: number;
  title: string;
  artist: string;
  label: string | null;
  genres: string[];
  year: number | null;
  condition: string | null;
  notes: string | null;
  coverImage: string | null;
  uri: string | null;
};

export type MarketplaceListing = {
  listingId: number;
  releaseId: number;
  title: string;
  seller: string;
  sellerRating: number | null;
  condition: string | null;
  shipsFrom: string | null;
  price: number | null;
  currency: string | null;
  shipping: number | null;
  numForSale: number | null;
  isMarketplaceAggregate: boolean;
  thumbnail: string | null;
  uri: string | null;
};

export type SellerMatch = {
  seller: string;
  sellerRating: number | null;
  shipsFrom: string | null;
  totalPrice: number;
  totalShipping: number;
  matchedReleaseIds: number[];
  matchedTitles: string[];
  listings: MarketplaceListing[];
  hasAllSelected: boolean;
};

export type MatchFilters = {
  minSellerRating: number;
  maxListingPrice: number | null;
  maxShippingPrice: number | null;
  allowedConditions: string[];
  shipsFrom: string;
  onlyAllSelected: boolean;
};