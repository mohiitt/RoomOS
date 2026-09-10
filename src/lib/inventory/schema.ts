import { z } from "zod";

export const inventoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unit: z.string().trim().min(1, "Unit is required"),
  category: z.string().trim().min(1, "Category is required"),
  storage_location: z.enum(["fridge", "freezer", "pantry", "kitchen", "other"]),
  ownership_type: z.enum(["shared", "personal"]),
  owner_id: z.string().uuid().nullable(),
  expiry_date: z.string().optional().nullable(),
  minimum_quantity: z.coerce.number().min(0).nullable(),
  auto_add_to_shopping: z.boolean(),
  notes: z.string().optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.ownership_type === "personal" && !value.owner_id) {
    ctx.addIssue({
      code: "custom",
      path: ["owner_id"],
      message: "Personal items need an owner",
    });
  }
});

export type InventoryInput = z.infer<typeof inventoryInputSchema>;
