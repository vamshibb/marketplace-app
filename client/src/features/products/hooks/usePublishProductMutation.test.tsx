import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { usePublishProductMutation } from "./usePublishProductMutation";

it("reports Create upload progress and stays pending until upload processing completes", async () => {
  let finish!: (value: { data: { data: [] } }) => void;
  const post = vi.spyOn(api, "post").mockResolvedValueOnce({ data: { data: { id: "new-listing" } } })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => usePublishProductMutation(), { wrapper: queryWrapper(createTestQueryClient()) });
  act(() => result.current.mutate({
    values: { title: "Camera", description: "A camera", price: 20, categoryId: "electronics", listingType: "SALE", quantityAvailable: 1 },
    files: [new File(["photo"], "photo.png", { type: "image/png" })],
  }));
  await waitFor(() => expect(result.current.uploading).toBe(true));
  expect(result.current.uploadProgress).toBeNull();
  await act(async () => post.mock.calls[1][2]?.onUploadProgress?.({ loaded: 100, total: 100, bytes: 100, lengthComputable: true }));
  expect(result.current.uploadProgress).toBe(100);
  expect(result.current.isPending).toBe(true);
  await act(async () => finish({ data: { data: [] } }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.uploading).toBe(false);
  expect(result.current.data).toBe("new-listing");
});


it.each(["unreachable", "partial"])("blocks duplicate uploads while prior saved media is %s, then resumes verification", async state => {
  const post = vi.spyOn(api, "post").mockResolvedValueOnce({ data: { data: { id: "new-listing" } } })
    .mockRejectedValueOnce(new Error("Lost upload response"));
  const get = vi.spyOn(api, "get");
  if (state === "unreachable") get.mockRejectedValue(new Error("Offline"));
  else get.mockResolvedValue({ data: { data: { media: [{ id: "first" }] } } });
  const { result } = renderHook(() => usePublishProductMutation(), { wrapper: queryWrapper(createTestQueryClient()) });
  const request = {
    values: { title: "Camera", description: "A camera in good condition", price: 20, categoryId: "electronics", listingType: "SALE" as const, quantityAvailable: 1 },
    files: [new File(["1"], "1.png", { type: "image/png" }), new File(["2"], "2.png", { type: "image/png" })],
  };
  act(() => result.current.mutate(request));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.canRetryUpload).toBe(false);
  await act(async () => { await result.current.mutateAsync(request).catch(() => undefined); });
  expect(post).toHaveBeenCalledTimes(2);
  expect(result.current.isError).toBe(true);
  get.mockResolvedValueOnce({ data: { data: { media: [{ id: "first" }, { id: "second" }] } } });
  await act(async () => { await result.current.mutateAsync({ ...request, files: [] }); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(post).toHaveBeenCalledTimes(2);
  expect(result.current.data).toBe("new-listing");
});
