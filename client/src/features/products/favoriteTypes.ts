import type { ProductSummary } from "./types";

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteWithProduct extends Favorite {
  product: ProductSummary;
}
