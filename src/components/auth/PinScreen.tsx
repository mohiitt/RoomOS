"use client";

import { Delete, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { copy, pinHey, wrongPinLine } from "@/lib/copy";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function PinScreen({
  roommateName,
  onSubmit,
  onNotYou,
}: {
  roommateName: string | null;
  onSubmit: (pin: string) => Promise<void>;
  onNotYou: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function submit(nextPin: string) {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(nextPin);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Wrong PIN";
      setError(message === "Pick your name first" ? message : wrongPinLine(attempts));
      setAttempts((current) => current + 1);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(key: string) {
    if (busy) return;
    if (key === "del") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (!key || pin.length >= 4) return;
    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === 4) void submit(next);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <img
          src="/landing-kitchen.png"
          alt=""
          className="h-40 w-full rounded-3xl object-cover"
        />
        <p className="mt-6 text-sm font-medium tracking-[0.2em] text-primary uppercase">
          {copy.landingKicker}
        </p>
        <h1 className="font-heading mt-3 text-4xl leading-tight text-foreground">
          {roommateName ? pinHey(roommateName) : "Welcome home."}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{copy.pinSub}</p>
        {roommateName ? (
          <button
            type="button"
            onClick={onNotYou}
            className="mt-3 text-sm font-medium text-primary"
          >
            {copy.pinNotYou}
          </button>
        ) : null}

        <div className="mt-10 flex justify-center gap-3" aria-label="PIN digits">
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              key={index}
              className={`size-4 rounded-full border-2 ${
                index < pin.length
                  ? "border-primary bg-primary"
                  : "border-border bg-transparent"
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-4 h-5 text-center text-sm text-muted-foreground">
            {busy ? copy.pinChecking : " "}
          </p>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3">
          {KEYS.map((key, index) =>
            key === "" ? (
              <span key={`pad-${index}`} />
            ) : (
              <button
                key={`pad-${index}`}
                type="button"
                disabled={busy}
                onClick={() => press(key)}
                className="flex h-16 items-center justify-center rounded-2xl bg-card text-2xl font-medium text-foreground shadow-sm ring-1 ring-border transition active:translate-y-px disabled:opacity-60"
                aria-label={key === "del" ? "Delete" : key}
              >
                {busy && key === "0" ? (
                  <Loader2Icon className="size-5 animate-spin" />
                ) : key === "del" ? (
                  <Delete className="size-6" />
                ) : (
                  key
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
