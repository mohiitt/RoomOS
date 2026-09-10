"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UNITS } from "@/lib/inventory/constants";
import { shoppingInputSchema } from "@/lib/shopping/schema";
import type { ShoppingInput } from "@/lib/shopping/schema";

export function ShoppingForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (values: ShoppingInput) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const quantityRaw = String(formData.get("requested_quantity") ?? "").trim();
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const parsed = shoppingInputSchema.safeParse({
      name: formData.get("name"),
      requested_quantity: quantityRaw === "" ? null : Number(quantityRaw),
      unit: unitRaw === "" ? null : unitRaw,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again");
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save");
    }
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="shopping-name">Item</Label>
        <Input
          id="shopping-name"
          name="name"
          required
          placeholder="Milk"
          className="min-h-12 text-base"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="shopping-qty">Quantity</Label>
          <Input
            id="shopping-qty"
            name="requested_quantity"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="Optional"
            className="min-h-12 text-base"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shopping-unit">Unit</Label>
          <select
            id="shopping-unit"
            name="unit"
            defaultValue="count"
            className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="min-h-12" disabled={busy}>
        {busy ? "Adding…" : "Add to list"}
      </Button>
    </form>
  );
}
