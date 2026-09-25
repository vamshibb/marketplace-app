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
  const current = await validateProductOwnership(id, userId);
  const parsed = updateProductSchema.parse(data);
  const settings = rentalSettingsSchema.safeParse({
    listingType: parsed.listingType ?? current.listingType,
    minRentalDays: parsed.minRentalDays === undefined ? current.minRentalDays : parsed.minRentalDays,
    maxRentalDays: parsed.maxRentalDays === undefined ? current.maxRentalDays : parsed.maxRentalDays,
  });
  if (!settings.success) throw new AppError(settings.error.issues[0].message, 400);
  return productRepository.updateProduct(id, parsed);
};

export const deleteProduct = async (
  id: string,
  userId: string
) => {
  await validateProductOwnership(id, userId);

  return productRepository.deleteProduct(id);
};
