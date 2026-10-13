import type { QueryClient } from "@tanstack/react-query";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import type { FavoriteWithProduct } from "../favoriteTypes";
import { productsQueryKeys } from "../queryKeys";
import type { ProductDetail, ProductMedia, ProductSummary, ProductsResponse } from "../types";

// Patch media only so listing-form initial values remain unchanged.
export const updateProductMediaCache = (client: QueryClient, id: string, media: ProductMedia[]): void => {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const updateSummary = (product: ProductSummary): ProductSummary => product.id === id ? { ...product, media: sorted } : product;
  client.setQueryData<ProductDetail>(productsQueryKeys.detail(id), current => current && { ...current, media: sorted });
  client.setQueriesData<ProductsResponse>({ queryKey: productsQueryKeys.lists() }, current =>
    current && { ...current, products: current.products.map(updateSummary) });
  client.setQueriesData<ProductSummary[]>({ queryKey: productsQueryKeys.mineRoot() }, current => current?.map(updateSummary));
  client.setQueriesData<FavoriteWithProduct[]>({ queryKey: favoritesQueryKeys.lists() }, current =>
    current?.map(favorite => favorite.productId === id ? { ...favorite, product: updateSummary(favorite.product) } : favorite));
};
