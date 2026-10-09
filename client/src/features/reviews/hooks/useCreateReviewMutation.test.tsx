import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { reviewQueryKeys } from "../queryKeys";
import { useCreateReviewMutation } from "./useCreateReviewMutation";

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => useAuthStore.getState().clearToken());

it("invalidates the reviewed user's reputation after successful review creation", async () => {
  const client = createTestQueryClient();
  useAuthStore.getState().setToken("reviewer-session");
  vi.spyOn(api, "get").mockResolvedValue({ data: { data: {
    id: "reviewer", email: "reviewer@example.test", displayName: "Reviewer",
  } } });
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: { data: { id: "review", revieweeId: "seller" } } });
  const reputationKey = reviewQueryKeys.user("seller");
  const unrelatedKeys = [reviewQueryKeys.user("other-seller"), reviewQueryKeys.user("reviewer"), reviewQueryKeys.product("product")];
  for (const key of [reputationKey, ...unrelatedKeys]) client.setQueryData(key, { reviewCount: 0 });
  const onClose = vi.fn();
  const { result } = renderHook(() => ({
    user: useCurrentUserQuery(),
    mutation: useCreateReviewMutation("order", "user", onClose),
  }), {
    wrapper: queryWrapper(client),
  });
  // Wait for the actual /me query to populate the mutation's current-user context.
  await waitFor(() => expect(result.current.user.isSuccess).toBe(true));
  await act(async () => {
    await result.current.mutation.mutateAsync({ rating: 5, comment: "Great seller" });
  });

  expect(post).toHaveBeenCalledWith("/orders/order/reviews/user", { rating: 5, comment: "Great seller" });
  expect(client.getQueryState(reputationKey)?.isInvalidated).toBe(true);
  for (const key of unrelatedKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  expect(onClose).toHaveBeenCalledOnce();
});
