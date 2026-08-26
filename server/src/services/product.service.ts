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
};

export const getAllProducts = async (
  filters: productRepository.ProductFilters
) => {
  const { products, total } =
    await productRepository.findProducts(filters);

  return {
    products: products.map(withMediaDto),
    total,
  };
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
  data: Prisma.ProductUncheckedUpdateInput,
  userId: string
) => {
  await validateProductOwnership(id, userId);

  return productRepository.updateProduct(id, data);
};

export const deleteProduct = async (
  id: string,
  userId: string
) => {
  await validateProductOwnership(id, userId);

  return productRepository.deleteProduct(id);
};
