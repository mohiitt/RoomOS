"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONCERN_PRIORITIES } from "@/lib/issues/constants.ts";
import type { ConcernPriority } from "@/lib/issues/constants.ts";
import type { Roommate } from "@/types/database";

export type IssueFormValues = {
  title: string;
  description: string | null;
  priority: ConcernPriority;
  assignedTo: string | null;
  photo: File | null;
};

export function IssueForm({
  roommates,
  busy,
  submitLabel,
  onSubmit,
}: {
  roommates: Roommate[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (values: IssueFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ConcernPriority>("medium");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the issue a name.");
      return;
    }
    setError(null);
    await onSubmit({
      title: trimmed,
      description: description.trim() || null,
      priority,
      assignedTo,
      photo,
    });
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <Label htmlFor="issue-title">What is wrong?</Label>
        <Input
          id="issue-title"
          className="min-h-12 text-base"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Leaky kitchen faucet"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issue-description">Details</Label>
        <Textarea
          id="issue-description"
          className="min-h-24 text-base"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Where it is, when it started, anything already tried."
        />
      </div>
      <div className="grid gap-2">
        <Label>Priority</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONCERN_PRIORITIES.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={priority === item.value ? "default" : "outline"}
              size="lg"
              className="min-h-11"
              onClick={() => setPriority(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Assign to</Label>
        <div className="grid gap-2">
          <Button
            type="button"
            variant={assignedTo === null ? "default" : "outline"}
            size="lg"
            className="min-h-11 justify-start"
            onClick={() => setAssignedTo(null)}
          >
            Unassigned
          </Button>
          {roommates.map((person) => (
            <Button
              key={person.id}
              type="button"
              variant={assignedTo === person.id ? "default" : "outline"}
              size="lg"
              className="min-h-11 justify-start"
              onClick={() => setAssignedTo(person.id)}
            >
              {person.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issue-photo">Photo</Label>
        <Input
          id="issue-photo"
          className="min-h-12 pt-2 text-base"
          type="file"
          accept="image/*"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="min-h-11" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
