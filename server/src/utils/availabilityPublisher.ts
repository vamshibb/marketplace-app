import type { Response } from "express";

export type AvailabilityChangeReason =
  | "RENTAL_ACCEPTED"
  | "RENTAL_COMPLETED"
  | "BLOCK_CREATED"
  | "BLOCK_DELETED";

export const createAvailabilityPublisher = (heartbeatMs = 25_000) => {
  // This works per Node process. Multi-instance deployment would require a shared
  // pub/sub transport such as Redis/Postgres LISTEN-NOTIFY.
  const subscribers = new Map<string, Set<Response>>();
  const cleanups = new WeakMap<Response, () => void>();

  const unsubscribe = (productId: string, response: Response): void => {
    if (!subscribers.get(productId)?.has(response)) return;
    cleanups.get(response)?.();
  };

  const disconnect = (productId: string, response: Response): void => {
    unsubscribe(productId, response);

    if (!response.destroyed) {
      response.destroy();
    }
  };

  // Availability events are invalidation signals, not authoritative state.
  // If a client is dead or too slow, disconnect it so EventSource can reconnect
  // and the client can refetch the latest availability.
  const send = (
    productId: string,
    response: Response,
    frame: string
  ): void => {
    try {
      if (response.destroyed || response.writableEnded) {
        disconnect(productId, response);
        return;
      }

      const accepted = response.write(frame);

      if (!accepted) {
        disconnect(productId, response);
      }
    } catch {
      disconnect(productId, response);
    }
  };

  const subscribe = (productId: string, response: Response): void => {
    if (
      response.destroyed ||
      response.writableEnded ||
      response.req.aborted
    ) {
      return;
    }

    if (cleanups.has(response)) return;

    const group = subscribers.get(productId) ?? new Set<Response>();

    group.add(response);
    subscribers.set(productId, group);

    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }

      group.delete(response);

      if (group.size === 0) {
        subscribers.delete(productId);
      }

      cleanups.delete(response);

      response.off("close", cleanup);
      response.off("finish", cleanup);
      response.off("error", onError);
      response.req.off("aborted", onError);
      response.req.off("error", onError);
    };

    const onError = () => {
      disconnect(productId, response);
    };

    cleanups.set(response, cleanup);

    // Response close tracks the connection; request close may just mean
    // GET request parsing finished.
    response.once("close", cleanup);
    response.once("finish", cleanup);
    response.once("error", onError);
    response.req.once("aborted", onError);
    response.req.once("error", onError);

    try {
      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.setHeader("X-Accel-Buffering", "no");

      response.flushHeaders?.();

      send(
        productId,
        response,
        `retry: 5000\nevent: connected\ndata: ${JSON.stringify({
          productId,
        })}\n\n`
      );

      if (cleanups.has(response)) {
        heartbeat = setInterval(
          () => send(productId, response, ": heartbeat\n\n"),
          heartbeatMs
        );

        heartbeat.unref();
      }
    } catch {
      disconnect(productId, response);
    }
  };

  const publishAvailabilityChanged = (
    productId: string,
    reason: AvailabilityChangeReason
  ): void => {
    const frame =
      `event: availability_changed\n` +
      `data: ${JSON.stringify({ productId, reason })}\n\n`;

    for (const response of subscribers.get(productId) ?? []) {
      send(productId, response, frame);
    }
  };

  return {
    subscribe,
    unsubscribe,
    publishAvailabilityChanged,
  };
};

export const {
  subscribe,
  unsubscribe,
  publishAvailabilityChanged,
} = createAvailabilityPublisher();