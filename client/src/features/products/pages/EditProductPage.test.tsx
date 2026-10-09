import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { authQueryKeys, useAuthStore } from "../../auth";
import { rentalAvailabilityQueryKeys } from "../../orders/availability";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import { productsQueryKeys } from "../queryKeys";
import type { ProductDetail } from "../types";
import { EditProductPage } from "./EditProductPage";

const owner = { id: "owner", email: "owner@example.test", displayName: "Owner" };
const product: ProductDetail = {
  id: "camera", title: "Camera", description: "A camera in good condition", price: 20,
  sellerId: owner.id, seller: owner, categoryId: "electronics",
  category: { id: "electronics", name: "Electronics", slug: "electronics" },
  listingType: "RENT", quantityAvailable: 3, minRentalDays: 1, maxRentalDays: 7,
  createdAt: "2026-10-01", updatedAt: "2026-10-01", media: [], reviews: [], reviewCount: 0, averageRating: 0,
};

const httpError = (status: number, message?: string): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", undefined, config, undefined,
    { status, statusText: "Error", data: { message }, headers: {}, config });
};

afterEach(() => useAuthStore.getState().clearToken());

const setup = (userId = owner.id) => {
  useAuthStore.getState().setToken("session");
  const client = createTestQueryClient();
  client.setQueryData(authQueryKeys.currentUser(), { ...owner, id: userId });
  const get = vi.spyOn(api, "get").mockImplementation(async url => {
    if (url === "/products/camera") return { data: { data: product } };
    if (url === "/categories") return { data: { data: [product.category, { id: "tools", name: "Tools", slug: "tools" }] } };
    throw new Error(`Unexpected GET ${url}`);
  });
  const put = vi.spyOn(api, "put").mockResolvedValue({ data: { data: product } });
  const mount = () => render(<MemoryRouter initialEntries={["/products/camera/edit"]}>
    <Routes>
      <Route path="/products/:id/edit" element={<EditProductPage />} />
      <Route path="/products/:id" element={<p>Saved listing</p>} />
    </Routes>
  </MemoryRouter>, { wrapper: queryWrapper(client) });
  return { client, get, put, mount, user: userEvent.setup() };
};

it("waits for listing data before displaying the initialized owner form", async () => {
  const { get, mount } = setup();
  let resolveProduct!: (value: { data: { data: ProductDetail } }) => void;
  get.mockImplementationOnce(() => new Promise(resolve => { resolveProduct = resolve; }));
  mount();
  expect(screen.getByRole("status").textContent).toContain("Loading listing details");
  expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  await act(async () => { resolveProduct({ data: { data: product } }); });
  expect((await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" })).value).toBe("Camera");
  expect(screen.getByRole<HTMLInputElement>("spinbutton", { name: "Minimum rental days (optional)" }).value).toBe("1");
  expect(screen.getByRole<HTMLInputElement>("spinbutton", { name: "Maximum rental days (optional)" }).value).toBe("7");
});

it("does not show an editable form for another user's direct edit URL", async () => {
  const { mount, put } = setup("other-user");
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain("only edit listings you own");
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  expect(put).not.toHaveBeenCalled();
});

it("shows access denied when loading returns 403", async () => {
  const { get, mount } = setup();
  get.mockRejectedValueOnce(httpError(403));
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain("do not have permission");
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
});

it("offers a retry after a listing load failure", async () => {
  const { get, mount, user } = setup();
  get.mockRejectedValueOnce(httpError(500));
  mount();
  await user.click(await screen.findByRole("button", { name: "Retry" }));
  expect((await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" })).value).toBe("Camera");
});

it.each([
  "Cannot change this rental listing to SALE while pending rental requests, committed rentals, or availability blocks exist.",
  "Cannot reduce rental quantity below capacity consumed by committed rentals and availability blocks.",
  "Rental state changed concurrently. Please refresh and try again.",
])("preserves edits and allows another save after 409: %s", async message => {
  const { mount, put, user } = setup();
  put.mockRejectedValueOnce(httpError(409, message));
  mount();
  const title = await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" });
  await user.clear(title);
  await user.type(title, "Edited camera");
  await user.clear(screen.getByLabelText("Quantity available"));
  await user.type(screen.getByLabelText("Quantity available"), "2");
  if (message.includes("SALE")) await user.click(screen.getByRole("button", { name: "For Sale" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect((await screen.findByRole("alert")).textContent).toContain(message);
  expect(title.value).toBe("Edited camera");
  expect(screen.getByRole<HTMLInputElement>("spinbutton", { name: "Quantity available" }).value).toBe("2");
  expect(screen.getByRole("button", { name: message.includes("SALE") ? "For Sale" : "For Rent" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(false);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Saved listing");
  expect(put).toHaveBeenCalledTimes(2);
  expect(put).toHaveBeenLastCalledWith("/products/camera", expect.objectContaining({ title: "Edited camera" }));
});

it("disables editing after a save returns 403", async () => {
  const { mount, put, user } = setup();
  put.mockRejectedValueOnce(httpError(403));
  mount();
  const title = await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" });
  await user.clear(title);
  await user.type(title, "Unsaved title");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect((await screen.findByRole("alert")).textContent).toContain("no longer have permission");
  expect(title.value).toBe("Unsaved title");
  expect(title.closest("fieldset")?.disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
});

it("saves all fields, shows pending state, and refreshes product/list/availability caches", async () => {
  const { client, mount, put, get, user } = setup();
  const refreshedKeys = [productsQueryKeys.list({}), productsQueryKeys.mine(owner.id),
    favoritesQueryKeys.list(owner.id), rentalAvailabilityQueryKeys.availabilityRoot(product.id)];
  for (const key of refreshedKeys) client.setQueryData(key, []);
  let finishSave!: (value: { data: { data: ProductDetail } }) => void;
  put.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
  mount();
  await screen.findByRole("textbox", { name: "Title" });
  await screen.findByRole("option", { name: "Tools" });
  for (const [label, value] of [
    ["Title", "Updated camera"], ["Description", "Updated listing description"], ["Price per day", "35"],
    ["Quantity available", "4"], ["Minimum rental days (optional)", "2"], ["Maximum rental days (optional)", "14"],
  ]) {
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), value);
  }
  await user.selectOptions(screen.getByLabelText("Category"), "tools");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect((await screen.findByRole<HTMLButtonElement>("button", { name: "Saving..." })).disabled).toBe(true);
  expect(screen.getByLabelText("Title").closest("fieldset")?.disabled).toBe(true);
  expect(put).toHaveBeenCalledExactlyOnceWith("/products/camera", {
    title: "Updated camera", description: "Updated listing description", price: 35, categoryId: "tools",
    listingType: "RENT", quantityAvailable: 4, minRentalDays: 2, maxRentalDays: 14,
  });
  await act(async () => { finishSave({ data: { data: product } }); });
  await screen.findByText("Saved listing");
  for (const key of refreshedKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(get.mock.calls.filter(([url]) => url === "/products/camera")).toHaveLength(2);
});

it("shows an API failure without losing form edits", async () => {
  const { mount, put, user } = setup();
  put.mockRejectedValueOnce(httpError(500));
  mount();
  const title = await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" });
  await user.clear(title);
  await user.type(title, "Keep this edit");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Unable to save your changes");
  expect(title.value).toBe("Keep this edit");
});
