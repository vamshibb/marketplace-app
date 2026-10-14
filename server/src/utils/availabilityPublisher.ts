import { createScopedSsePublisher } from "./scopedSsePublisher";

export type AvailabilityChangeReason =
  | "RENTAL_ACCEPTED"
  | "RENTAL_COMPLETED"
  | "BLOCK_CREATED"
  | "BLOCK_DELETED";

export const createAvailabilityPublisher = (heartbeatMs = 25_000) => {
  const publisher = createScopedSsePublisher({ heartbeatMs, connectedData: productId => ({ productId }) });
  return {
    subscribe: publisher.subscribe,
    unsubscribe: publisher.unsubscribe,
    publishAvailabilityChanged: (productId: string, reason: AvailabilityChangeReason): void => {
      publisher.publish(productId, "availability_changed", { productId, reason });
    },
  };
};

export const { subscribe, unsubscribe, publishAvailabilityChanged } = createAvailabilityPublisher();
