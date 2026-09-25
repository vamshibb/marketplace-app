import { z } from "zod";

export const productSchema = z.object({
  listingType: z.enum(["SALE", "RENT"]),
  quantityAvailable: z.number({ error: "Quantity available is required" }).int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  minRentalDays: z.number().int("Minimum days must be a whole number").min(1, "Minimum days must be at least 1").nullable().optional(),
  maxRentalDays: z.number().int("Maximum days must be a whole number").min(1, "Maximum days must be at least 1").nullable().optional(),
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
}).superRefine((values, context) => {
  if (values.listingType === "RENT" && values.minRentalDays != null && values.maxRentalDays != null && values.maxRentalDays < values.minRentalDays) {
    context.addIssue({ code: "custom", path: ["maxRentalDays"], message: "Maximum rental days must be at least the minimum" });
  }
});

export type ProductFormValues = z.infer<typeof productSchema>;
