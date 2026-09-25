import type { UserSummary } from "../auth";

export type ProductSeller = UserSummary;
export type ListingType = "SALE" | "RENT";
export interface ListingSettings {
  listingType: ListingType;
  quantityAvailable: number;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProductMedia {
  id: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO";
  sortOrder: number;
}

export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  user: ProductSeller;
}

export interface ProductSummary extends ListingSettings {
  id: string;
  title: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  seller: ProductSeller;
  category: ProductCategory | null;
  media: ProductMedia[];
}

export interface ProductDetail extends ProductSummary {
  reviews: ProductReview[];
  reviewCount: number;
  averageRating: number;
}

export interface ProductFormRequest extends ListingSettings {
  title: string;
  description: string;
  price: number;
  categoryId: string;
}

export type ProductSort =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc";

export interface ProductFilters {
  limit?: number;
  search?: string;
  page?: number;
  sort?: ProductSort;
  categoryId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

export interface ProductsResponse {
  products: ProductSummary[];
  pagination: Pagination;
}
