"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Roommate } from "@/types/database";
import {
  resolveUnlockStatus,
  statusAfterVerifiedPin,
} from "@/lib/auth/session";
import {
  getStoredRoommateId,
  setApartmentAccess,
  setStoredRoommateId,
} from "@/lib/auth/storage";
import {
  fetchSession,
  listRoommates,
  lockSession,
  switchSessionRoommate,
} from "@/lib/roommates/queries";
import { rebindPushSubscription } from "@/lib/push/browser";

type SessionStatus = "loading" | "pin" | "select" | "ready" | "error";

type RoommateContextValue = {
  status: SessionStatus;
  error: string | null;
  roommates: Roommate[];
  roommate: Roommate | null;
  verifyPin: (pin: string) => Promise<void>;
  selectRoommate: (id: string) => void;
  switchRoommate: () => void;
  reload: () => Promise<void>;
};

const RoommateContext = createContext<RoommateContextValue | null>(null);

export function RoommateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [roommate, setRoommate] = useState<Roommate | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [people, session] = await Promise.all([listRoommates(), fetchSession()]);
      setRoommates(people);
      const storedId = session.unlocked ? session.roommateId : getStoredRoommateId();
      const current = people.find((person) => person.id === storedId) ?? null;
      if (session.unlocked && current) {
        setStoredRoommateId(current.id);
        setApartmentAccess(true);
      }
      const next = resolveUnlockStatus({
        hasAccess: session.unlocked,
        storedRoommateId: storedId,
        roommateIds: people.map((person) => person.id),
      });
      setRoommate(current);
      setStatus(next);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not start RoomOS"
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verifyPin = useCallback(async (pin: string) => {
    const storedId = getStoredRoommateId();
    const nextStatus = statusAfterVerifiedPin(
      storedId,
      roommates.map((person) => person.id)
    );
    if (nextStatus !== "ready" || !storedId) {
      setRoommate(null);
      setStatus("select");
      throw new Error("Pick your name first");
    }

    const response = await fetch("/api/auth/pin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, roommateId: storedId }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Wrong PIN");
    }

    const current = roommates.find((person) => person.id === storedId) ?? null;
    if (!current) {
      setRoommate(null);
      setStatus("select");
      return;
    }

    setApartmentAccess(true);
    setRoommate(current);
    setStatus("ready");
  }, [roommates]);

  const selectRoommate = useCallback(
    (id: string) => {
      const current = roommates.find((person) => person.id === id) ?? null;
      if (!current) return;
      setStoredRoommateId(current.id);
      setRoommate(current);
      setStatus("pin");
      void (async () => {
        try {
          const session = await fetchSession();
          if (session.unlocked) {
            await switchSessionRoommate(current.id);
            await rebindPushSubscription();
            setStatus("ready");
          }
        } catch {
          setStatus("pin");
        }
      })();
    },
    [roommates]
  );

  const switchRoommate = useCallback(() => {
    setStoredRoommateId(null);
    setRoommate(null);
    setStatus("select");
  }, []);

  const value = useMemo(
    () => ({
      status,
      error,
      roommates,
      roommate,
      verifyPin,
      selectRoommate,
      switchRoommate,
      reload: load,
    }),
    [
      status,
      error,
      roommates,
      roommate,
      verifyPin,
      selectRoommate,
      switchRoommate,
      load,
    ]
  );

  return (
    <RoommateContext.Provider value={value}>{children}</RoommateContext.Provider>
  );
}

export function useRoommate() {
  const context = useContext(RoommateContext);
  if (!context) {
    throw new Error("useRoommate must be used inside RoommateProvider");
  }
  return context;
}

export async function lockThisPhone() {
  setApartmentAccess(false);
  setStoredRoommateId(null);
  await lockSession();
}
