import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { ordersQueryKeys } from "../queryKeys";
import { useAvailabilityStream } from "./useAvailabilityStream";

class TestEventSource extends EventTarget {
  static instances: TestEventSource[] = [];
  readonly url: string;
  close = vi.fn();

  constructor(url: string) {
    super();
    this.url = url;
    TestEventSource.instances.push(this);
  }
}

beforeEach(() => {
  TestEventSource.instances = [];
  vi.stubGlobal("EventSource", TestEventSource);
});

it("invalidates only the streamed product's availability root across date ranges", () => {
  const client = createTestQueryClient();
  const affected = [
    ordersQueryKeys.availabilityRoot("product-a"),
    ordersQueryKeys.availability("product-a", "2026-10-10", "2026-10-12"),
    ordersQueryKeys.availability("product-a", "2026-11-01", "2026-11-30"),
  ];
  const unrelated = [
    ordersQueryKeys.availability("product-b", "2026-10-10", "2026-10-12"),
    ordersQueryKeys.detail("user", "order"),
  ];
  for (const key of [...affected, ...unrelated]) client.setQueryData(key, { available: true });
  renderHook(() => useAvailabilityStream("product-a", true), { wrapper: queryWrapper(client) });
  expect(TestEventSource.instances).toHaveLength(1);
  const stream = TestEventSource.instances[0];
  expect(stream.url).toBe("http://localhost:3000/api/products/product-a/availability/stream");
  act(() => { stream.dispatchEvent(new Event("availability_changed")); });
  for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});

it("removes its listener and closes the stream on cleanup", () => {
  const client = createTestQueryClient();
  const key = ordersQueryKeys.availabilityRoot("product-a");
  client.setQueryData(key, {});
  const { unmount } = renderHook(() => useAvailabilityStream("product-a", true), { wrapper: queryWrapper(client) });
  const stream = TestEventSource.instances[0];

  unmount();

  expect(stream.close).toHaveBeenCalledOnce();
  // EventTarget still dispatches after close: only listener removal prevents invalidation.
  stream.dispatchEvent(new Event("availability_changed"));
  expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});

it("does not open a stream while availability is disabled", () => {
  renderHook(() => useAvailabilityStream("product-a", false), { wrapper: queryWrapper(createTestQueryClient()) });
  expect(TestEventSource.instances).toHaveLength(0);
});
