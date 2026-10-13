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
