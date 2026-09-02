import type { ChangeEvent } from "react";

import type { ProductSort } from "../types";

interface SortSelectProps {
  value: ProductSort;
  onChange: (value: ProductSort) => void;
}

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange(event.target.value as ProductSort);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="product-sort">Sort by</label>
      <select
        id="product-sort"
        className="rounded-lg border px-4 py-3"
        value={value}
        onChange={handleChange}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
};
