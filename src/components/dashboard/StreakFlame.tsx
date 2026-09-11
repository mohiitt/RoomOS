export function StreakFlame({
  weeks,
  label,
  shrugging,
}: {
  weeks: number;
  label: string;
  shrugging: boolean;
}) {
  if (shrugging) {
    return (
      <p className="text-sm text-foreground/80">
        <span aria-hidden>🤷</span> {label}
      </p>
    );
  }

  return (
    <p className="text-sm text-foreground">
      <span aria-hidden>{weeks >= 4 ? "🔥🔥" : "🔥"}</span> {label}
    </p>
  );
}
