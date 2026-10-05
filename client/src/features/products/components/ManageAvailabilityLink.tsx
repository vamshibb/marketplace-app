import { Link } from "react-router-dom";
import type { ProductSummary } from "../types";

export const ManageAvailabilityLink = ({ product, userId }: { product: ProductSummary; userId: string | undefined }) => {
  if (product.listingType !== "RENT" || product.sellerId !== userId) return null;
  return <Link to={`/products/${product.id}/manage-availability`} className="inline-flex min-h-11 items-center rounded text-sm font-semibold text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">Manage Availability<span className="sr-only"> for {product.title}</span></Link>;
};
