import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { ListingSettings } from "../types";

import { Button } from "../../../shared/ui/Button";
import { useCategoriesQuery } from "../../categories/hooks/useCategoriesQuery";
import {
  productSchema,
  type ProductFormValues,
} from "../schemas/productSchema";

export interface ProductFormInitialValues extends ListingSettings {
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
  mediaPanel?: ReactNode;
  onCancel?: () => void;
  detailsDisabled?: boolean;
}

export const ProductForm = ({
  initialValues,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  errorMessage,
  mediaPanel,
  onCancel,
  detailsDisabled = false,
}: ProductFormProps) => {
  const categoriesQuery = useCategoriesQuery();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });
  const listingType = useWatch({ control, name: "listingType" });

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

      <form className="space-y-4" noValidate onSubmit={handleSubmit(values => onSubmit({
        ...values,
        minRentalDays: values.listingType === "SALE" ? null : values.minRentalDays ?? null,
        maxRentalDays: values.listingType === "SALE" ? null : values.maxRentalDays ?? null,
      }))}>
        <div className={mediaPanel ? "grid items-stretch gap-5 lg:grid-cols-2" : undefined}>
        <fieldset disabled={isPending || detailsDisabled} className={mediaPanel ? "flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [&_label]:mb-1.5 [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:px-3 [&_input]:py-2.5 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-300 [&_select]:px-3 [&_select]:py-2.5 [&_textarea]:min-h-36 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:px-3 [&_textarea]:py-2.5 [&_p]:text-sm [&_p]:text-red-600" : "space-y-4"}>
        {mediaPanel && <h2 className="text-lg font-semibold text-slate-900">Listing details</h2>}
        <div role="group" aria-label="Listing type" className="flex gap-1 self-start rounded-lg border border-slate-200 bg-slate-50 p-1">
          <input type="hidden" {...register("listingType")} />
          {(["SALE", "RENT"] as const).map(type => (
            <button key={type} type="button" aria-pressed={listingType === type}
              className="rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 aria-pressed:bg-white aria-pressed:text-blue-600 aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => {
                setValue("listingType", type, { shouldDirty: true });
                if (type === "SALE") {
                  setValue("minRentalDays", null);
                  setValue("maxRentalDays", null);
                  clearErrors(["minRentalDays", "maxRentalDays"]);
                }
              }}>{type === "SALE" ? "For Sale" : "For Rent"}</button>
          ))}
        </div>
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

        <div className={mediaPanel ? "order-5" : undefined}>
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

        <div className={mediaPanel ? "order-2" : undefined}>
          <label htmlFor="price">{listingType === "RENT" ? "Price per day" : "Price"}</label>
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

        <div className={mediaPanel ? "order-1" : undefined}>
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

        <div className={mediaPanel ? "order-3" : undefined}>
          <label htmlFor="quantityAvailable">Quantity available</label>
          <input id="quantityAvailable" type="number" min={1} step={1}
            aria-invalid={Boolean(errors.quantityAvailable)} aria-describedby={errors.quantityAvailable ? "quantity-error" : undefined}
            {...register("quantityAvailable", { valueAsNumber: true })} />
          {errors.quantityAvailable && <p id="quantity-error" role="alert">{errors.quantityAvailable.message}</p>}
        </div>
        {listingType === "RENT" && <div className="order-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["minRentalDays", "maxRentalDays"] as const).map(name => (
            <div key={name}>
              <label htmlFor={name}>{name === "minRentalDays" ? "Minimum rental days" : "Maximum rental days"} (optional)</label>
              <input id={name} type="number" min={1} step={1}
                aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}
                {...register(name, { setValueAs: value => value === "" || value == null ? null : Number(value) })} />
              {errors[name] && <p id={`${name}-error`} role="alert">{errors[name]?.message}</p>}
            </div>
          ))}
        </div>}
        </fieldset>
        {mediaPanel}
        </div>
        <div className={mediaPanel ? "flex justify-end gap-3" : undefined}>
        {onCancel && <Button variant="secondary" disabled={isPending} onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        </div>
      </form>
    </>
  );
};
