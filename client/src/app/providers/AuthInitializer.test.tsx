import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../features/auth/hooks/useAuthStore";
import { useCurrentUserQuery } from "../../features/auth/hooks/useCurrentUserQuery";
import { useLogout } from "../../features/auth/hooks/useLogout";
import { authQueryKeys } from "../../features/auth/queryKeys";
import { categoriesQueryKeys } from "../../features/categories/queryKeys";
import { messagingQueryKeys } from "../../features/messaging/queryKeys";
import { notificationQueryKeys } from "../../features/notifications/queryKeys";
import { ordersQueryKeys } from "../../features/orders/queryKeys";
import { favoritesQueryKeys } from "../../features/products/favoritesQueryKeys";
import { productsQueryKeys } from "../../features/products/queryKeys";
import { reviewQueryKeys } from "../../features/reviews/queryKeys";
import { api } from "../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../test/queryClient";
import { AuthInitializer } from "./AuthInitializer";

afterEach(() => useAuthStore.getState().clearToken());

const setup = () => {
  const client = createTestQueryClient();
  const QueryProvider = queryWrapper(client);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryProvider><AuthInitializer>{children}</AuthInitializer></QueryProvider>
  );
  useAuthStore.getState().setToken("session-a");
  return { client, wrapper };
};

describe("session recovery", () => {
  it.each([401, 500, "network"] as const)("handles /me %s without losing a recoverable session", async status => {
    const { wrapper } = setup();
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError("Request failed", undefined, config, undefined,
      status === "network" ? undefined : { status, statusText: "Error", data: {}, headers: {}, config });
    const request = vi.spyOn(api, "get").mockRejectedValue(error);
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    await waitFor(() => expect(request).toHaveBeenCalledWith("/auth/me"));
    if (status === 401) {
      await waitFor(() => expect(useAuthStore.getState().token).toBeNull());
      expect(JSON.parse(localStorage.getItem("marketplace-auth") ?? "{}").state.token).toBeNull();
    } else {
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(useAuthStore.getState().token).toBe("session-a");
      expect(JSON.parse(localStorage.getItem("marketplace-auth") ?? "{}").state.token).toBe("session-a");
    }
  });
});

describe("session cache isolation", () => {
  it.each(["change", "logout"] as const)("removes private caches and retains public data on %s", async action => {
    const { client, wrapper } = setup();
    const user = { id: "user-a", email: "a@example.test", displayName: "A" };
    client.setQueryData(authQueryKeys.currentUser(), user);
    vi.spyOn(api, "get").mockResolvedValue({ data: { data: { ...user, id: "user-b" } } });
    const privateKeys = [
      favoritesQueryKeys.list(user.id), productsQueryKeys.mine(user.id),
      ordersQueryKeys.list(user.id, "buyer"), ordersQueryKeys.detail(user.id, "order"),
      messagingQueryKeys.conversations(user.id), messagingQueryKeys.messages(user.id, "conversation"),
      notificationQueryKeys.list(user.id), notificationQueryKeys.unreadCount(user.id),
      productsQueryKeys.availabilityBlocks(user.id, "product"), reviewQueryKeys.status(user.id, "order"),
    ];
    const publicKeys = [
      productsQueryKeys.list({}), productsQueryKeys.detail("product"), categoriesQueryKeys.all(),
      reviewQueryKeys.product("product"), reviewQueryKeys.user(user.id),
      ordersQueryKeys.availability("product", "2026-10-10", "2026-10-12"),
    ];
    for (const key of [...privateKeys, ...publicKeys]) client.setQueryData(key, { retained: true });
    const oldAuthQuery = client.getQueryCache().find({ queryKey: authQueryKeys.currentUser() });
    const { result } = renderHook(() => useLogout(), { wrapper });

    act(() => {
      if (action === "logout") result.current();
      else useAuthStore.getState().setToken("session-b");
    });

    for (const key of privateKeys) expect(client.getQueryState(key), JSON.stringify(key)).toBeUndefined();
    expect(client.getQueryCache().getAll()).not.toContain(oldAuthQuery);
    for (const key of publicKeys) expect(client.getQueryData(key), JSON.stringify(key)).toEqual({ retained: true });
    expect(useAuthStore.getState().token).toBe(action === "logout" ? null : "session-b");
  });
});
