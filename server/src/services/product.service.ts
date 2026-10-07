import { z } from "zod";
import { rentalSettingsSchema, updateProductSchema } from "../validators/productValidators";
import {
  Prisma,
  ProductMedia,
} from "../generated/prisma";
import { toProductMediaDto } from "../dto/productMedia.dto";
import { AppError } from "../errors/AppError";
import * as productRepository from "../repositories/product.repository";
import * as categoryService from "./category.service";
import { peakRentalCapacity } from "../utils/rentalAvailability";

const withMediaDto = <T extends { media: ProductMedia[] }>(
  product: T
) => ({
  ...product,
  media: product.media.map(toProductMediaDto),
});

const findProductOrThrow = async (
  id: string
) => {
  const product = await productRepository.findProductById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

const validateProductOwnership = async (
  id: string,
  userId: string
) => {
  const product = await findProductOrThrow(id);

  if (product.sellerId !== userId) {
    throw new AppError(
      "You are not authorized to modify this product.",
      403
    );
  }
  return product;
};

const listProducts = async (
  filters: productRepository.ProductFilters,
  sellerId?: string
) => {
  const { products, total } =
    await productRepository.findProducts(filters, sellerId);

  return {
    products: products.map(withMediaDto),
    total,
  };
};

export const getAllProducts = (
  filters: productRepository.ProductFilters
) => listProducts(filters);

export const getMyProducts = async (
  userId: string,
  filters: productRepository.ProductFilters
) => {
  if (!userId) throw new AppError("Unauthorized", 401);
  return listProducts(filters, userId);
};

export const findProductById = async (
  id: string
) => {
  const product = await findProductOrThrow(id);

  const reviewCount =
    product.reviews.length;

  const averageRating =
    reviewCount === 0
      ? 0
      : product.reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        ) / reviewCount;

  return {
    ...withMediaDto(product),
    reviewCount,
    averageRating: Number(
      averageRating.toFixed(1)
    ),
  };
};

export const createProduct = async (
  data: Prisma.ProductUncheckedCreateInput
) => {
  if (typeof data.categoryId === "string") {
    await categoryService.ensureCategoryExistsById(data.categoryId, 400);
  }

  return productRepository.createProduct(data);
};

export const updateProduct = async (
  id: string,
  data: z.infer<typeof updateProductSchema>,
  userId: string
) => {
  const parsed = updateProductSchema.parse(data);
  try {
    return await productRepository.updateProductAtomically(id, parsed, snapshot => {
      const current = snapshot.product;
      if (!current) throw new AppError("Product not found", 404);
      if (current.sellerId !== userId) throw new AppError("You are not authorized to modify this product.", 403);
      const settings = rentalSettingsSchema.safeParse({
        listingType: parsed.listingType ?? current.listingType,
        minRentalDays: parsed.minRentalDays === undefined ? current.minRentalDays : parsed.minRentalDays,
        maxRentalDays: parsed.maxRentalDays === undefined ? current.maxRentalDays : parsed.maxRentalDays,
      });
      if (!settings.success) throw new AppError(settings.error.issues[0].message, 400);
      if (current.listingType !== "RENT") return;
      if (parsed.listingType === "SALE" && (snapshot.hasPendingRental || snapshot.reservations.length || snapshot.blocks.length)) {
        throw new AppError("Cannot change this rental listing to SALE while pending rental requests, committed rentals, or availability blocks exist.", 409);
      }
      if (parsed.quantityAvailable !== undefined && parsed.quantityAvailable < current.quantityAvailable &&
          parsed.quantityAvailable < peakRentalCapacity(snapshot.reservations, snapshot.blocks)) {
        throw new AppError("Cannot reduce rental quantity below capacity consumed by committed rentals and availability blocks.", 409);
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError("Rental state changed concurrently. Please refresh and try again.", 409);
    }
    throw error;
  }
};

export const deleteProduct = async (
  id: string,
  userId: string
) => {
  await validateProductOwnership(id, userId);

  return productRepository.deleteProduct(id);
};
