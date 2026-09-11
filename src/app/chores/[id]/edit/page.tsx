"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChoreForm } from "@/components/chores/ChoreForm";
import type { ChoreFormValues } from "@/components/chores/ChoreForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  listChoreRotations,
  listChoreTemplates,
  updateChore,
} from "@/lib/chores/queries.ts";
import type { ChoreTemplate } from "@/types/database";

export default function EditChorePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommates } = useRoommate();
  const [template, setTemplate] = useState<ChoreTemplate | null>(null);
  const [roommateIds, setRoommateIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listChoreTemplates(), listChoreRotations()])
      .then(([templates, rotations]) => {
        const next = templates.find((row) => row.id === params.id) ?? null;
        setTemplate(next);
        setRoommateIds(
          rotations
            .filter((row) => row.chore_template_id === params.id)
            .sort((a, b) => a.rotation_position - b.rotation_position)
            .map((row) => row.roommate_id)
        );
        if (!next) setError("Chore not found");
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load chore");
      });
  }, [params.id]);

  async function onSubmit(values: ChoreFormValues) {
    if (!template) return;
    setBusy(true);
    try {
      await updateChore({
        id: template.id,
        name: values.name,
        description: values.description,
        points: values.points,
        frequency: values.frequency,
        roommateIds: values.roommateIds,
      });
      toast.success("Chore updated");
      router.push("/chores");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  if (!template && !error) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader title="Edit chore" subtitle={template?.name} backHref="/chores" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {template ? (
        <ChoreForm
          roommates={roommates}
          busy={busy}
          submitLabel="Save chore"
          initial={{
            name: template.name,
            description: template.description,
            points: template.points,
            frequency: template.frequency,
            roommateIds: roommateIds.length > 0 ? roommateIds : roommates.map((person) => person.id),
          }}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
