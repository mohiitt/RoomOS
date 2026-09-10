import { z } from "zod";

export const shoppingInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  requested_quantity: z
    .number()
    .positive("Quantity must be greater than zero")
    .nullable(),
  unit: z.string().trim().min(1).nullable(),
});

export type ShoppingInput = z.infer<typeof shoppingInputSchema>;
