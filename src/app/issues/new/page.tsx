"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IssueForm } from "@/components/issues/IssueForm";
import type { IssueFormValues } from "@/components/issues/IssueForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { createConcern, uploadConcernPhoto } from "@/lib/issues/queries.ts";

export default function NewIssuePage() {
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: IssueFormValues) {
    if (!roommate) return;
    setBusy(true);
    try {
      const concern = await createConcern({
        title: values.title,
        description: values.description,
        priority: values.priority,
        reportedBy: roommate.id,
        assignedTo: values.assignedTo,
      });
      if (values.photo) {
        try {
          await uploadConcernPhoto({
            concernId: concern.id,
            roommateId: roommate.id,
            file: values.photo,
          });
        } catch (photoError) {
          toast.error(
            photoError instanceof Error
              ? `Issue saved, but the photo did not upload. ${photoError.message}`
              : "Issue saved, but the photo did not upload."
          );
          router.push(`/issues/${concern.id}`);
          return;
        }
      }
      toast.success("Issue reported");
      router.push(`/issues/${concern.id}`);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not report issue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Report issue" subtitle="Write it down so it does not live only in the group chat." />
      {roommate ? (
        <IssueForm
          roommates={roommates}
          busy={busy}
          submitLabel="Save issue"
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
