import api from "../../../api/api";

import type {
  PaginatedResponse,
} from "../../../types/api";

import type { Listing } from "../types/listing";

/**
 * GET /products
 */
export async function getListings(): Promise<Listing[]> {
  const response =
    await api.get<
      PaginatedResponse<Listing[]>
    >("/products");

  return response.data.data;
}

/**
 * GET /products/:id
 */
export async function getListing(
  id: string
): Promise<Listing> {
  const response =
    await api.get(`/products/${id}`);

  return response.data.data;
}

/**
 * POST /products
 */
export async function createListing(
  data: Omit<Listing, "id" | "seller">
) {
  const response =
    await api.post("/products", data);

  return response.data.data;
}

/**
 * PUT /products/:id
 */
export async function updateListing(
  id: string,
  data: Partial<Listing>
) {
  const response =
    await api.put(`/products/${id}`, data);

  return response.data.data;
}

/**
 * DELETE /products/:id
 */
export async function deleteListing(
  id: string
) {
  const response =
    await api.delete(`/products/${id}`);

  return response.data.data;
}