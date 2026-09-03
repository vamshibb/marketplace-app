import { Link } from "react-router-dom";

import type { ProductSummary } from "../types";
import { ProductGallery } from "./ProductGallery";

interface ProductCardProps {
  product: ProductSummary;
}

export const ProductCard = ({ product }: ProductCardProps) => (
  <article className="flex min-h-[260px] flex-col gap-4 rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md">
    <ProductGallery media={product.media} />
    <h2 className="text-lg font-semibold">{product.title}</h2>
    <p className="line-clamp-3">{product.description}</p>
    <p className="text-sm text-gray-600">Listed by: {product.seller.email}</p>
    <div className="mt-auto flex items-center justify-between">
    <p className="font-semibold">
      ${product.price.toLocaleString()}
    </p>
    <Link to={`/products/${product.id}`}
    className="font-medium">View Details →</Link>
    </div>
  </article>
);
