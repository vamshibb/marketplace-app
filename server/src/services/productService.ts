import { prisma } from "../prisma/client";


export const getAllProducts = async (
  page: number,
  limit: number
) => {
  const skip =
    (page - 1) * limit;

  const [products, total] =
    await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,

        include: {
          seller: {
            select: {
              id: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.product.count(),
    ]);

  return {
    products,
    total,
  };
};

export const findProductById = (
  id: string
) => {
  return prisma.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          email: true,
        },
      },
    },
  });
};

export const createProduct = (
  data: {
    title: string;
    description: string;
    price: number;
    image?: string;
    sellerId: string;
  }
) => {
  return prisma.product.create({
    data,
  });
};

export const updateProduct = (
  id: string,
  data: any
) => {
  return prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = (
  id: string
) => {
  return prisma.product.delete({
    where: { id },
  });
};