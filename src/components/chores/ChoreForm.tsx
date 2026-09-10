"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Roommate } from "@/types/database";

export type ChoreFormValues = {
  name: string;
  description: string | null;
  points: number;
  roommateIds: string[];
};

export function ChoreForm({
  roommates,
  busy,
  submitLabel,
  onSubmit,
}: {
  roommates: Roommate[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (values: ChoreFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("10");
  const [selected, setSelected] = useState(roommates.map((person) => person.id));
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const numericPoints = Number(points);
    if (!trimmed) {
      setError("Give the chore a name.");
      return;
    }
    if (!(numericPoints >= 0)) {
      setError("Points must be zero or more.");
      return;
    }
    if (selected.length < 1) {
      setError("Choose at least one roommate.");
      return;
    }
    setError(null);
    await onSubmit({
      name: trimmed,
      description: description.trim() || null,
      points: numericPoints,
      roommateIds: roommates.filter((person) => selected.includes(person.id)).map((person) => person.id),
    });
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <Label htmlFor="chore-name">Name</Label>
        <Input
          id="chore-name"
          className="min-h-12 text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Kitchen cleaning"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="chore-description">Notes</Label>
        <Textarea
          id="chore-description"
          className="min-h-20 text-base"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What done looks like"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="chore-points">Points</Label>
        <Input
          id="chore-points"
          className="min-h-12 text-base"
          inputMode="numeric"
          value={points}
          onChange={(event) => setPoints(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Rotation</Label>
        <div className="grid gap-2">
          {roommates.map((person) => {
            const on = selected.includes(person.id);
            return (
              <Button
                key={person.id}
                type="button"
                variant={on ? "default" : "outline"}
                size="lg"
                className="min-h-11 justify-start"
                onClick={() => toggle(person.id)}
              >
                {person.name}
              </Button>
            );
          })}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="min-h-11" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
