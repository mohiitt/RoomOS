"use client";

import { useCallback, useEffect, useState } from "react";
import { IssueCard } from "@/components/issues/IssueCard";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { isOpenStatus } from "@/lib/issues/constants.ts";
import { listConcerns } from "@/lib/issues/queries.ts";
import { useRealtimeConcerns } from "@/hooks/useRealtime.ts";
import { copy } from "@/lib/copy";
import type { Concern } from "@/types/database";

export default function IssuesPage() {
  const { roommates } = useRoommate();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [concerns, setConcerns] = useState<Concern[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void listConcerns()
      .then(setConcerns)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load issues");
        setConcerns([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeConcerns(load);

  const visible = (concerns ?? []).filter((concern) =>
    tab === "open" ? isOpenStatus(concern.status) : concern.status === "resolved"
  );

  return (
    <div>
      <PageHeader title="Issues" subtitle={copy.issuesSubtitle} />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={tab === "open" ? "default" : "outline"}
          size="lg"
          className="min-h-11"
          onClick={() => setTab("open")}
        >
          Open
        </Button>
        <Button
          type="button"
          variant={tab === "resolved" ? "default" : "outline"}
          size="lg"
          className="min-h-11"
          onClick={() => setTab("resolved")}
        >
          Resolved
        </Button>
      </div>

      {concerns === null ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === "open" ? "No open concerns." : "Nothing resolved yet."}
          description={
            tab === "open"
              ? "Report the leak, the noise, or the weird smell before it turns into a group-chat thread."
              : "Closed issues will show up here."
          }
        />
      ) : (
        <div className="grid gap-3 pb-16">
          {visible.map((concern) => (
            <IssueCard
              key={concern.id}
              concern={concern}
              reporter={roommates.find((person) => person.id === concern.reported_by)}
              assignee={roommates.find((person) => person.id === concern.assigned_to)}
            />
          ))}
        </div>
      )}

      <FloatingActionButton href="/issues/new" label="Report issue" />
    </div>
  );
}
