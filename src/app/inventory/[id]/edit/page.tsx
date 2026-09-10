"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { getInventoryItem, updateInventoryItem } from "@/lib/inventory/queries";
import type { InventoryInput } from "@/lib/inventory/schema";
import type { InventoryItem } from "@/types/database";

export default function EditInventoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getInventoryItem(params.id)
      .then(setItem)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load item");
      });
  }, [params.id]);

  async function onSubmit(values: InventoryInput) {
    if (!item) return;
    setBusy(true);
    try {
      await updateInventoryItem(item.id, {
        name: values.name,
        unit: values.unit,
        category: values.category,
        storage_location: values.storage_location,
        ownership_type: values.ownership_type,
        owner_id: values.ownership_type === "personal" ? values.owner_id : null,
        expiry_date: values.expiry_date || null,
        minimum_quantity: values.minimum_quantity,
        auto_add_to_shopping: values.auto_add_to_shopping,
        notes: values.notes || null,
      });
      toast.success("Item updated");
      router.push(`/inventory/${item.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!item || !roommate) return <LoadingSkeleton rows={3} />;

  return (
    <div>
      <PageHeader title="Edit item" subtitle={item.name} />
      <InventoryForm
        roommates={roommates}
        currentRoommateId={roommate.id}
        initial={item}
        submitLabel="Save changes"
        busy={busy}
        onSubmit={onSubmit}
      />
    </div>
  );
}
