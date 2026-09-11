"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PushSettings } from "@/components/pwa/PushSettings";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { lockThisPhone, useRoommate } from "@/contexts/CurrentRoommateContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function SettingsPage() {
  const { roommate, switchRoommate } = useRoommate();
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  return (
    <div>
      <PageHeader title="Settings" subtitle="This phone’s roommate identity." backHref="/more" />
      {roommate ? (
        <div className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-4">
            <UserAvatar name={roommate.name} size="lg" />
            <div>
              <p className="text-lg font-semibold">{roommate.name}</p>
              <p className="text-sm text-foreground/80">Signed in on this browser</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-5 min-h-11 w-full"
            onClick={() => setConfirmSwitch(true)}
          >
            Switch roommate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="mt-2 min-h-11 w-full"
            onClick={() => {
              void lockThisPhone().finally(() => window.location.reload());
            }}
          >
            Lock with PIN
          </Button>
        </div>
      ) : null}
      <div className="mt-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <ThemeToggle />
      </div>
      <div className="mt-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <p className="text-lg font-semibold">Phone alerts</p>
        <div className="mt-3">
          <PushSettings />
        </div>
      </div>
      <ConfirmDialog
        open={confirmSwitch}
        title="Switch roommate?"
        description="You'll need the apartment PIN again. Anything logged after that, including money, is recorded as the new name."
        confirmLabel="Switch"
        onOpenChange={setConfirmSwitch}
        onConfirm={() => switchRoommate()}
      />
    </div>
  );
}
