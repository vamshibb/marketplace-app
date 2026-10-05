import { Link, useParams } from "react-router-dom";
import { useCurrentUserQuery } from "../../auth";
import { Button } from "../../../shared/ui/Button";
import { useProductQuery } from "../hooks/useProductQuery";
import { isAvailabilityForbidden } from "../hooks/useAvailabilityBlockMutations";
import { AvailabilityBlockManager } from "../components/AvailabilityBlockManager";

export const ManageAvailabilityPage = () => {
  const { productId } = useParams();
  const product = useProductQuery(productId);
  const user = useCurrentUserQuery();
  let content;
  if (product.isPending || user.isPending) content = <p role="status">Loading availability management...</p>;
  else if (isAvailabilityForbidden(product.error)) content = <p role="alert">You cannot manage this listing</p>;
  else if (product.isError || user.isError) content = <div role="alert" className="space-y-3"><p>Unable to load this listing.</p><Button variant="secondary" disabled={product.isFetching || user.isFetching} onClick={() => { void product.refetch(); void user.refetch(); }}>Retry</Button></div>;
  else if (product.data.sellerId !== user.data?.id) content = <p role="alert">You cannot manage this listing</p>;
  else if (product.data.listingType !== "RENT") content = <p role="alert">Availability management is only available for rental listings.</p>;
  else content = <AvailabilityBlockManager key={`${user.data.id}:${product.data.id}`} product={product.data} userId={user.data.id} />;
  return <div className="w-full max-w-6xl space-y-4">
    <header className="space-y-1">
      <Link to="/my-products" className="inline-flex min-h-8 items-center rounded text-sm font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">← Back to My Products</Link>
      <h1 className="text-2xl font-bold tracking-tight text-gray-950">Manage Availability</h1>
      {product.data && <><p className="font-medium wrap-anywhere text-slate-800">{product.data.title}</p><p className="text-sm text-slate-600">Quantity available: {product.data.quantityAvailable}</p></>}
    </header>
    {content}
  </div>;
};
