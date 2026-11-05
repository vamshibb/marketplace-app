import { useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../auth/hooks/useAuthStore";
import { useMessagingRealtime } from "../../messaging/hooks/useMessagingRealtime";
import { useNotificationRealtime } from "../../notifications/hooks/useNotificationRealtime";
import { startSharedRealtime, stopSharedRealtime } from "../../../shared/realtime/realtimeEvents";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { ordersQueryKeys } from "../queryKeys";
import { useOrdersRealtime } from "./useOrdersRealtime";

const encoder = new TextEncoder();

const hasOrderInvalidation = (
    spy: ReturnType<typeof vi.spyOn>,
    userId: string,
    role?: "buyer" | "seller",
) =>
    (spy.mock.calls as Array<[unknown, ...unknown[]]>).some(([options]) => {
        if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
        const queryKey = (options as { queryKey?: unknown }).queryKey;
        if (!Array.isArray(queryKey)) return false;

        if (role) {
            return queryKey[0] === "orders" && queryKey[1] === userId && queryKey[2] === role;
        }

        return queryKey[0] === "orders" && queryKey[1] === userId;
    });

const hasOrderPrefixInvalidation = (
    spy: ReturnType<typeof vi.spyOn>,
    userId: string,
) =>
    (spy.mock.calls as Array<[unknown, ...unknown[]]>).some(([options]) => {
        if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
        const queryKey = (options as { queryKey?: unknown }).queryKey;
        return Array.isArray(queryKey) && queryKey[0] === "orders" && queryKey[1] === userId;
    });

describe("orders realtime", () => {
    beforeEach(() => {
        useAuthStore.setState({ token: "token-a" });
        stopSharedRealtime("dispose");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        stopSharedRealtime("dispose");
        useAuthStore.getState().clearToken();
    });

    it("invalidates the current user's buyer and seller order caches on order_changed", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: order_changed\ndata: {\"orderId\":\"o-1\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasOrderInvalidation(invalidateSpy, userId, "buyer")).toBe(true);
        });

        expect(hasOrderInvalidation(invalidateSpy, userId, "seller")).toBe(true);
        expect(hasOrderInvalidation(invalidateSpy, "user-2")).toBe(false);
        expect(invalidateSpy.mock.calls.some(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "orders" && queryKey[1] === userId && queryKey[2] === "detail" && queryKey[3] === "o-1";
        })).toBe(true);
    });

    it("ignores whitespace-only orderId values with zero invalidation", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: order_changed\ndata: {\"orderId\":\"   \"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(invalidateSpy.mock.calls.length).toBe(0);
        });
    });

    it("trims valid orderId values before invalidating the matching detail and action queries", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: order_changed\ndata: {\"orderId\":\"  o-2  \"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasOrderInvalidation(invalidateSpy, userId, "buyer")).toBe(true);
        });

        expect(invalidateSpy.mock.calls.some(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "orders" && queryKey[1] === userId && queryKey[2] === "detail" && queryKey[3] === "o-2";
        })).toBe(true);
    });

    it("refreshes the current user's whole orders prefix on connected recovery using an active detail query", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        const detailQueryFn = vi.fn(async () => ({ id: "o-9" }));
        let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(c) {
                    controller = c as ReadableStreamDefaultController<Uint8Array>;
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });
        renderHook(() => useQuery({
            queryKey: ordersQueryKeys.detail(userId, "o-9"),
            queryFn: detailQueryFn,
        }), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(detailQueryFn).toHaveBeenCalledTimes(1);
        });

        controller?.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));

        await waitFor(() => {
            expect(hasOrderPrefixInvalidation(invalidateSpy, userId)).toBe(true);
        });
        expect(hasOrderPrefixInvalidation(invalidateSpy, "user-2")).toBe(false);
        expect(detailQueryFn).toHaveBeenCalledTimes(2);
    });

    it("ignores non-order events and other users", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: notification_created\ndata: {\"notificationId\":\"n-1\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(invalidateSpy.mock.calls.length).toBe(0);
        });

        expect(ordersQueryKeys.list(userId, "buyer")).toEqual(["orders", userId, "buyer"]);
        expect(ordersQueryKeys.root(userId)).toEqual(["orders", userId]);
    });

    it("removes the listener on unmount so a later event on the same stream does not trigger invalidation", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(c) {
                    controller = c as ReadableStreamDefaultController<Uint8Array>;
                },
            }),
        }) as Response));

        startSharedRealtime();
        const { unmount } = renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });

        controller?.enqueue(encoder.encode("event: order_changed\ndata: {\"orderId\":\"o-100\"}\n\n"));

        await waitFor(() => {
            expect(hasOrderInvalidation(invalidateSpy, userId, "buyer")).toBe(true);
        });

        invalidateSpy.mockClear();
        unmount();
        controller?.enqueue(encoder.encode("event: order_changed\ndata: {\"orderId\":\"o-101\"}\n\n"));

        await Promise.resolve();
        expect(invalidateSpy.mock.calls.length).toBe(0);
    });

    it("reuses the existing shared transport when orders and messaging/notifications are both subscribed", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const fetchSpy = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchSpy);
        startSharedRealtime();

        renderHook(() => useOrdersRealtime(userId), { wrapper: queryWrapper(client) });
        renderHook(() => useMessagingRealtime(userId), { wrapper: queryWrapper(client) });
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });
});
