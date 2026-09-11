"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INVENTORY_CATEGORIES,
  STORAGE_LOCATIONS,
  UNITS,
} from "@/lib/inventory/constants";
import { inventoryInputSchema } from "@/lib/inventory/schema";
import type { InventoryInput } from "@/lib/inventory/schema";
import type { InventoryItem, Roommate } from "@/types/database";

function fieldClass() {
  return "min-h-12 text-base";
}

export function InventoryForm({
  roommates,
  currentRoommateId,
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  roommates: Roommate[];
  currentRoommateId: string;
  initial?: InventoryItem;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: InventoryInput) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ownershipType, setOwnershipType] = useState<"shared" | "personal">(
    initial?.ownership_type ?? "shared"
  );
  const defaults = useMemo(
    () => ({
      name: initial?.name ?? "",
      quantity: initial?.quantity ?? 1,
      unit: initial?.unit ?? "count",
      category: initial?.category ?? "other",
      storage_location: initial?.storage_location ?? "fridge",
      ownership_type: initial?.ownership_type ?? "shared",
      owner_id: initial?.owner_id ?? currentRoommateId,
      expiry_date: initial?.expiry_date ?? "",
      minimum_quantity: initial?.minimum_quantity ?? 1,
      auto_add_to_shopping: initial?.auto_add_to_shopping ?? true,
      notes: initial?.notes ?? "",
    }),
    [initial, currentRoommateId]
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    const parsed = inventoryInputSchema.safeParse({
      name: formData.get("name"),
      quantity: formData.get("quantity"),
      unit: formData.get("unit"),
      category: formData.get("category"),
      storage_location: formData.get("storage_location"),
      ownership_type: formData.get("ownership_type"),
      owner_id: formData.get("owner_id") || currentRoommateId,
      expiry_date: String(formData.get("expiry_date") || "") || null,
      minimum_quantity:
        String(formData.get("minimum_quantity") || "") === ""
          ? null
          : formData.get("minimum_quantity"),
      auto_add_to_shopping: formData.get("auto_add_to_shopping") === "on",
      notes: String(formData.get("notes") || "") || null,
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
    <form action={handleSubmit} className="grid gap-4 pb-8">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaults.name}
          placeholder="Eggs"
          className={fieldClass()}
        />
      </div>

      {!initial ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              required
              defaultValue={defaults.quantity}
              className={fieldClass()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unit">Unit</Label>
            <select
              id="unit"
              name="unit"
              defaultValue={defaults.unit}
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
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="unit">Unit</Label>
          <select
            id="unit"
            name="unit"
            defaultValue={defaults.unit}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input type="hidden" name="quantity" value={defaults.quantity} />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={defaults.category}
          className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
        >
          {INVENTORY_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="storage_location">Storage</Label>
        <select
          id="storage_location"
          name="storage_location"
          defaultValue={defaults.storage_location}
          className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
        >
          {STORAGE_LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ownership_type">Ownership</Label>
        <select
          id="ownership_type"
          name="ownership_type"
          value={ownershipType}
          onChange={(event) => setOwnershipType(event.target.value as "shared" | "personal")}
          className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
        >
          <option value="shared">Shared</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="owner_id">{ownershipType === "shared" ? "Who bought it" : "Owner"}</Label>
        <select
          id="owner_id"
          name="owner_id"
          defaultValue={defaults.owner_id ?? currentRoommateId}
          className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
        >
          {roommates.map((roommate) => (
            <option key={roommate.id} value={roommate.id}>
              {roommate.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-foreground/80">
          {ownershipType === "shared"
            ? "Shared food can still remember who brought it home."
            : "Personal items belong to this person."}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expiry_date">Expiry date</Label>
        <Input
          id="expiry_date"
          name="expiry_date"
          type="date"
          defaultValue={defaults.expiry_date ?? ""}
          className={fieldClass()}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="minimum_quantity">Low-stock at</Label>
        <Input
          id="minimum_quantity"
          name="minimum_quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          defaultValue={defaults.minimum_quantity ?? ""}
          className={fieldClass()}
        />
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
        <input
          type="checkbox"
          name="auto_add_to_shopping"
          defaultChecked={defaults.auto_add_to_shopping}
          className="size-5"
        />
        <span className="text-sm">Auto-add to shopping when low</span>
      </label>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaults.notes ?? ""}
          placeholder="Optional"
          className="min-h-24 text-base"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="min-h-12" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
