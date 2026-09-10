"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { formatShortDate } from "@/lib/dates";
import {
  CONCERN_PRIORITIES,
  CONCERN_STATUSES,
  labelForPriority,
  labelForStatus,
  priorityTone,
  statusTone,
} from "@/lib/issues/constants.ts";
import type { ConcernPriority, ConcernStatus } from "@/lib/issues/constants.ts";
import {
  addComment,
  getConcern,
  listAttachments,
  listComments,
  updateConcern,
  uploadConcernPhoto,
} from "@/lib/issues/queries.ts";
import { useRealtimeConcerns } from "@/hooks/useRealtime.ts";
import type {
  Concern,
  ConcernAttachment,
  ConcernComment,
} from "@/types/database";

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const { roommate, roommates } = useRoommate();
  const [concern, setConcern] = useState<Concern | null>(null);
  const [comments, setComments] = useState<ConcernComment[]>([]);
  const [photos, setPhotos] = useState<ConcernAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [nextConcern, nextComments, nextPhotos] = await Promise.all([
        getConcern(params.id),
        listComments(params.id),
        listAttachments(params.id),
      ]);
      setConcern(nextConcern);
      setComments(nextComments);
      setPhotos(nextPhotos);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load issue");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeConcerns(load);

  async function onStatus(status: ConcernStatus) {
    if (!concern) return;
    setBusy(true);
    try {
      setConcern(await updateConcern(concern.id, { status }));
      toast.success(status === "resolved" ? "Marked resolved" : "Status updated");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(assignedTo: string | null) {
    if (!concern) return;
    setBusy(true);
    try {
      setConcern(await updateConcern(concern.id, { assignedTo }));
      toast.success(assignedTo ? "Assigned" : "Unassigned");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not assign");
    } finally {
      setBusy(false);
    }
  }

  async function onPriority(priority: ConcernPriority) {
    if (!concern) return;
    setBusy(true);
    try {
      setConcern(await updateConcern(concern.id, { priority }));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function onComment() {
    if (!roommate || !concern) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const saved = await addComment({
        concernId: concern.id,
        roommateId: roommate.id,
        comment: trimmed,
      });
      setComments((current) => [...current, saved]);
      setNote("");
      toast.success("Comment added");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not comment");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!roommate || !concern || !file) return;
    setBusy(true);
    try {
      const saved = await uploadConcernPhoto({
        concernId: concern.id,
        roommateId: roommate.id,
        file,
      });
      setPhotos((current) => [...current, saved]);
      toast.success("Photo added");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not upload photo");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!concern) return <LoadingSkeleton rows={4} />;

  const reporter = roommates.find((person) => person.id === concern.reported_by);
  const assignee = roommates.find((person) => person.id === concern.assigned_to);

  return (
    <div className="grid gap-5 pb-10">
      <PageHeader title={concern.title} subtitle={concern.description ?? undefined} />

      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={priorityTone(concern.priority)}>
            {labelForPriority(concern.priority)}
          </StatusBadge>
          <StatusBadge tone={statusTone(concern.status)}>
            {labelForStatus(concern.status)}
          </StatusBadge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Reported by {reporter?.name ?? "someone"} · {formatShortDate(concern.created_at.slice(0, 10))}
        </p>
        {assignee ? (
          <p className="mt-1 text-sm text-muted-foreground">Assigned to {assignee.name}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nobody is assigned yet.</p>
        )}
      </section>

      {concern.status !== "resolved" ? (
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          disabled={busy}
          onClick={() => void onStatus("resolved")}
        >
          Mark resolved
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          disabled={busy}
          onClick={() => void onStatus(concern.assigned_to ? "assigned" : "open")}
        >
          Reopen
        </Button>
      )}

      <section className="grid gap-2">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Status
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {CONCERN_STATUSES.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={concern.status === item.value ? "default" : "outline"}
              size="lg"
              className="min-h-11"
              disabled={busy}
              onClick={() => void onStatus(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Priority
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {CONCERN_PRIORITIES.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={concern.priority === item.value ? "default" : "outline"}
              size="lg"
              className="min-h-11"
              disabled={busy}
              onClick={() => void onPriority(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Assign
        </h2>
        <Button
          type="button"
          variant={concern.assigned_to === null ? "default" : "outline"}
          size="lg"
          className="min-h-11 justify-start"
          disabled={busy}
          onClick={() => void onAssign(null)}
        >
          Unassigned
        </Button>
        {roommates.map((person) => (
          <Button
            key={person.id}
            type="button"
            variant={concern.assigned_to === person.id ? "default" : "outline"}
            size="lg"
            className="min-h-11 justify-start"
            disabled={busy}
            onClick={() => void onAssign(person.id)}
          >
            {person.name}
          </Button>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Photos
        </h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.storage_url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-2xl ring-1 ring-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storage_url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
        <Label htmlFor="issue-add-photo" className="sr-only">
          Add photo
        </Label>
        <input
          id="issue-add-photo"
          type="file"
          accept="image/*"
          className="min-h-12 w-full text-sm"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onPhoto(file);
          }}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Comments
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="grid gap-3">
            {comments.map((item) => {
              const author = roommates.find((person) => person.id === item.roommate_id);
              return (
                <li
                  key={item.id}
                  className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={author?.name ?? "Roommate"} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{author?.name ?? "Roommate"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(item.created_at.slice(0, 10))}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6">{item.comment}</p>
                </li>
              );
            })}
          </ul>
        )}
        <Textarea
          className="min-h-20 text-base"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a comment"
        />
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          disabled={busy || note.trim().length === 0}
          onClick={() => void onComment()}
        >
          Add comment
        </Button>
      </section>
    </div>
  );
}
