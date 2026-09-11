import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatTile({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl px-4 py-3 ring-1 shadow-sm",
        tone === "warn"
          ? "bg-primary/8 ring-primary/30"
          : "bg-card ring-border/80"
      )}
    >
      <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl leading-tight">{value}</p>
    </Link>
  );
}
