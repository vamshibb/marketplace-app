import { useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { CategoryFilter } from "../components/CategoryFilter";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { SearchBar } from "../components/SearchBar";
import { SortSelect } from "../components/SortSelect";
import { useProductsQuery } from "../hooks/useProductsQuery";
import type { ProductFilters, ProductSort } from "../types";

export const ProductsPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ProductSort>("newest");
  const [categoryId, setCategoryId] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const filters: ProductFilters = {
    search: debouncedSearch.trim() || undefined,
    page,
    sort: sort === "newest" ? undefined : sort,
    categoryId: categoryId || undefined,
  };
  const productsQuery = useProductsQuery(filters);

  const handleSearchChange = (value: string): void => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (value: ProductSort): void => {
    setSort(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string): void => {
    setCategoryId(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>
        <CategoryFilter
          value={categoryId}
          onChange={handleCategoryChange}
        />
        <SortSelect value={sort} onChange={handleSortChange} />
      </div>

      {productsQuery.isPending ? (
        <p>Loading...</p>
      ) : productsQuery.isError ? (
        <p role="alert">{productsQuery.error.message}</p>
      ) : productsQuery.data.products.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {productsQuery.data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {productsQuery.data.pagination.totalPages > 1 && (
            <Pagination
              page={productsQuery.data.pagination.page}
              totalPages={productsQuery.data.pagination.totalPages}
              hasNext={productsQuery.data.pagination.hasNext}
              hasPrevious={productsQuery.data.pagination.hasPrevious}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
};
