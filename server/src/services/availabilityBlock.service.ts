import { Prisma } from "../generated/prisma";
import * as repository from "../repositories/availabilityBlock.repository";
import { AppError } from "../errors/AppError";
import { toAvailabilityBlockDTO } from "../dto/availabilityBlock.dto";
import { createAvailabilityBlockSchema, type CreateAvailabilityBlock } from "../validators/availabilityBlock.validator";
import { calculateRentalAvailability } from "../utils/rentalAvailability";

const ensureOwner = (product: Awaited<ReturnType<typeof repository.findBlockProduct>>, userId: string) => {
  if (!product) throw new AppError("Product not found", 404);
  if (product.sellerId !== userId) throw new AppError("Only the product owner can manage availability blocks.", 403);
  return product;
};
const ensureRental = (product: { listingType: string }) => {
  if (product.listingType !== "RENT") throw new AppError("Availability blocks are only available for rental listings.", 400);
};
export const createBlock = async (productId: string, userId: string, input: CreateAvailabilityBlock) => {
  const data = createAvailabilityBlockSchema.parse(input);
  const blockedFrom = new Date(`${data.blockedFrom}T00:00:00.000Z`);
  const blockedTo = new Date(`${data.blockedTo}T00:00:00.000Z`);
  try {
    const block = await repository.createBlockAtomically({ ...data, productId, blockedFrom, blockedTo }, snapshot => {
      const product = ensureOwner(snapshot.product, userId);
      ensureRental(product);
      if (data.quantity > product.quantityAvailable) throw new AppError("Block quantity exceeds product inventory.", 400);
      const days = calculateRentalAvailability(product.quantityAvailable, blockedFrom, blockedTo, snapshot.reservations, snapshot.blocks);
      if (days.some(day => day.availableQuantity < data.quantity)) {
        throw new AppError("Requested availability block exceeds available rental capacity.", 409);
      }
    });
    return toAvailabilityBlockDTO(block);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError("Availability changed concurrently. Please refresh and try again.", 409);
    }
    throw error;
  }
};
export const getBlocks = async (productId: string, userId: string) => {
  const product = ensureOwner(await repository.findBlockProduct(productId), userId);
  ensureRental(product);
  return (await repository.listBlocks(productId)).map(toAvailabilityBlockDTO);
};
export const deleteBlock = async (productId: string, blockId: string, userId: string) => {
  ensureOwner(await repository.findBlockProduct(productId), userId);
  const result = await repository.deleteBlock(productId, blockId, userId);
  if (!result.count) throw new AppError("Availability block not found", 404);
};
