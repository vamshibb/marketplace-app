import { prisma } from "../prisma/client";

export const getAllCategories =
  () => {
    return prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });
  };

export const getCategoryById = (
  id: string
) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

export const createCategory = (
  data: {
    name: string;
    slug: string;
  }
) => {
  return prisma.category.create({
    data,
  });
};

export const updateCategory = (
  id: string,
  data: any
) => {
  return prisma.category.update({
    where: { id },
    data,
  });
};

export const deleteCategory = (
  id: string
) => {
  return prisma.category.delete({
    where: { id },
  });
};