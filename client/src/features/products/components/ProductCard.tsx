import { ArrowRight, Heart, UserRound } from "lucide-react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import type { ProductSummary } from "../types";
import { ProductGallery } from "./ProductGallery";

interface ProductCardProps {
  product: ProductSummary;
}

export const ProductCard = ({ product }: ProductCardProps): ReactElement => (
  <article className="@container flex h-full w-full max-w-[320px] min-w-0 flex-col justify-self-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.07)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)] motion-reduce:transform-none motion-reduce:transition-none">
    <div className="relative shrink-0 overflow-hidden bg-gray-50 [&>div]:aspect-[2.2/1] [&>div]:rounded-none [&>div>div]:rounded-none [&>div>div]:border-0 [&>div>div]:text-xs [&>div>div]:text-slate-500">
      <ProductGallery media={product.media} />
      {product.category && (
        <span className="absolute top-3 left-3 max-w-[calc(100%-5rem)] truncate rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
          {product.category.name}
        </span>
      )}
      <button
        type="button"
        disabled
        aria-label="Wishlist unavailable"
        title="Wishlist unavailable"
        className="absolute top-2 right-2 flex size-11 cursor-not-allowed items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
      >
        <Heart className="size-5" aria-hidden="true" />
      </button>
    </div>

    <div className="flex flex-1 flex-col gap-1.5 px-4 py-2.5">
      <h2 title={product.title} className="truncate text-xl leading-7 font-bold tracking-tight text-gray-950 @sm:text-2xl">
        {product.title}
      </h2>
      <p className="line-clamp-2 h-10 text-sm leading-5 wrap-anywhere text-slate-600">
        {product.description}
      </p>
      <div className="mt-auto flex min-w-0 items-center gap-2.5 pt-0.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-800">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p title={product.seller.email} className="truncate text-sm leading-5 text-slate-600">
            <span className="sr-only">Listed by: </span>
            {product.seller.email}
          </p>
          <p className="text-xs leading-4 text-slate-500">Seller</p>
        </div>
      </div>
    </div>

    <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-1.5">
      <p title={`$${product.price.toLocaleString()}`} className="min-w-0 truncate text-lg leading-6 font-semibold tracking-tight text-gray-950 @sm:text-xl">
        ${product.price.toLocaleString()}
      </p>
      <Link
        to={`/products/${product.id}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md text-sm leading-none font-semibold text-blue-600 transition-colors hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 motion-reduce:transition-none"
      >
        View Details
        <span className="sr-only"> for {product.title}</span>
        <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
      </Link>
    </footer>
  </article>
);
