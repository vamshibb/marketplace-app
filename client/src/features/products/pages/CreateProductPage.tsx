import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useCreateProductMutation } from "../hooks/useCreateProductMutation";
import {
  productSchema,
  type CreateProductFormValues,
} from "../schemas/productSchema";

export const CreateProductPage = () => {
  const navigate = useNavigate();
  const createProductMutation = useCreateProductMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      price: undefined,
      categoryId: "",
    },
  });

  const errorMessage =
    createProductMutation.error instanceof Error
      ? createProductMutation.error.message
      : "Unable to create product.";

  const onSubmit = (values: CreateProductFormValues): void => {
    createProductMutation.mutate(values, {
      onSuccess: () => {
        navigate("/products");
      },
    });
  };

  return (
    <main className="p-4">
      <h1 className="mb-4">Create Product</h1>

      {createProductMutation.isError && (
        <p className="mb-4" role="alert">
          {errorMessage}
        </p>
      )}

      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            {...register("title")}
          />
          {errors.title && (
            <p id="title-error" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            {...register("description")}
          />
          {errors.description && (
            <p id="description-error" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="price">Price</label>
          <input
            id="price"
            type="number"
            step="any"
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "price-error" : undefined}
            {...register("price", { valueAsNumber: true })}
          />
          {errors.price && (
            <p id="price-error" role="alert">
              {errors.price.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="categoryId">Category ID</label>
          <input
            id="categoryId"
            type="text"
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? "category-id-error" : undefined
            }
            {...register("categoryId")}
          />
          {errors.categoryId && (
            <p id="category-id-error" role="alert">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={createProductMutation.isPending}>
          {createProductMutation.isPending ? "Creating..." : "Create Product"}
        </button>
      </form>
    </main>
  );
};
