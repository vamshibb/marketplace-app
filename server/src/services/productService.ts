import { prisma } from "../prisma/client";

export const findProductById = (
  id: string
) => {
  return prisma.product.findUnique({
    where: { id },
  });
};