import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { ProductCard } from "../components/ProductCard";
import { useFavoritesQuery } from "../hooks/useFavoritesQuery";

export const WishlistPage = (): ReactElement => {
  const favorites = useFavoritesQuery();

  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950">Wishlist</h1>
      {favorites.isPending ? (
        <p role="status">Loading your wishlist...</p>
      ) : favorites.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-red-600">Unable to load your wishlist.</p>
          <button type="button" disabled={favorites.isFetching} onClick={() => void favorites.refetch()} className="rounded font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">Try again</button>
        </div>
      ) : favorites.data.length === 0 ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-600">Your wishlist is empty.</p>
          <Link to="/products" className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Browse Products</Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          {favorites.data.map((favorite) => <ProductCard key={favorite.id} product={favorite.product} />)}
        </div>
      )}
    </div>
  );
};
