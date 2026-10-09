import { Prisma } from "../generated/prisma";
import { normalizeTransactionConflict } from "../utils/transactionConflict";
import { prisma } from "../prisma/client";
import { findOverlappingAvailabilityBlocks, findOverlappingRentalReservations } from "./rentalInventory.repository";

const productSelect = { id: true, sellerId: true, listingType: true, quantityAvailable: true } satisfies Prisma.ProductSelect;
export const findBlockProduct = (id: string) => prisma.product.findUnique({ where: { id }, select: productSelect });
export const listBlocks = (productId: string) => prisma.availabilityBlock.findMany({
  where: { productId }, orderBy: [{ blockedFrom: "asc" }, { createdAt: "asc" }],
});
export const deleteBlock = (productId: string, id: string, sellerId: string) => prisma.availabilityBlock.deleteMany({
  where: { id, productId, product: { sellerId } },
});

type Snapshot = {
  product: Awaited<ReturnType<typeof findBlockProduct>>;
  reservations: Awaited<ReturnType<typeof findOverlappingRentalReservations>>;
  blocks: Awaited<ReturnType<typeof findOverlappingAvailabilityBlocks>>;
};

// The service validates a transaction snapshot before the repository writes.
// Both this path and rental acceptance read both capacity predicates at Serializable.
export const createBlockAtomically = async (
  data: Prisma.AvailabilityBlockUncheckedCreateInput,
  validate: (snapshot: Snapshot) => void,
) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async tx => {
        const product = await tx.product.findUnique({ where: { id: data.productId }, select: productSelect });
        const from = new Date(data.blockedFrom);
        const to = new Date(data.blockedTo);
        const reservations = await findOverlappingRentalReservations(data.productId, from, to, tx);
        const blocks = await findOverlappingAvailabilityBlocks(data.productId, from, to, tx);
        validate({ product, reservations, blocks });
        return tx.availabilityBlock.create({ data });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 15_000,
      });
    } catch (caught) {
      const error = normalizeTransactionConflict(caught);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
};
