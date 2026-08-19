import {
  Prisma,
  ProductMedia,
} from "../generated/prisma";
import { toProductMediaDto } from "../dto/productMedia.dto";
import * as productRepository from "../repositories/product.repository";

const withMediaDto = <T extends { media: ProductMedia[] }>(
  product: T
) => ({
  ...product,
  media: product.media.map(toProductMediaDto),
});

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
  const product =
    await productRepository.findProductById(id);

  if (!product) {
    return null;
  }

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

export const createProduct = (
  data: Prisma.ProductUncheckedCreateInput
) => {
  return productRepository.createProduct(data);
};

export const updateProduct = (
  id: string,
  data: Prisma.ProductUncheckedUpdateInput
) => {
  return productRepository.updateProduct(id, data);
};

export const deleteProduct = (id: string) => {
  return productRepository.deleteProduct(id);
};