"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors",
        dark ? "bg-primary" : "bg-muted ring-1 ring-border",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-card shadow-sm transition-transform",
          dark && "translate-x-6 bg-primary-foreground"
        )}
      >
        {dark ? (
          <Moon className="size-3.5 text-primary" strokeWidth={2.4} />
        ) : (
          <Sun className="size-3.5 text-primary" strokeWidth={2.4} />
        )}
      </span>
    </button>
  );
}

export function ThemeToggle() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-lg font-semibold">Appearance</p>
        <p className="text-sm text-muted-foreground">Light cream or terracotta night.</p>
      </div>
      <ThemeSwitch />
    </div>
  );
}
