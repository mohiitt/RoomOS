"use client";

import { useEffect, useState } from "react";

export function fireBurst() {
  window.dispatchEvent(new Event("roomos:burst"));
}

export function Burst() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    function show() {
      setOn(true);
      window.setTimeout(() => setOn(false), 900);
    }
    window.addEventListener("roomos:burst", show);
    return () => window.removeEventListener("roomos:burst", show);
  }, []);

  if (!on) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden
    >
      <span className="animate-ping rounded-full bg-primary/40 px-8 py-8 text-4xl">✓</span>
    </div>
  );
}
