"use client";

import Image from "next/image";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { copy } from "@/lib/copy";
import type { Roommate } from "@/types/database";

export function RoommateSelector({
  roommates,
  onSelect,
}: {
  roommates: Roommate[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <Image
          src="/landing-kitchen.png"
          alt=""
          width={640}
          height={448}
          className="h-56 w-full rounded-3xl object-cover"
          priority
        />
        <p className="mt-6 text-sm font-medium tracking-[0.2em] text-primary uppercase">
          {copy.landingKicker}
        </p>
        <h1 className="font-heading mt-3 text-4xl leading-tight">
          {copy.landingHeadline}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{copy.landingSub}</p>
        <div className="mt-8 grid gap-3">
          {roommates.map((roommate) => (
            <button
              key={roommate.id}
              type="button"
              onClick={() => onSelect(roommate.id)}
              className="flex min-h-16 items-center gap-4 rounded-2xl bg-card px-4 py-3 text-left shadow-sm ring-1 ring-border transition active:translate-y-px"
            >
              <UserAvatar name={roommate.name} />
              <span className="text-lg font-medium">{roommate.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
