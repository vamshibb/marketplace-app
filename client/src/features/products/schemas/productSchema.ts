import { z } from "zod";

export const productSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters"),
  price: z.number({
    error: "Price is required",
  })
  .positive("Price must be a positive number"),
  categoryId: z.string().trim().min(1, "Category ID is required"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
