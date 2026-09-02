import { useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { SearchBar } from "../components/SearchBar";
import { useProductsQuery } from "../hooks/useProductsQuery";
import type { ProductFilters } from "../types";

export const ProductsPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const filters: ProductFilters = {
    search: debouncedSearch.trim() || undefined,
    page,
  };
  const productsQuery = useProductsQuery(filters);

  const handleSearchChange = (value: string): void => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <SearchBar value={search} onChange={handleSearchChange} />

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
