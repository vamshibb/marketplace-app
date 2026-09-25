import { z } from "zod";

const productFields =
  z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    price: z.coerce.number().positive(),

    categoryId: z.string().optional(),
    listingType: z.enum(["SALE", "RENT"]).optional(),
    quantityAvailable: z.coerce.number().int().min(1).optional(),
    minRentalDays: z.coerce.number().int().min(1).nullable().optional(),
    maxRentalDays: z.coerce.number().int().min(1).nullable().optional(),
  });

export const rentalSettingsSchema = z.object({
  listingType: z.enum(["SALE", "RENT"]),
  minRentalDays: z.number().int().min(1).nullable().optional(),
  maxRentalDays: z.number().int().min(1).nullable().optional(),
}).refine(value => value.listingType !== "RENT" || value.minRentalDays == null ||
  value.maxRentalDays == null || value.maxRentalDays >= value.minRentalDays, {
  message: "maxRentalDays cannot be less than minRentalDays", path: ["maxRentalDays"],
});
export const createProductSchema = productFields.refine(value => rentalSettingsSchema.safeParse({
  ...value, listingType: value.listingType ?? "SALE",
}).success, { message: "maxRentalDays cannot be less than minRentalDays", path: ["maxRentalDays"] });
// Full merged settings are checked in the service for partial updates.
export const updateProductSchema = productFields.partial();

export const getProductsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum([
    "newest",
    "oldest",
    "price_asc",
    "price_desc",
  ]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
}).strict().refine(
  ({ minPrice, maxPrice }) =>
    minPrice === undefined ||
    maxPrice === undefined ||
    minPrice <= maxPrice,
  {
    message: "minPrice must be less than or equal to maxPrice",
    path: ["maxPrice"],
  }
);
