import { useNavigate } from "react-router-dom";

import { ProductForm } from "../components/ProductForm";
import { useCreateProductMutation } from "../hooks/useCreateProductMutation";
import type { ProductFormValues } from "../schemas/productSchema";

export const CreateProductPage = () => {
  const navigate = useNavigate();
  const createProductMutation = useCreateProductMutation();

  const errorMessage = createProductMutation.isError
    ? createProductMutation.error instanceof Error
      ? createProductMutation.error.message
      : "Unable to create product."
    : undefined;

  const onSubmit = (values: ProductFormValues): void => {
    createProductMutation.mutate(values, {
      onSuccess: () => {
        navigate("/products");
      },
    });
  };

  return (
    <main className="p-4">
      <h1 className="mb-4">Create Product</h1>
      <ProductForm
        initialValues={{
          title: "",
          description: "",
          price: undefined,
          categoryId: "",
        }}
        onSubmit={onSubmit}
        isPending={createProductMutation.isPending}
        submitLabel="Create Product"
        pendingLabel="Creating..."
        errorMessage={errorMessage}
      />
    </main>
  );
};
