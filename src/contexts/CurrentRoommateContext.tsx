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
  getStoredRoommateId,
  hasApartmentAccess,
  setApartmentAccess,
  setStoredRoommateId,
} from "@/lib/auth/storage";
import { listRoommates } from "@/lib/roommates/queries";

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
      const access = hasApartmentAccess();
      const people = await listRoommates();
      setRoommates(people);

      if (!access) {
        setRoommate(null);
        setStatus("pin");
        return;
      }

      const storedId = getStoredRoommateId();
      const current = people.find((person) => person.id === storedId) ?? null;
      if (!current) {
        setRoommate(null);
        setStatus("select");
        return;
      }

      setRoommate(current);
      setStatus("ready");
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
    const response = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Wrong PIN");
    }

    setApartmentAccess(true);
    const storedId = getStoredRoommateId();
    const current = roommates.find((person) => person.id === storedId) ?? null;
    setRoommate(current);
    setStatus(current ? "ready" : "select");
  }, [roommates]);

  const selectRoommate = useCallback(
    (id: string) => {
      const current = roommates.find((person) => person.id === id) ?? null;
      if (!current) return;
      setStoredRoommateId(current.id);
      setRoommate(current);
      setStatus("ready");
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
