import * as categoryRepository from "../repositories/category.repository";

type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  isLeaf: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeNode[];
};

export const getAllCategories = () => {
  return categoryRepository.findAllCategories();
};

export const getCategoryById = (id: string) => {
  return categoryRepository.findCategoryById(id);
};

export const getCategoryBySlug = (slug: string) => {
  return categoryRepository.findCategoryBySlug(slug);
};

export const createCategory = (data: {
  name: string;
  slug: string;
}) => {
  return categoryRepository.createCategory(data);
};

export const updateCategory = (
  id: string,
  data: Partial<{
    name: string;
    slug: string;
  }>
) => {
  return categoryRepository.updateCategory(id, data);
};

export const deleteCategory = (id: string) => {
  return categoryRepository.deleteCategory(id);
};

export const getCategoryTree = async () => {
  const categories =
    await categoryRepository.findAllCategoriesForTree();

  const categoryMap = new Map<
    string,
    CategoryTreeNode
  >();

  const rootCategories: CategoryTreeNode[] = [];

  // Step 1: Create a map
  categories.forEach((category) => {
    categoryMap.set(category.id, {
      ...category,
      children: [],
    });
  });

  // Step 2: Build the tree
  categoryMap.forEach((category) => {
    if (!category.parentId) {
      rootCategories.push(category);
      return;
    }

    const parent =
      categoryMap.get(category.parentId);

    if (parent) {
      parent.children.push(category);
    }
  });

  return rootCategories;
};