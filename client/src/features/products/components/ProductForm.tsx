import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../shared/ui/Button";
import { useCategoriesQuery } from "../../categories/hooks/useCategoriesQuery";
import {
  productSchema,
  type ProductFormValues,
} from "../schemas/productSchema";

export interface ProductFormInitialValues {
  title: string;
  description: string;
  price: number | undefined;
  categoryId: string;
}

interface ProductFormProps {
  initialValues: ProductFormInitialValues;
  onSubmit: (values: ProductFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  errorMessage?: string;
}

export const ProductForm = ({
  initialValues,
  onSubmit,
  isPending,
  submitLabel,
  errorMessage,
}: ProductFormProps) => {
  const categoriesQuery = useCategoriesQuery();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <>
      {errorMessage && (
        <p className="mb-4" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
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
          <label htmlFor="categoryId">Category</label>
          <select
            id="categoryId"
            disabled={categoriesQuery.isPending || categoriesQuery.isError}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? "category-id-error" : undefined
            }
            {...register("categoryId")}
          >
            {categoriesQuery.isPending ? (
              <option value="">Loading categories...</option>
            ) : categoriesQuery.isError ? (
              <option value="">Unable to load categories</option>
            ) : (
              <>
                <option value="" disabled>Select a category</option>
                {categoriesQuery.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </>
            )}
          </select>
          {errors.categoryId && (
            <p id="category-id-error" role="alert">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <Button type="submit" isLoading={isPending}>
          {submitLabel}
        </Button>
      </form>
    </>
  );
};
