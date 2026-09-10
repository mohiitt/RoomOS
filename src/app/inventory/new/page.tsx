"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { createInventoryItem } from "@/lib/inventory/queries";
import { adjustInventoryQuantity } from "@/lib/inventory/updateQuantity";
import { syncLowStock } from "@/lib/shopping/syncLowStock";
import type { InventoryInput } from "@/lib/inventory/schema";

export default function NewInventoryPage() {
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: InventoryInput) {
    if (!roommate) return;
    setBusy(true);
    try {
      const item = await createInventoryItem({
        name: values.name,
        quantity: 0,
        unit: values.unit,
        category: values.category,
        storage_location: values.storage_location,
        ownership_type: values.ownership_type,
        owner_id:
          values.ownership_type === "personal"
            ? values.owner_id
            : null,
        expiry_date: values.expiry_date || null,
        minimum_quantity: values.minimum_quantity,
        auto_add_to_shopping: values.auto_add_to_shopping,
        notes: values.notes || null,
        created_by: roommate.id,
      });

      let saved = item;
      if (values.quantity > 0) {
        saved = await adjustInventoryQuantity({
          itemId: item.id,
          roommateId: roommate.id,
          transactionType: "add",
          quantityChange: values.quantity,
          note: "Initial stock",
        });
      }

      await syncLowStock(saved, roommate.id);
      toast.success("Item added");
      router.push("/inventory");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add item" subtitle="What just arrived in the apartment?" />
      {roommate ? (
        <InventoryForm
          roommates={roommates}
          currentRoommateId={roommate.id}
          submitLabel="Save item"
          busy={busy}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
