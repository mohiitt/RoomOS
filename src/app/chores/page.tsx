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
import { fireBurst } from "@/components/dashboard/Burst";
import { StreakFlame } from "@/components/dashboard/StreakFlame";
import { streakCopy } from "@/lib/dashboard/vibe.ts";
import {
  completeChoreAssignment,
  generateDueChoreAssignments,
  listChoreAssignments,
  listChoreTemplates,
  listPendingSwaps,
  requestChoreSwap,
  respondChoreSwap,
  seedDefaultChores,
} from "@/lib/chores/queries.ts";
import type { ChoreAssignment, ChoreSwapRequest, ChoreTemplate } from "@/types/database";
import { weekDueDate } from "@/lib/chores/week.ts";
import { formatShortDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import { useRealtimeChores } from "@/hooks/useRealtime.ts";
import Link from "next/link";

export default function ChoresPage() {
  const { roommate, roommates } = useRoommate();
  const [templates, setTemplates] = useState<ChoreTemplate[] | null>(null);
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [swaps, setSwaps] = useState<ChoreSwapRequest[]>([]);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dueDate = weekDueDate();

  async function load() {
    try {
      setError(null);
      await generateDueChoreAssignments();
      const [nextTemplates, nextAssignments, nextSwaps] = await Promise.all([
        listChoreTemplates(),
        listChoreAssignments(),
        listPendingSwaps().catch(() => [] as ChoreSwapRequest[]),
      ]);
      setTemplates(nextTemplates);
      setAssignments(nextAssignments);
      setSwaps(nextSwaps);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load chores");
      setTemplates([]);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const [nextTemplates, nextAssignments, nextSwaps] = await Promise.all([
        listChoreTemplates(),
        listChoreAssignments(),
        listPendingSwaps().catch(() => [] as ChoreSwapRequest[]),
      ]);
      setTemplates(nextTemplates);
      setAssignments(nextAssignments);
      setSwaps(nextSwaps);
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

  const current = assignments.filter((assignment) => assignment.status === "pending");
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
      fireBurst();
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
          {swaps.filter((swap) => swap.to_roommate_id === roommate.id).length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Swap requests
              </h2>
              {swaps
                .filter((swap) => swap.to_roommate_id === roommate.id)
                .map((swap) => {
                  const assignment = assignments.find((row) => row.id === swap.assignment_id);
                  const chore = assignment
                    ? templateById.get(assignment.chore_template_id)?.name
                    : "a chore";
                  return (
                    <div key={swap.id} className="rounded-3xl bg-primary/8 p-4 ring-1 ring-primary/25">
                      <p className="font-medium">
                        {nameFor(swap.from_roommate_id)} wants to swap {chore}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="lg"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() =>
                            void respondChoreSwap(swap.id, true)
                              .then(() => {
                                toast.success("Swap accepted");
                                return load();
                              })
                              .catch((swapError: unknown) =>
                                toast.error(
                                  swapError instanceof Error ? swapError.message : "Could not accept"
                                )
                              )
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() =>
                            void respondChoreSwap(swap.id, false)
                              .then(() => {
                                toast.success("Declined");
                                return load();
                              })
                              .catch((swapError: unknown) =>
                                toast.error(
                                  swapError instanceof Error ? swapError.message : "Could not decline"
                                )
                              )
                          }
                        >
                          No thanks
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </section>
          ) : null}

          <section className="grid gap-3">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              This week in the apartment
            </h2>
            {current.length === 0 ? (
              <EmptyState
                title="Nothing assigned."
                description="Add a chore or wait for this week's rotation."
              />
            ) : (
              current.map((assignment) => (
                <div key={assignment.id} className="grid gap-2">
                  <ChoreCard
                    assignment={assignment}
                    template={templateById.get(assignment.chore_template_id)}
                    assignee={roommates.find((person) => person.id === assignment.assigned_to)}
                    highlight={assignment.assigned_to === roommate.id}
                    busy={busy}
                    onComplete={assignment.status === "pending" ? onComplete : undefined}
                  />
                  {assignment.assigned_to === roommate.id && assignment.status === "pending" ? (
                    swapFor === assignment.id ? (
                      <div className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
                        <p className="text-sm">Ask someone to take this.</p>
                        {roommates
                          .filter((person) => person.id !== roommate.id)
                          .map((person) => (
                            <Button
                              key={person.id}
                              type="button"
                              variant="outline"
                              size="lg"
                              className="min-h-11 justify-start"
                              disabled={busy}
                              onClick={() =>
                                void requestChoreSwap(assignment.id, person.id)
                                  .then(() => {
                                    toast.success(`Asked ${person.name}`);
                                    setSwapFor(null);
                                    return load();
                                  })
                                  .catch((swapError: unknown) =>
                                    toast.error(
                                      swapError instanceof Error
                                        ? swapError.message
                                        : "Could not ask"
                                    )
                                  )
                              }
                            >
                              {person.name}
                            </Button>
                          ))}
                        <Button type="button" variant="ghost" onClick={() => setSwapFor(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start"
                        onClick={() => setSwapFor(assignment.id)}
                      >
                        Request a swap
                      </Button>
                    )
                  ) : null}
                </div>
              ))
            )}
          </section>

          <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Points
            </h2>
            <ul className="mt-3 grid gap-3">
              {scores.map((score) => {
                const flame = streakCopy(score.streak);
                return (
                  <li key={score.person.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={score.person.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{score.person.name}</p>
                        <StreakFlame
                          weeks={score.streak}
                          label={flame.label}
                          shrugging={flame.shrugging}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium">{score.points} pts</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Chore list
            </h2>
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/chores/${template.id}/edit`}
                className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
              >
                <span>
                  <span className="font-medium">{template.name}</span>
                  <span className="mt-0.5 block text-xs text-foreground/80">
                    {template.frequency} · {template.points} pts
                  </span>
                </span>
                <span className="text-sm font-medium text-primary">Edit</span>
              </Link>
            ))}
          </section>

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
