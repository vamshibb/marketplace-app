import * as productRepository from "../repositories/product.repository";
import * as orderRepository from "../repositories/order.repository";
import { AppError } from "../errors/AppError";
import type { ProductAvailabilityDTO } from "../dto/availability.dto";
import type { AvailabilityQuery } from "../validators/availability.validator";
import { calculateRentalAvailability } from "./rentalAvailability";

export const getProductAvailability = async (
  productId: string, query: AvailabilityQuery,
): Promise<ProductAvailabilityDTO> => {
  const product = await productRepository.findProductInventory(productId);
  if (!product) throw new AppError("Product not found", 404);
  if (product.listingType !== "RENT") {
    throw new AppError("Availability is only available for rental listings.", 400);
  }
  const from = new Date(`${query.from}T00:00:00.000Z`);
  const to = new Date(`${query.to}T00:00:00.000Z`);
  const reservations = await orderRepository.findOverlappingRentalReservations(productId, from, to);
  return {
    productId: product.id,
    from: query.from,
    to: query.to,
    quantityAvailable: product.quantityAvailable,
    days: calculateRentalAvailability(product.quantityAvailable, from, to, reservations),
  };
};
