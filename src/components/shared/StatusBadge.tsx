import { cn } from "@/lib/utils";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
        tone === "neutral" && "bg-secondary text-secondary-foreground",
        tone === "good" &&
          "bg-[oklch(0.93_0.05_145)] text-[oklch(0.32_0.07_145)] dark:bg-primary/20 dark:text-primary",
        tone === "warn" &&
          "bg-[oklch(0.94_0.07_85)] text-[oklch(0.42_0.1_55)] dark:bg-amber-400/15 dark:text-amber-200",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "info" &&
          "bg-[oklch(0.93_0.03_250)] text-[oklch(0.35_0.08_250)] dark:bg-primary/15 dark:text-primary"
      )}
    >
      {children}
    </span>
  );
}
