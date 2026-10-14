import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../auth/hooks/useAuthStore";
import { useMessagingRealtime } from "../../messaging/hooks/useMessagingRealtime";
import { startSharedRealtime, stopSharedRealtime, subscribeToRealtimeEvents } from "../../../shared/realtime/realtimeEvents";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { notificationQueryKeys } from "../queryKeys";
import { useNotificationRealtime } from "./useNotificationRealtime";

const encoder = new TextEncoder();

const hasNotificationInvalidation = (
    spy: ReturnType<typeof vi.spyOn>,
    userId: string,
) =>
    (spy.mock.calls as Array<[unknown, ...unknown[]]>).some(([options]) => {
        if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
        const queryKey = (options as { queryKey?: unknown }).queryKey;
        return Array.isArray(queryKey) && queryKey[0] === "notifications" && queryKey[1] === userId;
    });

const hasMessagingInvalidation = (
    spy: ReturnType<typeof vi.spyOn>,
    userId: string,
) =>
    (spy.mock.calls as Array<[unknown, ...unknown[]]>).some(([options]) => {
        if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
        const queryKey = (options as { queryKey?: unknown }).queryKey;
        return Array.isArray(queryKey) && queryKey[0] === "messaging" && queryKey[1] === userId;
    });

describe("notification realtime retained tests", () => {
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

    it("notification_created invalidates current user's notification list + unread count only", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        const otherUser = notificationQueryKeys.list("user-2");

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
        client.setQueryData(otherUser, { ok: true });
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });

        const currentUserCalls = invalidateSpy.mock.calls.filter(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "notifications" && queryKey[1] === userId;
        });

        expect(currentUserCalls.length).toBeGreaterThan(0);
        expect(invalidateSpy.mock.calls.some(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "notifications" && queryKey[1] === "user-2";
        })).toBe(false);
    });

    it("notification_read_changed with scope notification invalidates current user's notification caches", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: notification_read_changed\ndata: {\"scope\":\"notification\",\"notificationId\":\"n-1\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });
    });

    it("notification_read_changed with scope conversation invalidates current user's notification caches", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: notification_read_changed\ndata: {\"scope\":\"conversation\",\"conversationId\":\"c-1\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });
    });

    it("notification_read_changed with scope all invalidates current user's notification caches", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: notification_read_changed\ndata: {\"scope\":\"all\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });
    });

    it("connected recovery invalidates the current user's notification prefix only", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });

        expect(invalidateSpy.mock.calls.some(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "notifications" && queryKey[1] === "user-2";
        })).toBe(false);
    });

    it("receives and processes unrelated message_created before asserting notification caches remain unchanged", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        const seenMessage = vi.fn();

        const unsubscribe = subscribeToRealtimeEvents((eventName, payload) => {
            if (eventName === "message_created") {
                seenMessage(payload);
            }
        });

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-1\",\"messageId\":\"m-1\",\"senderId\":\"u-2\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(seenMessage).toHaveBeenCalledWith({ conversationId: "c-1", messageId: "m-1", senderId: "u-2" });
        });

        expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(false);
        unsubscribe();
    });

    it("unsubscribes on unmount so later notification events do not trigger another invalidation", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(streamController) {
                    controller = streamController;
                    queueMicrotask(() => {
                        streamController.enqueue(encoder.encode("event: notification_created\ndata: {\"notificationId\":\"n-1\"}\n\n"));
                    });
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        startSharedRealtime();

        const { unmount } = renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });

        invalidateSpy.mockClear();
        unmount();

        controller?.enqueue(encoder.encode("event: notification_created\ndata: {\"notificationId\":\"n-2\"}\n\n"));
        await Promise.resolve();

        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("keeps only one shared realtime transport while both messaging and notification subscribers stay active", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const invalidateSpy = vi.spyOn(client, "invalidateQueries");
        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"conversation-1\",\"messageId\":\"m-1\",\"senderId\":\"u-2\"}\n\n"));
                        controller.enqueue(encoder.encode("event: notification_created\ndata: {\"notificationId\":\"n-1\"}\n\n"));
                    });
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        startSharedRealtime();

        renderHook(() => {
            useMessagingRealtime(userId);
            useNotificationRealtime(userId);
        }, { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(hasMessagingInvalidation(invalidateSpy, userId)).toBe(true);
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });
    });

    it("another user's notification cache remains untouched", async () => {
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
        renderHook(() => useNotificationRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(hasNotificationInvalidation(invalidateSpy, userId)).toBe(true);
        });

        expect(invalidateSpy.mock.calls.some(([options]) => {
            if (!options || typeof options !== "object" || !("queryKey" in options)) return false;
            const queryKey = (options as { queryKey?: unknown }).queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "notifications" && queryKey[1] === "user-2";
        })).toBe(false);
    });
});
