import * as categoryRepository from "../repositories/category.repository";

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
