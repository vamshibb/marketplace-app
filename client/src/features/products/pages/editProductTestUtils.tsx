import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, vi } from "vitest";
import { authQueryKeys, useAuthStore } from "../../auth";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import type { ProductDetail } from "../types";
import { EditProductPage } from "./EditProductPage";

export const owner = { id: "owner", email: "owner@example.test", displayName: "Owner" };
export const product: ProductDetail = {
  id: "camera", title: "Camera", description: "A camera in good condition", price: 20,
  sellerId: owner.id, seller: owner, categoryId: "electronics",
  category: { id: "electronics", name: "Electronics", slug: "electronics" },
  listingType: "RENT", quantityAvailable: 3, minRentalDays: 1, maxRentalDays: 7,
  createdAt: "2026-10-01", updatedAt: "2026-10-01", media: [], reviews: [], reviewCount: 0, averageRating: 0,
};

export const httpError = (status: number, message?: string): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", undefined, config, undefined,
    { status, statusText: "Error", data: { message }, headers: {}, config });
};

afterEach(() => useAuthStore.getState().clearToken());

export const setup = (userId = owner.id, listing = product) => {
  useAuthStore.getState().setToken("session");
  const client = createTestQueryClient();
  client.setQueryData(authQueryKeys.currentUser(), { ...owner, id: userId });
  const get = vi.spyOn(api, "get").mockImplementation(async url => {
    if (url === "/products/camera/media") return { data: { data: listing.media } };
    if (url === "/products/camera") return { data: { data: listing } };
    if (url === "/categories") return { data: { data: [product.category, { id: "tools", name: "Tools", slug: "tools" }] } };
    throw new Error(`Unexpected GET ${url}`);
  });
  const put = vi.spyOn(api, "put").mockResolvedValue({ data: { data: listing } });
  const mount = () => render(<MemoryRouter initialEntries={["/products/camera/edit"]}>
    <Routes>
      <Route path="/products/:id/edit" element={<EditProductPage />} />
      <Route path="/products/:id" element={<p>Saved listing</p>} />
    </Routes>
  </MemoryRouter>, { wrapper: queryWrapper(client) });
  return { client, get, put, mount, user: userEvent.setup() };
};

