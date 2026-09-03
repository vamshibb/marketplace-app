import { useNavigate, useParams } from "react-router-dom";

import { Container } from "../../../shared/layout/Container";
import { Button } from "../../../shared/ui/Button";
import { ProductGallery } from "../components/ProductGallery";
import { useDeleteProductMutation } from "../hooks/useDeleteProductMutation";
import { useProductQuery } from "../hooks/useProductQuery";

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productQuery = useProductQuery(id);
  const deleteProductMutation = useDeleteProductMutation();

  if (!id) {
    return (
      <Container>
        <p className="py-12 text-center" role="alert">
          Invalid product.
        </p>
      </Container>
    );
  }

  if (productQuery.isPending) {
    return (
      <Container>
        <p className="py-12 text-center">Loading product...</p>
      </Container>
    );
  }

  if (productQuery.isError) {
    return (
      <Container>
        <p className="py-12 text-center text-red-600" role="alert">
          Unable to load product.
        </p>
      </Container>
    );
  }

  const product = productQuery.data;
  const deleteErrorMessage =
    deleteProductMutation.error instanceof Error
      ? deleteProductMutation.error.message
      : "Unable to delete product.";

  const handleDelete = (): void => {
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
    <Container>
      <article className="space-y-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square overflow-hidden rounded-xl border">
            <ProductGallery media={product.media} />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">{product.title}</h1>

              <p className="text-3xl font-bold text-blue-600">
                ${product.price.toLocaleString()}
              </p>
            </div>

            <dl className="space-y-3">
              <div className="flex justify-between gap-6">
                <dt className="font-medium">Seller</dt>
                <dd>{product.seller.email}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="font-medium">Category</dt>
                <dd>{product.category?.name ?? "Uncategorized"}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="font-medium">Average Rating</dt>
                <dd>{product.averageRating}</dd>
              </div>

              <div className="flex justify-between gap-6">
                <dt className="font-medium">Review Count</dt>
                <dd>{product.reviewCount}</dd>
              </div>
            </dl>

            <div className="pt-4">
              <Button
                variant="danger"
                className="w-full sm:w-auto"
                isLoading={deleteProductMutation.isPending}
                onClick={handleDelete}
              >
                Delete Product
              </Button>
            </div>

            {deleteProductMutation.isError && (
              <p className="text-sm text-red-600" role="alert">
                {deleteErrorMessage}
              </p>
            )}
          </div>
        </div>

        <section className="space-y-3 border-t pt-8">
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="whitespace-pre-wrap leading-7 text-gray-700">
            {product.description}
          </p>
        </section>
      </article>
    </Container>
  );
};
