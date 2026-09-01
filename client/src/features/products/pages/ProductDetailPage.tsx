import { useNavigate, useParams } from "react-router-dom";

import { useDeleteProductMutation } from "../hooks/useDeleteProductMutation";
import { useProductQuery } from "../hooks/useProductQuery";

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productQuery = useProductQuery(id);
  const deleteProductMutation = useDeleteProductMutation();

  if (!id) {
    return <p>Product ID is required</p>;
  }

  if (productQuery.isPending) {
    return <p>Loading...</p>;
  }

  if (productQuery.isError) {
    return <p role="alert">{productQuery.error.message}</p>;
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
    <main className="space-y-2">
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>Price: {product.price}</p>
      <p>Average Rating: {product.averageRating}</p>
      <p>Review Count: {product.reviewCount}</p>
      <button
        type="button"
        disabled={deleteProductMutation.isPending}
        onClick={handleDelete}
      >
        Delete
      </button>
      {deleteProductMutation.isError && (
        <p role="alert">{deleteErrorMessage}</p>
      )}
    </main>
  );
};
