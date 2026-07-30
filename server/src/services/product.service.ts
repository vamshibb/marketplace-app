import { prisma } from "../prisma/client";


export const getAllProducts = async (
  page: number,
  limit: number,
  search?: string,
  minPrice?: number,
  maxPrice?: number,
  sort?: string,
  category?: string
) => {
  const skip =
    (page - 1) * limit;

  const where: any = {};

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
  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
      ? { price: "desc" as const }
      : sort === "oldest"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,

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
      },

      orderBy,
    }),

    prisma.product.count({
      where,
    }),
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

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
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
    categoryId?: string;
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