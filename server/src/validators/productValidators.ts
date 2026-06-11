import { z } from "zod";

export const createProductSchema =
  z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    price: z.coerce.number().positive(),
    image: z.string().optional(),

    categoryId: z.string().optional(),
  });

export const updateProductSchema =
  createProductSchema.partial();