import { LayoutGrid, List, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

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
    <div data-content-width="wide" className="w-full min-w-0 space-y-6">
      <header className="space-y-2 pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Marketplace</h1>
        <p className="text-sm leading-6 text-slate-500 sm:text-base">
          Discover amazing products from trusted sellers.
        </p>
      </header>

      <section aria-label="Search and filter products" className="grid items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,190px)_auto_auto] [&_input]:min-h-12 [&_input]:border-slate-200 [&_label]:text-xs [&_label]:font-medium [&_label]:text-slate-600 [&_select]:min-h-12 [&_select]:min-w-0 [&_select]:w-full [&_select]:border-slate-200 [&_select]:bg-white [&_select]:text-sm">
        <div className="min-w-0 space-y-1">
          <p aria-hidden="true" className="text-xs font-medium text-slate-600">Search</p>
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>
        <div className="min-w-0">
          <CategoryFilter
            value={categoryId}
            onChange={handleCategoryChange}
          />
        </div>
        <div className="min-w-0 [&>div]:flex-col [&>div]:items-stretch [&>div]:gap-1">
          <SortSelect value={sort} onChange={handleSortChange} />
        </div>
        <Link to="/products/create" className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <Plus className="size-4" aria-hidden="true" />
          Add Product
        </Link>
        <div role="group" aria-label="Product view" className="inline-flex h-12 items-center gap-1 justify-self-start rounded-lg border border-slate-200 bg-slate-50 p-1 md:col-span-2 md:justify-self-end lg:col-span-1">
          <button type="button" aria-pressed="true" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-blue-600 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <LayoutGrid className="size-4" aria-hidden="true" />
            Grid
          </button>
          <button type="button" disabled title="List view coming soon" aria-label="List view (coming soon)" className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-md px-3 text-sm text-slate-400">
            <List className="size-4" aria-hidden="true" />
            List
          </button>
        </div>
      </section>

      {productsQuery.isPending ? (
        <p>Loading...</p>
      ) : productsQuery.isError ? (
        <p role="alert">{productsQuery.error.message}</p>
      ) : productsQuery.data.products.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
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
