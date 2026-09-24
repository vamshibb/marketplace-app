import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ProductForm, type ProductFormInitialValues } from "../components/ProductForm";
import { ProductMediaPicker } from "../components/ProductMediaPicker";
import { usePublishProductMutation } from "../hooks/usePublishProductMutation";
import type { ProductFormValues } from "../schemas/productSchema";

const initialValues: ProductFormInitialValues = {
  title: "", description: "", price: undefined, categoryId: "",
};

export const CreateProductPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const publish = usePublishProductMutation();
  const errorMessage = publish.isError
    ? `${publish.canRetryUpload ? "Your listing was created and no media was saved. Retry publishing to upload your selected files. " : ""}${publish.error instanceof Error ? publish.error.message : "Unable to publish listing."}`
    : undefined;

  const onSubmit = (values: ProductFormValues): void => {
    if (publish.isPending) return;
    publish.mutate({ values, files }, {
      onSuccess: (id) => navigate(`/products/${id}`),
    });
  };

  return (
    <main className="space-y-5">
      <Link to="/products" className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-800">&larr; Back to Products</Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create a listing</h1>
        <p className="mt-1 text-sm text-slate-500">Add the details and photos that help your product stand out.</p>
      </div>
      <ProductForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        isPending={publish.isPending}
        detailsDisabled={publish.hasCreatedProduct}
        submitLabel="Publish listing"
        pendingLabel="Publishing..."
        errorMessage={errorMessage}
        onCancel={() => navigate("/products")}
        mediaPanel={<ProductMediaPicker files={files} onChange={setFiles} disabled={publish.isPending} />}
      />
    </main>
  );
};
