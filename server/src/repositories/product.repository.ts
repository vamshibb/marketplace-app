import { prisma } from "../prisma/client";
import { Prisma } from "../generated/prisma";

export const findProducts = (options: {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput;
  skip: number;
  take: number;
}) => {
  return prisma.product.findMany({
    where: options.where,
    orderBy: options.orderBy,
    skip: options.skip,
    take: options.take,
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
  });
};

export const countProducts = (
  where: Prisma.ProductWhereInput
) => {
  return prisma.product.count({
    where,
  });
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