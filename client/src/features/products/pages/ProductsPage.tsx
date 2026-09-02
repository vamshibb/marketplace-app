import { useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { ProductCard } from "../components/ProductCard";
import { SearchBar } from "../components/SearchBar";
import { useProductsQuery } from "../hooks/useProductsQuery";

export const ProductsPage = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const productsQuery = useProductsQuery({
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-6">
      <SearchBar value={search} onChange={setSearch} />

      {productsQuery.isPending ? (
        <p>Loading...</p>
      ) : productsQuery.isError ? (
        <p role="alert">{productsQuery.error.message}</p>
      ) : productsQuery.data.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productsQuery.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
