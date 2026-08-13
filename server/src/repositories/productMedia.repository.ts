import { prisma } from "../prisma/client";
import { Prisma } from "../generated/prisma";

export const createMedia = (
  data: Prisma.ProductMediaUncheckedCreateInput
) => {
  return prisma.productMedia.create({
    data,
  });
};

export const findMediaByProductId = (
  productId: string
) => {
  return prisma.productMedia.findMany({
    where: {
      productId,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });
};

export const findMediaById = (id: string) => {
  return prisma.productMedia.findUnique({
    where: {
      id,
    },
  });
};

export const updateMedia = (
  id: string,
  data: Prisma.ProductMediaUpdateInput
) => {
  return prisma.productMedia.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteMedia = (id: string) => {
  return prisma.productMedia.delete({
    where: {
      id,
    },
  });
};

export const countByProductId = (
  productId: string
) => {
  return prisma.productMedia.count({
    where: { productId },
  });
};

export const createManyMediaRecords = (
  data: Prisma.ProductMediaCreateManyInput[]
) => {
  return prisma.productMedia.createManyAndReturn({
    data,
  });
};

