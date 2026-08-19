import { z } from "zod";

export const createProductSchema =
  z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    price: z.coerce.number().positive(),

    categoryId: z.string().optional(),
  });

export const updateProductSchema =
  createProductSchema.partial();

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
