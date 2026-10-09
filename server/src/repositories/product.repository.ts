import { userSummarySelect } from "./user.select";
import { prisma } from "../prisma/client";
import { Prisma } from "../generated/prisma";
import { normalizeTransactionConflict } from "../utils/transactionConflict";
import { findRentalReservations, findAvailabilityBlocks } from "./rentalInventory.repository";

export const productSummaryInclude = {
  seller: {
    select: userSummarySelect,
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
} satisfies Prisma.ProductInclude;

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
  filters: ProductFilters,
  sellerId?: string
) => {
  const where: Prisma.ProductWhereInput = {};
  if (sellerId !== undefined) {
    where.sellerId = sellerId;
  }

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
      include: productSummaryInclude,
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
        select: userSummarySelect,
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
            select: userSummarySelect,
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

type ProductEditSnapshot = {
  product: Awaited<ReturnType<typeof prisma.product.findUnique>>;
  reservations: Awaited<ReturnType<typeof findRentalReservations>>;
  blocks: Awaited<ReturnType<typeof findAvailabilityBlocks>>;
  hasPendingRental: boolean;
};

export const updateProductAtomically = async (
  id: string,
  data: Prisma.ProductUncheckedUpdateInput,
  validate: (snapshot: ProductEditSnapshot) => void,
) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async tx => {
        const product = await tx.product.findUnique({ where: { id } });
        const converting = product?.listingType === "RENT" && data.listingType === "SALE";
        const reducing = product?.listingType === "RENT" && typeof data.quantityAvailable === "number" &&
          data.quantityAvailable < product.quantityAvailable;
        const reservations = converting || reducing ? await findRentalReservations(id, tx) : [];
        const blocks = converting || reducing ? await findAvailabilityBlocks(id, tx) : [];
        const pending = converting ? await tx.order.findFirst({
          where: { productId: id, transactionType: "RENT", status: "PENDING" }, select: { id: true },
        }) : null;
        validate({ product, reservations, blocks, hasPendingRental: Boolean(pending) });
        return tx.product.update({ where: { id }, data });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 15_000,
      });
    } catch (caught) {
      const error = normalizeTransactionConflict(caught);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
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
export const findProductInventory = (id: string) => prisma.product.findUnique({
  where: { id },
  select: { id: true, listingType: true, quantityAvailable: true },
});
