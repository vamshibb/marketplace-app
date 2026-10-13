import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "../../../shared/api/axios";
import { productsQueryKeys } from "../queryKeys";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import type { ProductDetail, ProductMedia } from "../types";
import { httpError, owner, product, setup } from "./editProductTestUtils";

const media: ProductMedia[] = [
  { id: "front", url: "/front.jpg", mediaType: "IMAGE", sortOrder: 0 },
  { id: "video", url: "/video.mp4", mediaType: "VIDEO", sortOrder: 1 },
  { id: "back", url: "/back.jpg", mediaType: "IMAGE", sortOrder: 2 },
];
const listing = { ...product, media };
const tiles = () => within(screen.getByRole("list", { name: "Listing media" })).getAllByRole("listitem");
const urls = () => tiles().flatMap(tile => Array.from(tile.querySelectorAll("img,video"), item => item.getAttribute("src")));

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(media => ({ matches: true, media, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: () => [] });
  Object.defineProperty(Document.prototype, "getAnimations", { configurable: true, value: () => [] });
  Object.defineProperty(Element.prototype, "animate", { configurable: true, value: () => ({ finished: Promise.resolve(), cancel() {}, finish() {} }) });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const tile = this.closest('[aria-label="Listing media"] > li');
    if (tile?.parentElement) return new DOMRect(Array.from(tile.parentElement.children).indexOf(tile) * 110, 100, 100, 100);
    return new DOMRect(0, 0, 1000, 800);
  });
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:selected");
    static revokeObjectURL = vi.fn();
  });
});

const mountEditor = async (currentListing = listing) => {
  const context = setup(owner.id, currentListing);
  context.mount();
  const title = await screen.findByRole<HTMLInputElement>("textbox", { name: "Title" });
  await context.user.clear(title);
  await context.user.type(title, "Unsaved title");
  return { ...context, title };
};

const reorder = async (user: ReturnType<typeof setup>["user"]) => {
  screen.getByRole("button", { name: "Reorder image 3" }).focus();
  await user.keyboard("[Space]");
  await user.keyboard("[ArrowLeft]");
  await user.keyboard("[ArrowLeft]");
  await user.keyboard("[Space]");
  await waitFor(() => expect(urls()).toEqual(["/back.jpg", "/front.jpg", "/video.mp4"]));
};

it("shows one compact grid with previews, first-image cover and ten slots", async () => {
  await mountEditor();
  expect(screen.getAllByRole("heading", { name: "Photos & video" })).toHaveLength(1);
  expect(tiles()).toHaveLength(10);
  expect(within(tiles()[0]).getByText("Cover")).toBeTruthy();
  expect(screen.getByLabelText("Video 2").tagName).toBe("VIDEO");
  expect(screen.queryByRole("button", { name: /Earlier|Later/ })).toBeNull();
});

it("keyboard drag drafts, discards, and saves every ID without resetting fields", async () => {
  const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: {} });
  const { user, client, title } = await mountEditor();
  await reorder(user);
  expect(patch).not.toHaveBeenCalled();
  expect(client.getQueryData<ProductDetail>(productsQueryKeys.detail(product.id))?.media).toEqual(media);
  expect(within(tiles()[0]).getByText("Cover")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Discard order" }));
  expect(urls()).toEqual(media.map(item => item.url));
  await reorder(user);
  await user.click(screen.getByRole("button", { name: "Save order" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Save order" })).toBeNull());
  expect(patch).toHaveBeenCalledExactlyOnceWith("/products/camera/media/order", { mediaIds: ["back", "front", "video"] });
  expect(title.value).toBe("Unsaved title");
});

it("retains a failed reorder and failed refresh draft, then shows authoritative refreshed order", async () => {
  vi.spyOn(api, "patch").mockRejectedValue(httpError(500));
  const { user, get, title } = await mountEditor();
  await reorder(user);
  await user.click(screen.getByRole("button", { name: "Save order" }));
  await screen.findByRole("alert");
  get.mockRejectedValueOnce(httpError(500));
  await user.click(screen.getByRole("button", { name: "Refresh media" }));
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "Refresh media" }).disabled).toBe(false));
  expect(urls()[0]).toBe("/back.jpg");
  const refreshed = [media[1], media[0], media[2]].map((item, sortOrder) => ({ ...item, sortOrder }));
  get.mockResolvedValueOnce({ data: { data: refreshed } });
  await user.click(screen.getByRole("button", { name: "Refresh media" }));
  await waitFor(() => expect(urls()).toEqual(["/video.mp4", "/front.jpg", "/back.jpg"]));
  expect(screen.queryByRole("button", { name: "Save order" })).toBeNull();
  expect(within(tiles()[1]).getByText("Cover")).toBeTruthy();
  expect(title.value).toBe("Unsaved title");
  expect(get.mock.calls.filter(([url]) => url === "/products/camera")).toHaveLength(1);
});

it("keeps selected files after upload failure, blocks overlapping actions, and merges successful uploads into caches", async () => {
  const post = vi.spyOn(api, "post").mockRejectedValueOnce(httpError(500));
  const { user, title, client } = await mountEditor();
  client.setQueryData(productsQueryKeys.list({}), { products: [listing] });
  client.setQueryData(productsQueryKeys.mine(owner.id), [listing]);
  client.setQueryData(favoritesQueryKeys.list(owner.id), [{ productId: product.id, product: listing }]);
  await user.upload(screen.getByLabelText("Choose photos and videos"), new File(["photo"], "new.png", { type: "image/png" }));
  await user.click(screen.getByRole("button", { name: "Upload 1 file" }));
  await screen.findByRole("alert");
  expect(screen.getByAltText("new.png")).toBeTruthy();
  let finish!: (value: { data: { data: ProductMedia[] } }) => void;
  post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await user.click(screen.getByRole("button", { name: "Upload 1 file" }));
  for (const name of ["Upload 1 file", "Refresh media", "Save changes", "Remove image 1", "Add media in slot 5"]) {
    expect(screen.getByRole<HTMLButtonElement>("button", { name }).disabled).toBe(true);
  }
  const added: ProductMedia = { id: "new", url: "/new.png", mediaType: "IMAGE", sortOrder: 3 };
  await act(async () => finish({ data: { data: [added] } }));
  await waitFor(() => expect(screen.queryByAltText("new.png")).toBeNull());
  expect(urls()).toEqual([...media.map(item => item.url), "/new.png"]);
  expect(client.getQueryData<ProductDetail>(productsQueryKeys.detail(product.id))?.media).toHaveLength(4);
  expect(client.getQueryData<{products: ProductDetail[]}>(productsQueryKeys.list({}))?.products[0].media).toHaveLength(4);
  expect(client.getQueryData<ProductDetail[]>(productsQueryKeys.mine(owner.id))?.[0].media).toHaveLength(4);
  expect(client.getQueryData<{product: ProductDetail}[]>(favoritesQueryKeys.list(owner.id))?.[0].product.media).toHaveLength(4);
  expect(title.value).toBe("Unsaved title");
});

it("confirms persisted removal and keeps edits while updating the cover", async () => {
  const remove = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
  const { user, title } = await mountEditor();
  await user.click(screen.getByRole("button", { name: "Remove image 1" }));
  expect(remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Remove image 1" }));
  await waitFor(() => expect(urls()).toEqual(["/video.mp4", "/back.jpg"]));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(remove).toHaveBeenCalledExactlyOnceWith("/products/camera/media/front");
  expect(within(tiles()[1]).getByText("Cover")).toBeTruthy();
  expect(title.value).toBe("Unsaved title");
});

it("preserves media and disables editing when a media action returns 403", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(api, "delete").mockRejectedValue(httpError(403));
  const { user, title } = await mountEditor();
  await user.click(screen.getByRole("button", { name: "Remove image 1" }));
  expect((await screen.findByRole("alert")).textContent).toContain("no longer have permission");
  expect(urls()).toEqual(media.map(item => item.url));
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Add media in slot 4" }).disabled).toBe(true);
  expect(title.value).toBe("Unsaved title");
});

it("cancels a keyboard drag without creating an order to save", async () => {
  const { user } = await mountEditor();
  screen.getByRole("button", { name: "Reorder image 3" }).focus();
  await user.keyboard("[Space][ArrowLeft][Escape]");
  expect(urls()).toEqual(media.map(item => item.url));
  expect(screen.queryByRole("button", { name: "Save order" })).toBeNull();
});


it("fills empty Edit slots and limits persisted plus selected files to ten", async () => {
  const seven = Array.from({ length: 7 }, (_, index) => ({ ...media[0], id: `image-${index}`, sortOrder: index }));
  const { user, title } = await mountEditor({ ...listing, media: seven });
  expect(tiles()).toHaveLength(10);
  expect(screen.getAllByRole("button", { name: /Add media in slot/ })).toHaveLength(3);
  const input = screen.getByLabelText<HTMLInputElement>("Choose photos and videos");
  const click = vi.spyOn(input, "click");
  await user.click(screen.getByRole("button", { name: "Add media in slot 10" }));
  expect(click).toHaveBeenCalledOnce();
  const files = Array.from({ length: 4 }, (_, index) => new File(["photo"], `new-${index}.png`, { type: "image/png" }));
  await user.upload(input, files);
  expect((await screen.findByRole("alert")).textContent).toContain("up to 10");
  expect(screen.queryByAltText("new-0.png")).toBeNull();
  await user.upload(input, files.slice(0, 3));
  expect(tiles()).toHaveLength(10);
  expect(screen.queryByRole("button", { name: /Add media in slot/ })).toBeNull();
  expect(within(tiles()[7]).getByAltText("new-0.png")).toBeTruthy();
  const remove = vi.spyOn(api, "delete");
  await user.click(screen.getByRole("button", { name: "Remove new-1.png" }));
  expect(remove).not.toHaveBeenCalled();
  expect(tiles()).toHaveLength(10);
  expect(screen.getByRole("button", { name: "Add media in slot 10" })).toBeTruthy();
  expect(title.value).toBe("Unsaved title");
});

it("shows no add slot for ten persisted items", async () => {
  const ten = Array.from({ length: 10 }, (_, index) => ({ ...media[0], id: `image-${index}`, sortOrder: index }));
  await mountEditor({ ...listing, media: ten });
  expect(tiles()).toHaveLength(10);
  expect(screen.queryByRole("button", { name: /Add media/ })).toBeNull();
});
