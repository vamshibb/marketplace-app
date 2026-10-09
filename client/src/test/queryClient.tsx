import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren, ReactElement } from "react";
import { afterEach } from "vitest";

const clients = new Set<QueryClient>();
afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
});

// Fresh caches and no retries keep failures deterministic and tests independent.
export const createTestQueryClient = (): QueryClient => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.add(client);
  return client;
};

export const queryWrapper = (client: QueryClient) =>
  function TestQueryProvider({ children }: PropsWithChildren): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
