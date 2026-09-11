"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-3xl">Something broke</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        RoomOS hit a snag. Try again, or go home.
      </p>
      <div className="flex gap-3">
        <Button type="button" size="lg" className="min-h-11" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
