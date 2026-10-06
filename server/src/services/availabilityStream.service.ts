import type { Response } from "express";
import { findProductInventory } from "../repositories/product.repository";
import { AppError } from "../errors/AppError";
import { subscribe } from "../utils/availabilityPublisher";

export const openAvailabilityStream = async (
  productId: string,
  response: Response
): Promise<void> => {
  const product = await findProductInventory(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.listingType !== "RENT") {
    throw new AppError(
      "Availability is only available for rental listings.",
      400
    );
  }

  subscribe(productId, response);
};