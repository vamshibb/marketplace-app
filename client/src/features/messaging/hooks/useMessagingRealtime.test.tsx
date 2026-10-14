import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../auth/hooks/useAuthStore";
import { createAuthenticatedRealtimeClient, parseSseChunk, parseSseFrames } from "../../../shared/realtime/authenticatedSse";
import { startSharedRealtime, stopSharedRealtime, subscribeToRealtimeEvents } from "../../../shared/realtime/realtimeEvents";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { messagingQueryKeys } from "../queryKeys";
import { useMessagingRealtime } from "./useMessagingRealtime";

const encoder = new TextEncoder();

describe("authenticated realtime SSE", () => {
    beforeEach(() => {
        useAuthStore.setState({ token: "token-a" });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        stopSharedRealtime("dispose");
        useAuthStore.getState().clearToken();
    });

    it("parses split SSE frames and JSON payloads across arbitrary chunks", () => {
        const text = [
            "event: connected\ndata: {\"version\":1}\n\n",
            "event: message_created\ndata: {\"conversationId\":\"c-1\",\"messageId\":\"m-1\",\"senderId\":\"u-2\"}\n\n",
        ].join("");

        const frames = parseSseFrames(text);
        expect(frames).toEqual([
            { event: "connected", data: { version: 1 } },
            { event: "message_created", data: { conversationId: "c-1", messageId: "m-1", senderId: "u-2" } },
        ]);
    });

    it("handles split field names, incomplete JSON, CRLF breaks, and frame delimiters across chunks", () => {
        const first = parseSseChunk("eve");
        const second = parseSseChunk("nt: connected\r\n", first.remainder);
        const third = parseSseChunk("data: {\"vers", second.remainder);
        const fourth = parseSseChunk("ion\":1}\n\n", third.remainder);

        expect(first.frames).toEqual([]);
        expect(second.frames).toEqual([]);
        expect(third.frames).toEqual([]);
        expect(fourth.frames).toEqual([{ event: "connected", data: { version: 1 } }]);
        expect(fourth.remainder).toBe("");
    });

    it("preserves a CRLF split across chunks without emitting a corrupted frame", () => {
        const first = parseSseChunk("event: connected\r");
        const second = parseSseChunk("\ndata: {\"version\":1}\n\n", first.remainder);

        expect(first.frames).toEqual([]);
        expect(first.remainder).toBe("event: connected\r");
        expect(second.frames).toEqual([{ event: "connected", data: { version: 1 } }]);
        expect(second.remainder).toBe("");
    });

    it("drops a partial old-stream remainder before reconnecting to a fresh stream", async () => {
        vi.useFakeTimers();
        const events: Array<{ event: string; data: unknown }> = [];
        let fetchCount = 0;

        vi.stubGlobal("fetch", vi.fn(async () => {
            fetchCount += 1;
            const isReconnect = fetchCount > 1;

            const body = new ReadableStream({
                start(controller) {
                    if (!isReconnect) {
                        controller.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-1\""));
                        controller.close();
                        return;
                    }

                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    controller.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-2\",\"messageId\":\"m-2\"}\n\n"));
                },
            });

            return { ok: true, body } as Response;
        }));

        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-a",
            onEvent: (event, data) => events.push({ event, data }),
            onConnected: (data) => events.push({ event: "connected", data }),
            backoffMs: 10,
            maxBackoffMs: 20,
        });

        connection.start();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(fetchCount).toBeGreaterThanOrEqual(2);
        expect(events.filter((event) => event.event === "connected")).toEqual([
            { event: "connected", data: { version: 1 } },
            { event: "connected", data: { version: 1 } },
        ]);
        expect(events.filter((event) => event.event === "message_created")).toEqual([
            { event: "message_created", data: { conversationId: "c-2", messageId: "m-2" } },
        ]);
        connection.dispose();
    });

    it("uses the Authorization header and invalidates messaging state on message_created + read_changed", async () => {
        const client = createTestQueryClient();
        const conversationId = "conversation-1";
        const userId = "user-1";
        const conversationKey = messagingQueryKeys.conversation(userId, conversationId);
        const messagesKey = messagingQueryKeys.messages(userId, conversationId);
        const conversationsKey = messagingQueryKeys.conversations(userId);
        const unrelatedKey = messagingQueryKeys.messages("user-2", "conversation-2");

        for (const key of [conversationKey, messagesKey, conversationsKey, unrelatedKey]) {
            client.setQueryData(key, { ok: true });
        }

        let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            expect(String(input)).toContain("/api/realtime/stream");
            expect(init?.headers).toMatchObject({ Authorization: "Bearer token-a", Accept: "text/event-stream" });

            return {
                ok: true,
                body: new ReadableStream({
                    start: (streamController) => {
                        controller = streamController;
                        streamController.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                        queueMicrotask(() => {
                            streamController.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"conversation-1\",\"messageId\":\"message-1\",\"senderId\":\"user-2\"}\n\n"));
                            streamController.enqueue(encoder.encode("event: conversation_read_changed\ndata: {\"conversationId\":\"conversation-1\",\"userId\":\"user-1\",\"lastReadMessageId\":\"message-1\"}\n\n"));
                        });
                    },
                }),
            } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        startSharedRealtime();

        renderHook(() => useMessagingRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            expect(client.getQueryState(messagesKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(conversationKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(conversationsKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
        });

        expect(controller).toBeDefined();
    });

    it("runs recovery invalidation after connected and ignores unrelated events", async () => {
        const client = createTestQueryClient();
        const userId = "user-1";
        const messageKey = messagingQueryKeys.messages(userId, "conversation-1");
        const conversationKey = messagingQueryKeys.conversation(userId, "conversation-1");
        const conversationsKey = messagingQueryKeys.conversations(userId);
        const unrelated = messagingQueryKeys.messages("user-2", "conversation-2");
        for (const key of [messageKey, conversationKey, conversationsKey, unrelated]) client.setQueryData(key, { ok: true });

        let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start: (controller) => {
                    streamController = controller;
                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: notification_created\ndata: {\"notificationId\":\"n-1\"}\n\n"));
                    });
                },
            }),
        }) as Response));

        startSharedRealtime();
        renderHook(() => useMessagingRealtime(userId), { wrapper: queryWrapper(client) });

        await waitFor(() => {
            expect(client.getQueryState(messageKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(conversationKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(conversationsKey)?.isInvalidated).toBe(true);
            expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false);
        });

        expect(streamController).toBeDefined();
    });

    it("dispatches connected exactly once per server frame", async () => {
        const listener = vi.fn();
        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        const unsubscribe = subscribeToRealtimeEvents(listener);
        startSharedRealtime();

        await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
        expect(listener).toHaveBeenCalledWith("connected", { version: 1 });
        unsubscribe();
    });

    it("keeps subscribers isolated when one subscriber throws", async () => {
        const goodListener = vi.fn();
        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        const unsubscribeBad = subscribeToRealtimeEvents(() => {
            throw new Error("boom");
        });
        const unsubscribeGood = subscribeToRealtimeEvents(goodListener);

        startSharedRealtime();

        await waitFor(() => expect(goodListener).toHaveBeenCalledTimes(1));
        unsubscribeBad();
        unsubscribeGood();
        expect(goodListener).toHaveBeenCalledTimes(1);
    });

    it("reconnects automatically after an unexpected close and refuses reconnect after intentional abort", async () => {
        vi.useFakeTimers();
        let currentToken = "token-a";
        let fetchCount = 0;

        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            fetchCount += 1;
            const signal = init?.signal as AbortSignal;
            const headers = init?.headers as Record<string, string> | undefined;

            const body = new ReadableStream({
                start(controller) {
                    signal.addEventListener("abort", () => controller.close());

                    if (fetchCount === 1) {
                        queueMicrotask(() => controller.close());
                        return;
                    }

                    controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                },
            });

            if (fetchCount === 2) {
                expect(headers).toMatchObject({ Authorization: `Bearer ${currentToken}` });
            }

            return { ok: true, body } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => currentToken,
            onEvent: vi.fn(),
            onConnected: vi.fn(),
            backoffMs: 25,
            maxBackoffMs: 25,
        });

        connection.start();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);

        currentToken = "token-b";
        connection.abort("logout");
        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        connection.dispose();
    });

    it("uses the latest token on reconnect after an unexpected close", async () => {
        vi.useFakeTimers();
        let currentToken = "token-a";
        let fetchCount = 0;

        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            fetchCount += 1;
            const headers = init?.headers as Record<string, string> | undefined;

            if (fetchCount === 1) {
                return {
                    ok: true,
                    body: new ReadableStream({
                        start(controller) {
                            controller.close();
                        },
                    }),
                } as Response;
            }

            expect(headers).toMatchObject({ Authorization: `Bearer ${currentToken}` });
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    },
                }),
            } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => currentToken,
            onEvent: vi.fn(),
            onConnected: vi.fn(),
            backoffMs: 50,
            maxBackoffMs: 50,
        });

        connection.start();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        currentToken = "token-b";
        await act(async () => {
            await vi.advanceTimersByTimeAsync(50);
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
            headers: expect.objectContaining({ Authorization: "Bearer token-b" }),
        });
        connection.dispose();
    });

    it("reconnects after 5xx/network failures and stops on 401/403 without looped retries", async () => {
        vi.useFakeTimers();
        let fetchCount = 0;
        const fetchMock = vi.fn(async () => {
            fetchCount += 1;
            if (fetchCount === 1) {
                return { ok: false, status: 500, statusText: "Server Error" } as Response;
            }
            if (fetchCount === 2) {
                return { ok: false, status: 401, statusText: "Unauthorized" } as Response;
            }
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    },
                }),
            } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-a",
            onEvent: vi.fn(),
            onConnected: vi.fn(),
            backoffMs: 25,
            maxBackoffMs: 25,
        });

        connection.start();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        connection.dispose();
    });

    it("resets reconnect backoff after a successful connected event", async () => {
        vi.useFakeTimers();
        let fetchCount = 0;

        const fetchMock = vi.fn(async () => {
            fetchCount += 1;
            if (fetchCount === 1) {
                return {
                    ok: true,
                    body: new ReadableStream({
                        start(controller) {
                            controller.close();
                        },
                    }),
                } as Response;
            }
            if (fetchCount === 2) {
                return {
                    ok: true,
                    body: new ReadableStream({
                        start(controller) {
                            controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                            queueMicrotask(() => controller.close());
                        },
                    }),
                } as Response;
            }
            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        controller.close();
                    },
                }),
            } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-a",
            onEvent: vi.fn(),
            onConnected: vi.fn(),
            backoffMs: 50,
            maxBackoffMs: 100,
        });

        connection.start();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(49);
        });
        expect(fetchCount).toBe(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(fetchCount).toBe(2);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(49);
        });
        expect(fetchCount).toBe(2);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(fetchCount).toBe(3);

        connection.dispose();
    });

    it("ignores stale responses from the same client after replacement", async () => {
        const onEvent = vi.fn();
        const onError = vi.fn();
        let resolveOldRequest: ((response: Response) => void) | undefined;
        let newStreamController: ReadableStreamDefaultController<Uint8Array> | undefined;

        const fetchMock = vi.fn(async () => {
            if (fetchMock.mock.calls.length === 1) {
                return await new Promise<Response>((resolve) => {
                    resolveOldRequest = resolve;
                });
            }

            return {
                ok: true,
                body: new ReadableStream({
                    start(controller) {
                        newStreamController = controller;
                        queueMicrotask(() => {
                            controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":2}\n\n"));
                        });
                    },
                }),
            } as Response;
        });

        vi.stubGlobal("fetch", fetchMock);
        const connection = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-a",
            onEvent,
            onConnected: vi.fn(),
            onError,
            backoffMs: 25,
            maxBackoffMs: 25,
        });

        connection.start();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        connection.abort("replacement");
        connection.start();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

        resolveOldRequest?.({ ok: false, status: 401, statusText: "Unauthorized" } as Response);
        await Promise.resolve();

        expect(onError).not.toHaveBeenCalled();
        expect(newStreamController).toBeDefined();

        newStreamController?.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-new\"}\n\n"));
        await waitFor(() => expect(onEvent).toHaveBeenCalledWith("connected", { version: 2 }));
        await waitFor(() => expect(onEvent).toHaveBeenCalledWith("message_created", { conversationId: "c-new" }));

        connection.dispose();
    });

    it("ignores malformed JSON and unknown events without dropping later valid events", async () => {
        const listener = vi.fn();
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("event: malformed\ndata: {oops\n\n"));
                    controller.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-1\",\"messageId\":\"m-1\"}\n\n"));
                },
            }),
        }) as Response));

        const unsubscribe = subscribeToRealtimeEvents(listener);
        startSharedRealtime();

        await waitFor(() => expect(listener).toHaveBeenCalledWith("message_created", { conversationId: "c-1", messageId: "m-1" }));
        expect(listener).toHaveBeenCalledWith("malformed", "{oops");
        unsubscribe();
    });

    it("stale old transports cannot dispatch after replacement", async () => {
        const oldListener = vi.fn();
        const newListener = vi.fn();
        let firstController: ReadableStreamDefaultController<Uint8Array> | undefined;
        let secondController: ReadableStreamDefaultController<Uint8Array> | undefined;

        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    if (fetchMock.mock.calls.length === 1) {
                        firstController = controller;
                    } else {
                        secondController = controller;
                    }
                    queueMicrotask(() => {
                        controller.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    });
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        const first = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-a",
            onEvent: oldListener,
            onConnected: oldListener,
        });
        const second = createAuthenticatedRealtimeClient({
            url: "http://localhost:3000/api/realtime/stream",
            getToken: () => "token-b",
            onEvent: newListener,
            onConnected: newListener,
        });

        first.start();
        second.start();
        first.abort("replacement");

        firstController?.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-old\"}\n\n"));
        secondController?.enqueue(encoder.encode("event: message_created\ndata: {\"conversationId\":\"c-new\"}\n\n"));

        await waitFor(() => expect(newListener).toHaveBeenCalledWith("message_created", { conversationId: "c-new" }));
        expect(oldListener).not.toHaveBeenCalledWith("message_created", { conversationId: "c-old" });
        second.dispose();
    });

    it("keeps only one shared transport active and cleans up subscriber listeners", async () => {
        const listener = vi.fn();
        let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
        const fetchMock = vi.fn(async () => ({
            ok: true,
            body: new ReadableStream({
                start(streamController) {
                    controller = streamController;
                    queueMicrotask(() => {
                        streamController.enqueue(encoder.encode("event: connected\ndata: {\"version\":1}\n\n"));
                    });
                },
            }),
        }) as Response);

        vi.stubGlobal("fetch", fetchMock);
        stopSharedRealtime("logout");
        startSharedRealtime();
        startSharedRealtime();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const unsubscribe = subscribeToRealtimeEvents(listener);
        controller?.enqueue(encoder.encode("event: connected\ndata: {\"version\":2}\n\n"));

        await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
        unsubscribe();

        controller?.enqueue(encoder.encode("event: connected\ndata: {\"version\":3}\n\n"));
        await Promise.resolve();
        expect(listener).toHaveBeenCalledTimes(1);

        useAuthStore.setState({ token: "token-b" });
        stopSharedRealtime("logout");
        startSharedRealtime();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const secondRequest = fetchMock.mock.calls.at(1) as [RequestInfo | URL, RequestInit?] | undefined;
        expect(secondRequest?.[1]).toMatchObject({
            headers: expect.objectContaining({ Authorization: "Bearer token-b" }),
        });
    });
});
