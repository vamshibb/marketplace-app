import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { productsQueryKeys } from "../queryKeys";
import { CreateProductPage } from "./CreateProductPage";

const setup = async () => {
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:photo");
    static revokeObjectURL = vi.fn();
  });
  const get = vi.spyOn(api, "get").mockResolvedValue({ data: { data: [{ id: "electronics", name: "Electronics" }] } });
  const post = vi.spyOn(api, "post");
  const client = createTestQueryClient();
  render(<MemoryRouter initialEntries={["/products/create"]}><Routes>
    <Route path="/products/create" element={<CreateProductPage />} />
    <Route path="/products/:id" element={<p>Published listing</p>} />
  </Routes></MemoryRouter>, { wrapper: queryWrapper(client) });
  const user = userEvent.setup();
  await screen.findByRole("option", { name: "Electronics" });
  await user.type(screen.getByLabelText("Title"), "Camera");
  await user.type(screen.getByLabelText("Description"), "A camera in good condition");
  await user.type(screen.getByLabelText("Price"), "20");
  await user.selectOptions(screen.getByLabelText("Category"), "electronics");
  return { user, get, post, client };
};

it("publishes all RENT fields and selected media, disables conflicts, and refreshes lists", async () => {
  const { user, post, client } = await setup();
  const listKeys = [productsQueryKeys.list({}), productsQueryKeys.mine("owner")];
  for (const key of listKeys) client.setQueryData(key, []);
  await user.click(screen.getByRole("button", { name: "For Rent" }));
  await user.clear(screen.getByLabelText("Quantity available"));
  await user.type(screen.getByLabelText("Quantity available"), "3");
  await user.type(screen.getByLabelText("Minimum rental days (optional)"), "2");
  await user.type(screen.getByLabelText("Maximum rental days (optional)"), "7");
  const photo = new File(["photo"], "camera.png", { type: "image/png" });
  await user.upload(screen.getByLabelText("Choose photos and videos"), photo);
  let finish!: (value: { data: { data: [] } }) => void;
  post.mockResolvedValueOnce({ data: { data: { id: "camera" } } })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await user.click(screen.getByRole("button", { name: "Publish listing" }));
  await screen.findByRole("progressbar");
  expect(post.mock.calls[0]).toEqual(["/products", {
    title: "Camera", description: "A camera in good condition", price: 20, categoryId: "electronics",
    listingType: "RENT", quantityAvailable: 3, minRentalDays: 2, maxRentalDays: 7,
  }]);
  expect(post.mock.calls[1][0]).toBe("/products/camera/media");
  expect((post.mock.calls[1][1] as FormData).getAll("media")).toEqual([photo]);
  expect(screen.getByLabelText("Title").closest("fieldset")?.disabled).toBe(true);
  for (const name of ["Cancel", "Publishing...", "Add media in slot 2", "Remove camera.png"]) {
    expect(screen.getByRole<HTMLButtonElement>("button", { name }).disabled).toBe(true);
  }
  await user.click(screen.getByRole("button", { name: "Publishing..." }));
  expect(post).toHaveBeenCalledTimes(2);
  await act(async () => finish({ data: { data: [] } }));
  await screen.findByText("Published listing");
  for (const key of listKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
});

it("retains selected media on failed publish and retries upload without creating twice", async () => {
  const { user, get, post } = await setup();
  const photo = new File(["photo"], "retry.png", { type: "image/png" });
  await user.upload(screen.getByLabelText("Choose photos and videos"), photo);
  post.mockResolvedValueOnce({ data: { data: { id: "camera" } } })
    .mockRejectedValueOnce(new Error("Upload failed"))
    .mockResolvedValueOnce({ data: { data: [] } });
  get.mockResolvedValueOnce({ data: { data: { media: [] } } });
  await user.click(screen.getByRole("button", { name: "Publish listing" }));
  expect((await screen.findByRole("alert")).textContent).toContain("no media was saved");
  expect(screen.getByAltText("retry.png")).toBeTruthy();
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }).value).toBe("Camera");
  expect(screen.getByLabelText("Title").closest("fieldset")?.disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Publish listing" }).disabled).toBe(false);
  expect(post.mock.calls[0][1]).toMatchObject({ listingType: "SALE", minRentalDays: null, maxRentalDays: null });
  await user.click(screen.getByRole("button", { name: "Publish listing" }));
  await screen.findByText("Published listing");
  expect(post.mock.calls.filter(([url]) => url === "/products")).toHaveLength(1);
  expect(post.mock.calls.filter(([url]) => url === "/products/camera/media")).toHaveLength(2);
});

it("keeps fields editable after product creation fails and permits a corrected retry", async () => {
  const { user, post } = await setup();
  post.mockRejectedValueOnce(new Error("Create failed")).mockResolvedValueOnce({ data: { data: { id: "camera" } } });
  await user.click(screen.getByRole("button", { name: "Publish listing" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Title").closest("fieldset")?.disabled).toBe(false);
  await user.type(screen.getByLabelText("Title"), " revised");
  await user.click(screen.getByRole("button", { name: "Publish listing" }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect(post.mock.calls[1][1]).toMatchObject({ title: "Camera revised" });
  await screen.findByText("Published listing");
});
