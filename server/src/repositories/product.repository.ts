import { prisma } from "../prisma/client";
import { Prisma } from "../generated/prisma";

export interface ProductFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

export const findProducts = async (
  filters: ProductFilters
) => {
  const where: Prisma.ProductWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        title: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    where.price = {
      gte: filters.minPrice,
      lte: filters.maxPrice,
    };
  }

  const skip = (filters.page - 1) * filters.limit;
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "oldest"
      ? { createdAt: "asc" }
      : filters.sort === "price_asc"
      ? { price: "asc" }
      : filters.sort === "price_desc"
      ? { price: "desc" }
      : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: filters.limit,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        media: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
};

export const findProductById = (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          email: true,
        },
      },

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      reviews: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      media: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });
};

export const createProduct = (
  data: Prisma.ProductUncheckedCreateInput
) => {
  return prisma.product.create({
    data,
  });
};

export const updateProduct = (
  id: string,
  data: Prisma.ProductUncheckedUpdateInput
) => {
  return prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = (id: string) => {
  return prisma.product.delete({
    where: { id },
  });
};

export const findProductOwner = (
  id: string
) => {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      sellerId: true,
    },
  });
};