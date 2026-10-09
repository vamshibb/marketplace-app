import { isAxiosError } from "axios";
import type { ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { Button } from "../../../shared/ui/Button";
import { ProductForm } from "../components/ProductForm";
import { useProductQuery } from "../hooks/useProductQuery";
import { useUpdateProductMutation } from "../hooks/useUpdateProductMutation";
import type { ProductFormValues } from "../schemas/productSchema";
import type { ProductDetail } from "../types";

const isForbidden = (error: unknown): boolean => isAxiosError(error) && error.response?.status === 403;

const updateErrorMessage = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (isForbidden(error)) return "You no longer have permission to edit this listing. Your changes have not been saved.";
  const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
  if (isAxiosError(error) && error.response?.status === 409) {
    const reason = typeof message === "string" && message.trim()
      ? message : "This change conflicts with the listing's current rental commitments or availability.";
    return `${reason} Your edits are still here. Review the listing settings and try saving again.`;
  }
  return typeof message === "string" && message.trim()
    ? message
    : "Unable to save your changes. Your edits are still here. Please try again.";
};

// Remount only when the product/account changes, including mutation error state.
const EditProductEditor = ({ product }: { product: ProductDetail }): ReactElement => {
  const navigate = useNavigate();
  const update = useUpdateProductMutation();
  const forbidden = isForbidden(update.error);
  const onSubmit = (values: ProductFormValues): void => {
    if (update.isPending || forbidden) return;
    update.mutate({ id: product.id, request: values }, {
      onSuccess: () => navigate(`/products/${product.id}`),
    });
  };

  return <ProductForm
    initialValues={{
      title: product.title, description: product.description, price: product.price,
      categoryId: product.categoryId ?? "", listingType: product.listingType,
      quantityAvailable: product.quantityAvailable,
      minRentalDays: product.minRentalDays ?? null, maxRentalDays: product.maxRentalDays ?? null,
    }}
    onSubmit={onSubmit}
    isPending={update.isPending}
    detailsDisabled={forbidden}
    submitDisabled={forbidden}
    submitLabel="Save changes"
    pendingLabel="Saving..."
    errorMessage={updateErrorMessage(update.error)}
    onCancel={() => navigate(`/products/${product.id}`)}
  />;
};

export const EditProductPage = (): ReactElement => {
  const { id } = useParams();
  const token = useAuthStore(state => state.token);
  const user = useCurrentUserQuery();
  const product = useProductQuery(id);
  let content: ReactElement;

  if (!id) content = <p role="alert">A listing ID is required.</p>;
  else if (!token) content = <p role="alert">Please sign in to edit your listing.</p>;
  else if (isForbidden(product.error) || isForbidden(user.error)) content = <p role="alert">You do not have permission to edit this listing.</p>;
  else if (user.isError || (product.isError && !product.data)) content = <div role="alert" className="space-y-3">
    <p>{isAxiosError(product.error) && product.error.response?.status === 404 ? "This listing could not be found." : "Unable to load the listing or verify your access. Please try again."}</p>
    <Button variant="secondary" disabled={product.isFetching || user.isFetching} onClick={() => {
      if (product.isError) void product.refetch();
      if (user.isError) void user.refetch();
    }}>Retry</Button>
  </div>;
  else if (product.isPending || user.isPending) content = <p role="status">Loading listing details...</p>;
  else if (product.data.sellerId !== user.data.id) content = <p role="alert">You can only edit listings you own.</p>;
  else content = <EditProductEditor key={`${user.data.id}:${product.data.id}`} product={product.data} />;

  return <main className="max-w-3xl space-y-5">
    <Link to="/my-products" className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-800">&larr; Back to My Products</Link>
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit listing</h1>
      <p className="mt-1 text-sm text-slate-500">Update your listing details, pricing, and rental settings.</p>
    </div>
    {content}
  </main>;
};
