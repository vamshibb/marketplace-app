import { Link } from "react-router-dom";

import type { Listing } from "../types/listing";

type Props = {
  listing: Listing;
};

function ListingCard({ listing }: Props) {
  return (
    <Link
      to={`/products/${listing.id}`}
      className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800"
    >
      <img
        src={
          listing.image ||
          "https://placehold.co/600x400"
        }
        alt={listing.title}
        className="w-full h-52 object-cover"
      />

      <div className="p-4">
        <h2 className="text-xl font-bold">
          {listing.title}
        </h2>

        <p className="text-zinc-400 mt-2 line-clamp-2">
          {listing.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold">
            ${listing.price}
          </span>

          <span className="text-sm text-zinc-500">
            {listing.seller?.email ?? "Unknown Seller"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ListingCard;