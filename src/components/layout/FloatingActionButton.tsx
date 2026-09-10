import Link from "next/link";
import { Plus } from "lucide-react";

const fabClass =
  "fixed bottom-28 left-1/2 z-50 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--primary)_50%,transparent)] ring-4 ring-background transition active:translate-y-px";

export function FloatingActionButton({
  href,
  label,
  onClick,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" aria-label={label} className={fabClass} onClick={onClick}>
        <Plus className="size-9" strokeWidth={2.75} />
      </button>
    );
  }

  return (
    <Link href={href ?? "/"} aria-label={label} className={fabClass}>
      <Plus className="size-9" strokeWidth={2.75} />
    </Link>
  );
}
