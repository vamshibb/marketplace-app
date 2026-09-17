import { Plus } from "lucide-react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { ProductCard } from "../components/ProductCard";
import { useMyProductsQuery } from "../hooks/useMyProductsQuery";

const addProductClassName = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export const MyProductsPage = (): ReactElement => {
  const productsQuery = useMyProductsQuery();

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">My Products</h1>
        <Link to="/products/create" className={addProductClassName}>
          <Plus className="size-4" aria-hidden="true" /> Add Product
        </Link>
      </header>
      {productsQuery.isPending ? (
        <p role="status">Loading your products...</p>
      ) : productsQuery.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-red-600">{productsQuery.error.message || "Unable to load your products."}</p>
          <button type="button" onClick={() => void productsQuery.refetch()} disabled={productsQuery.isFetching} className="rounded text-sm font-semibold text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
            {productsQuery.isFetching ? "Retrying..." : "Try again"}
          </button>
        </div>
      ) : productsQuery.data.length === 0 ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-600">You haven't listed anything yet.</p>
          <Link to="/products/create" className={addProductClassName}>Add your first product</Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          {productsQuery.data.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  );
};
