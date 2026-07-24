export const ListingType = {
  SALE: "SALE",
  RENT: "RENT",
} as const;

export type ListingType =
  (typeof ListingType)[keyof typeof ListingType];

export const PricingUnit = {
  FIXED: "FIXED",
  HOUR: "HOUR",
  DAY: "DAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
} as const;

export type PricingUnit =
  (typeof PricingUnit)[keyof typeof PricingUnit];

export interface Seller {
  email: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;

  seller: Seller;

  listingType?: ListingType;
  pricingUnit?: PricingUnit;
}