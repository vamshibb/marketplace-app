import { ContactSellerButton } from "../../messaging";
import { WishlistButton } from "../components/WishlistButton";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuthStore, useCurrentUserQuery, useRequireAuthentication } from "../../auth";
import { ProductDescription } from "../components/ProductDescription";
import { ProductGallery } from "../components/ProductGallery";
import { useDeleteProductMutation } from "../hooks/useDeleteProductMutation";
import { useProductQuery } from "../hooks/useProductQuery";

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productQuery = useProductQuery(id);
  const deleteProductMutation = useDeleteProductMutation();
  const requireAuthentication = useRequireAuthentication();
  const isAuthenticated = useAuthStore((state) => Boolean(state.token));
  const { data: currentUser } = useCurrentUserQuery();

  if (!id) {
    return (
      <div data-page="product-details">
        <p className="py-12 text-center" role="alert">
          Invalid product.
        </p>
      </div>
    );
  }

  if (productQuery.isPending) {
    return (
      <div data-page="product-details">
        <p className="py-12 text-center">Loading product...</p>
      </div>
    );
  }

  if (productQuery.isError) {
    return (
      <div data-page="product-details">
        <p className="py-12 text-center text-red-600" role="alert">
          Unable to load product.
        </p>
      </div>
    );
  }

  const product = productQuery.data;
  const isOwner = isAuthenticated && currentUser?.id === product.sellerId;
  const listedDate = product.createdAt ? new Date(product.createdAt) : null;
  const hasListedDate = listedDate !== null && !Number.isNaN(listedDate.getTime());
  const deleteErrorMessage =
    deleteProductMutation.error instanceof Error
      ? deleteProductMutation.error.message
      : "Unable to delete product.";

  const handleDelete = (): void => {
    if (!requireAuthentication()) return;
    if (!isOwner) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!confirmed) {
      return;
    }

    deleteProductMutation.mutate(id, {
      onSuccess: () => {
        navigate("/products");
      },
    });
  };

  return (
    <div data-page="product-details" className="w-full min-w-0 space-y-2">
      <Link
        to="/products"
        className="inline-flex min-h-8 items-center rounded text-sm font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        ← Back to Products
      </Link>

      <article className="space-y-4">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-80 lg:[&>div]:absolute lg:[&>div]:inset-0 lg:[&>div]:h-full lg:[&>div]:aspect-auto [&>div]:rounded-none [&>div>div]:rounded-none [&>div>div]:border-0">
            <ProductGallery media={product.media} />
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold wrap-anywhere text-blue-800">
                  {product.category?.name ?? "Uncategorized"}
                </span>
                {isOwner && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Your Listing
                  </span>
                )}
              </div>
              {!isOwner && (
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {(!isAuthenticated || currentUser) && <div className="relative size-11 [&>button]:inset-0">
                    <WishlistButton product={product} />
                  </div>}
                  <ContactSellerButton productId={product.id} sellerId={product.sellerId} sellerLabel={product.seller.displayName ?? product.seller.email} />
                </div>
              )}
              {isOwner && (
                <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                  <Link
                    to={`/products/${product.id}/edit`}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={deleteProductMutation.isPending}
                    aria-busy={deleteProductMutation.isPending || undefined}
                    onClick={handleDelete}
                  >
                    {deleteProductMutation.isPending ? "Loading..." : "Delete"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight wrap-anywhere text-gray-950 sm:text-3xl">{product.title}</h1>

              <p className="text-3xl font-semibold tracking-tight wrap-anywhere text-blue-600">
                ${product.price.toLocaleString()}
              </p>
            </div>

            <dl className="space-y-2 border-t border-slate-200 pt-3 text-sm">
              <div className="space-y-1">
                <dt className="font-medium text-slate-500">Seller</dt>
                <dd className="wrap-anywhere text-slate-700">{product.seller.displayName ?? product.seller.email}</dd>
              </div>
              {hasListedDate && (
                <div className="space-y-1">
                  <dt className="font-medium text-slate-500">Listed</dt>
                  <dd className="text-slate-700">
                    <time dateTime={product.createdAt}>
                      {listedDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </time>
                  </dd>
                </div>
              )}
            </dl>

            {deleteProductMutation.isError && (
              <p className="text-sm text-red-600" role="alert">
                {deleteErrorMessage}
              </p>
            )}
          </div>
        </div>

        <ProductDescription key={`${product.id}:${product.description}`} description={product.description} />
      </article>
    </div>
  );
};
