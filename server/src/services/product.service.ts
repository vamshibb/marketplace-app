import { Prisma } from "../generated/prisma";
import * as productRepository from "../repositories/product.repository";

export const getAllProducts = async (
  page: number,
  limit: number,
  search?: string,
  minPrice?: number,
  maxPrice?: number,
  sort?: string,
  category?: string
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (
    minPrice !== undefined ||
    maxPrice !== undefined
  ) {
    where.price = {};

    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }

  if (category) {
    where.category = {
      slug: category,
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
      ? { price: "desc" }
      : sort === "oldest"
      ? { createdAt: "asc" }
      : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    productRepository.findProducts({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    productRepository.countProducts(where),
  ]);

  return {
    products,
    total,
  };
};

export const findProductById = (id: string) => {
  return productRepository.findProductById(id);
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