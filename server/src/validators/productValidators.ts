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
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
}).strict();
