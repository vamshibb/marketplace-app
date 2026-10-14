import type { Response } from "express";

interface ScopedSseOptions {
  connectedData: (scopeId: string) => unknown;
  heartbeatMs?: number;
  cacheControl?: string;
}

export const createScopedSsePublisher = ({
  connectedData, heartbeatMs = 25_000, cacheControl = "no-cache, no-transform",
}: ScopedSseOptions) => {
  // This works per Node process. Multi-instance deployment would require a shared
  // pub/sub transport such as Redis/Postgres LISTEN-NOTIFY.
  const subscribers = new Map<string, Set<Response>>();
  const cleanups = new WeakMap<Response, () => void>();

  const unsubscribe = (scopeId: string, response: Response): void => {
    if (!subscribers.get(scopeId)?.has(response)) return;
    cleanups.get(response)?.();
  };

  const disconnect = (scopeId: string, response: Response): void => {
    unsubscribe(scopeId, response);

    try {
      if (!response.destroyed) response.destroy();
    } catch {
      // Cleanup already ran; a broken transport must not affect other clients.
    }
  };

  // Events are invalidation signals, not authoritative state.
  // If a client is dead or too slow, disconnect it so the consumer can reconnect
  // and the client can refetch the latest state.
  const send = (
    scopeId: string,
    response: Response,
    frame: string
  ): void => {
    try {
      if (response.destroyed || response.writableEnded) {
        disconnect(scopeId, response);
        return;
      }

      const accepted = response.write(frame);

      if (!accepted) {
        disconnect(scopeId, response);
      }
    } catch {
      disconnect(scopeId, response);
    }
  };

  const subscribe = (scopeId: string, response: Response): void => {
    if (
      response.destroyed ||
      response.writableEnded ||
      response.req.aborted
    ) {
      return;
    }

    if (cleanups.has(response)) return;

    const group = subscribers.get(scopeId) ?? new Set<Response>();

    group.add(response);
    subscribers.set(scopeId, group);

    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }

      group.delete(response);

      if (group.size === 0) {
        subscribers.delete(scopeId);
      }

      cleanups.delete(response);

      response.off("close", cleanup);
      response.off("finish", cleanup);
      response.off("error", onError);
      response.req.off("aborted", onError);
      response.req.off("error", onError);
    };

    const onError = () => {
      disconnect(scopeId, response);
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
      response.setHeader("Cache-Control", cacheControl);
      response.setHeader("Connection", "keep-alive");
      response.setHeader("X-Accel-Buffering", "no");

      response.flushHeaders?.();

      send(
        scopeId,
        response,
        `retry: 5000\nevent: connected\ndata: ${JSON.stringify(connectedData(scopeId))}\n\n`
      );

      if (cleanups.has(response)) {
        heartbeat = setInterval(
          () => send(scopeId, response, ": heartbeat\n\n"),
          heartbeatMs
        );

        heartbeat.unref();
      }
    } catch {
      disconnect(scopeId, response);
    }
  };

  const publish = (scopeId: string, event: string, data: unknown): void => {
    try {
      const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const response of subscribers.get(scopeId) ?? []) {
        send(scopeId, response, frame);
      }
    } catch {
      // Serialization/transport failures cannot undo a committed domain action.
    }
  };

  return { subscribe, unsubscribe, publish };
};
