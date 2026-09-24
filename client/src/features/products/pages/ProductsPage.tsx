import { LayoutGrid, List, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { useAuthenticationGuard } from "../../auth";
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
  const [view, setView] = useState<"grid" | "list">("grid");
  const requireAuthentication = useAuthenticationGuard();
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(search, 300);
  const filters: ProductFilters = {
    limit: 12,
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
    <div data-content-width="wide" className="w-full min-w-0 space-y-6">
      <header aria-label="Search and filter products" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-nowrap [&_input]:h-10 [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_select]:h-10 [&_select]:min-w-0 [&_select]:w-full [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-2 [&_select]:py-2 [&_select]:text-sm">
        <div className="min-w-0 basis-full md:flex-1 md:basis-auto">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>
        <div className="min-w-0 flex-1 md:w-32 md:flex-none lg:w-40">
          <CategoryFilter
            value={categoryId}
            onChange={handleCategoryChange}
          />
        </div>
        <div className="min-w-0 flex-1 md:w-36 md:flex-none lg:w-44">
          <SortSelect value={sort} onChange={handleSortChange} />
        </div>
        <button type="button" onClick={() => requireAuthentication(() => navigate("/products/create"))} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <Plus className="size-4" aria-hidden="true" />
          Add Product
        </button>
        <div role="group" aria-label="Product view" className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-600 aria-pressed:bg-white aria-pressed:text-blue-600 aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <LayoutGrid className="size-4" aria-hidden="true" />
            Grid
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-600 aria-pressed:bg-white aria-pressed:text-blue-600 aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <List className="size-4" aria-hidden="true" />
            List
          </button>
        </div>
      </header>

      {productsQuery.isPending ? (
        <p>Loading...</p>
      ) : productsQuery.isError ? (
        <p role="alert">{productsQuery.error.message}</p>
      ) : productsQuery.data.products.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="space-y-8">
          <div className={view === "grid" ? "grid grid-cols-1 justify-items-center gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-4" : "grid grid-cols-1 justify-items-center gap-6"}>
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
