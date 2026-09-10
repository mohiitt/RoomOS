import Link from "next/link";
import { Plus } from "lucide-react";

const fabClass =
  "fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg";

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
        <Plus className="size-7" />
      </button>
    );
  }

  return (
    <Link href={href ?? "/"} aria-label={label} className={fabClass}>
      <Plus className="size-7" />
    </Link>
  );
}
