import { Link } from "react-router-dom";

import type { Product } from "../types/product";

type Props = {
  product: Product;
};

function ProductCard({
  product,
}: Props) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800"
    >
      <img
        src={
          product.image ||
          "https://placehold.co/600x400"
        }
        alt={product.title}
        className="w-full h-52 object-cover"
      />

      <div className="p-4">
        <h2 className="text-xl font-bold">
          {product.title}
        </h2>

        <p className="text-zinc-400 mt-2 line-clamp-2">
          {product.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold">
            ${product.price}
          </span>

          <span className="text-sm text-zinc-500">
            {product.seller.email}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;