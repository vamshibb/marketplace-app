import type { ChangeEvent } from "react";

import { useCategoriesQuery } from "../../categories/hooks/useCategoriesQuery";

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const CategoryFilter = ({ value, onChange }: CategoryFilterProps) => {
  const categoriesQuery = useCategoriesQuery();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange(event.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="product-category">Category</label>
      <select
        id="product-category"
        className="rounded-lg border px-4 py-3"
        value={value}
        disabled={categoriesQuery.isPending || categoriesQuery.isError}
        onChange={handleChange}
      >
        {categoriesQuery.isPending ? (
          <option value="">Loading categories...</option>
        ) : categoriesQuery.isError ? (
          <option value="">Unable to load categories</option>
        ) : (
          <>
            <option value="">All Categories</option>
            {categoriesQuery.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
};
