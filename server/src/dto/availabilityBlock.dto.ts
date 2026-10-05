import type { AvailabilityBlock } from "../generated/prisma";

export const toAvailabilityBlockDTO = (block: AvailabilityBlock) => ({
  id: block.id,
  productId: block.productId,
  blockedFrom: block.blockedFrom.toISOString().slice(0, 10),
  blockedTo: block.blockedTo.toISOString().slice(0, 10),
  quantity: block.quantity,
  reason: block.reason,
  createdAt: block.createdAt,
  updatedAt: block.updatedAt,
});
