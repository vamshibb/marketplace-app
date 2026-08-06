import { prisma } from "../prisma/client";
import { Prisma } from "../generated/prisma";

export const findAllCategories = () => {
    return prisma.category.findMany({
        orderBy: {
            name: "asc",
        },
    });
};

export const findCategoryById = (id: string) => {
    return prisma.category.findUnique({
        where: { id },
    });
};

export const findCategoryBySlug = (slug: string) => {
    return prisma.category.findUnique({
        where: { slug },
    });
};

export const createCategory = (data: {
    name: string;
    slug: string;
}) => {
    return prisma.category.create({
        data,
    });
};

export const updateCategory = (
  id: string,
  data: Prisma.CategoryUpdateInput
) => {
  return prisma.category.update({
    where: { id },
    data,
  });
};

export const deleteCategory = (id: string) => {
    return prisma.category.delete({
        where: { id },
    });
};

export const findAllCategoriesForTree = () => {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
};