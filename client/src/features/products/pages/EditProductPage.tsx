import { useNavigate, useParams } from "react-router-dom";

import { ProductForm } from "../components/ProductForm";
import { useProductQuery } from "../hooks/useProductQuery";
import { useUpdateProductMutation } from "../hooks/useUpdateProductMutation";
import type { ProductFormValues } from "../schemas/productSchema";

export const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productQuery = useProductQuery(id);
  const updateProductMutation = useUpdateProductMutation();

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
  const errorMessage = updateProductMutation.isError
    ? updateProductMutation.error instanceof Error
      ? updateProductMutation.error.message
      : "Unable to update product."
    : undefined;

  const onSubmit = (values: ProductFormValues): void => {
    updateProductMutation.mutate(
      { id, request: values },
      {
        onSuccess: () => {
          navigate(`/products/${id}`);
        },
      },
    );
  };

  return (
    <main className="p-4">
      <h1 className="mb-4">Edit Product</h1>
      <ProductForm
        initialValues={{
          title: product.title,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId ?? "",
        }}
        onSubmit={onSubmit}
        isPending={updateProductMutation.isPending}
        submitLabel="Save Changes"
        pendingLabel="Saving..."
        errorMessage={errorMessage}
      />
    </main>
  );
};
