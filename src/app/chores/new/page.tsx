"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChoreForm } from "@/components/chores/ChoreForm";
import type { ChoreFormValues } from "@/components/chores/ChoreForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { createChore } from "@/lib/chores/queries.ts";

export default function NewChorePage() {
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: ChoreFormValues) {
    if (!roommate) return;
    setBusy(true);
    try {
      await createChore({
        name: values.name,
        description: values.description,
        points: values.points,
        createdBy: roommate.id,
        roommateIds: values.roommateIds,
      });
      toast.success("Chore added");
      router.push("/chores");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not add chore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add chore" subtitle="It will rotate weekly among the people you pick." backHref="/chores" />
      {roommate ? (
        <ChoreForm
          roommates={roommates}
          busy={busy}
          submitLabel="Save chore"
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
