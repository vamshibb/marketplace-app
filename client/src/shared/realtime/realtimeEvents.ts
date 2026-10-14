import { env } from "../../app/config/env";
import { useAuthStore } from "../../features/auth/hooks/useAuthStore";
import {
  createAuthenticatedRealtimeClient,
  type RealtimeAbortReason,
} from "./authenticatedSse";

export type RealtimeEventHandler = (
  eventName: string,
  data: unknown,
) => void;

const subscribers = new Set<RealtimeEventHandler>();

let activeClient:
  | ReturnType<typeof createAuthenticatedRealtimeClient>
  | null = null;

const dispatch = (eventName: string, data: unknown) => {
  for (const subscriber of subscribers) {
    try {
      subscriber(eventName, data);
    } catch {
      // Keep the transport alive and continue notifying other subscribers.
    }
  }
};

export const subscribeToRealtimeEvents = (
  listener: RealtimeEventHandler,
) => {
  subscribers.add(listener);

  return () => {
    subscribers.delete(listener);
  };
};

export const startSharedRealtime = () => {
  if (activeClient) {
    return;
  }

  const token = useAuthStore.getState().token;
  if (!token) {
    return;
  }

  activeClient = createAuthenticatedRealtimeClient({
    url: `${env.apiBaseUrl.replace(/\/+$/, "")}/realtime/stream`,
    getToken: () => useAuthStore.getState().token,
    onEvent: (eventName, data) => {
      dispatch(eventName, data);
    },
    onError: () => undefined,
    onAbort: () => undefined,
  });

  activeClient.start();
};

export const stopSharedRealtime = (
  reason: RealtimeAbortReason = "logout",
) => {
  if (!activeClient) {
    return;
  }

  const client = activeClient;
  activeClient = null;
  client.abort(reason);
};