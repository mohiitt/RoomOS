"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChoreCard } from "@/components/chores/ChoreCard";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { calculateStreak, totalPoints } from "@/lib/chores/calculateStreak.ts";
import {
  completeChoreAssignment,
  generateDueChoreAssignments,
  listChoreAssignments,
  listChoreTemplates,
  seedDefaultChores,
} from "@/lib/chores/queries.ts";
import { weekDueDate } from "@/lib/chores/week.ts";
import { formatShortDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import { useRealtimeChores } from "@/hooks/useRealtime.ts";
import type { ChoreAssignment, ChoreTemplate } from "@/types/database";

export default function ChoresPage() {
  const { roommate, roommates } = useRoommate();
  const [templates, setTemplates] = useState<ChoreTemplate[] | null>(null);
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dueDate = weekDueDate();

  async function load() {
    try {
      setError(null);
      await generateDueChoreAssignments();
      const [nextTemplates, nextAssignments] = await Promise.all([
        listChoreTemplates(),
        listChoreAssignments(),
      ]);
      setTemplates(nextTemplates);
      setAssignments(nextAssignments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load chores");
      setTemplates([]);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const [nextTemplates, nextAssignments] = await Promise.all([
        listChoreTemplates(),
        listChoreAssignments(),
      ]);
      setTemplates(nextTemplates);
      setAssignments(nextAssignments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load chores");
    }
  }, []);

  useEffect(() => {
    void load();
  }, []);
  useRealtimeChores(refresh);

  const templateById = useMemo(
    () => new Map((templates ?? []).map((template) => [template.id, template])),
    [templates]
  );

  const thisWeek = assignments.filter((assignment) => assignment.due_date === dueDate);
  const yours = thisWeek.filter(
    (assignment) => assignment.assigned_to === roommate?.id && assignment.status === "pending"
  );
  const restOfWeek = thisWeek.filter(
    (assignment) => !yours.some((row) => row.id === assignment.id)
  );
  const history = assignments.filter((assignment) => assignment.status !== "pending").slice(0, 12);

  const scores = roommates.map((person) => {
    const theirs = assignments.filter((assignment) => assignment.assigned_to === person.id);
    return {
      person,
      points: totalPoints(
        theirs.map((assignment) => ({
          status: assignment.status,
          pointsAwarded: assignment.points_awarded,
        }))
      ),
      streak: calculateStreak(
        theirs.map((assignment) => ({
          status: assignment.status,
          dueDate: assignment.due_date,
        }))
      ),
    };
  });

  async function onSeed() {
    if (!roommate) return;
    setBusy(true);
    try {
      await seedDefaultChores(
        roommate.id,
        roommates.map((person) => person.id)
      );
      toast.success("Weekly chores are set");
      await load();
    } catch (seedError) {
      toast.error(seedError instanceof Error ? seedError.message : "Could not set up chores");
    } finally {
      setBusy(false);
    }
  }

  async function onComplete(assignment: ChoreAssignment) {
    if (!roommate) return;
    setBusy(true);
    try {
      await completeChoreAssignment(assignment.id, roommate.id);
      toast.success("Nice. Logged.");
      await load();
    } catch (completeError) {
      toast.error(
        completeError instanceof Error ? completeError.message : "Could not complete chore"
      );
    } finally {
      setBusy(false);
    }
  }

  const nameFor = (id: string) =>
    roommates.find((person) => person.id === id)?.name ?? "Roommate";

  return (
    <div>
      <PageHeader
        title="Chores"
        subtitle={`${copy.choresSubtitle} Due ${formatShortDate(dueDate)}.`}
      />

      {templates === null || !roommate ? (
        <LoadingSkeleton rows={3} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No chores yet."
          description="Set up kitchen, bathroom, trash, vacuum, and mopping. Turns rotate every week."
          action={
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              disabled={busy}
              onClick={() => void onSeed()}
            >
              {busy ? "Setting up…" : "Use default chores"}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 pb-16">
          <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Points
            </h2>
            <ul className="mt-3 grid gap-3">
              {scores.map((score) => (
                <li key={score.person.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={score.person.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{score.person.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {score.streak} week streak
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{score.points} pts</p>
                </li>
              ))}
            </ul>
          </section>

          {yours.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Yours this week
              </h2>
              {yours.map((assignment) => (
                <ChoreCard
                  key={assignment.id}
                  assignment={assignment}
                  template={templateById.get(assignment.chore_template_id)}
                  assignee={roommates.find((person) => person.id === assignment.assigned_to)}
                  highlight
                  busy={busy}
                  onComplete={onComplete}
                />
              ))}
            </section>
          ) : null}

          {thisWeek.length === 0 ? (
            <section>
              <EmptyState
                title="Nothing assigned."
                description="Add a chore or wait for this week's rotation."
              />
            </section>
          ) : restOfWeek.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                This week
              </h2>
              {restOfWeek.map((assignment) => (
                <ChoreCard
                  key={assignment.id}
                  assignment={assignment}
                  template={templateById.get(assignment.chore_template_id)}
                  assignee={roommates.find((person) => person.id === assignment.assigned_to)}
                  busy={busy}
                  onComplete={
                    assignment.status === "pending" ? onComplete : undefined
                  }
                />
              ))}
            </section>
          ) : null}

          {history.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                History
              </h2>
              {history.map((assignment) => (
                <p
                  key={assignment.id}
                  className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border"
                >
                  <span className="font-medium">
                    {templateById.get(assignment.chore_template_id)?.name ?? "Chore"}
                  </span>
                  {" · "}
                  {nameFor(assignment.assigned_to)}
                  {" · "}
                  {assignment.status}
                  {" · "}
                  {formatShortDate(assignment.due_date)}
                </p>
              ))}
            </section>
          ) : null}
        </div>
      )}

      <FloatingActionButton href="/chores/new" label="Add chore" />
    </div>
  );
}
