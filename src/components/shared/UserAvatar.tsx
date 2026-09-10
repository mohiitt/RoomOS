import { cn } from "@/lib/utils";
import { avatarClassFor, initialsFor } from "@/lib/roommates/avatar";

export function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        avatarClassFor(name),
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-14 text-lg"
      )}
      aria-hidden
    >
      {initialsFor(name)}
    </span>
  );
}
