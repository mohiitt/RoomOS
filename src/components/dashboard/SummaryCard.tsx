import Link from "next/link";

export function SummaryCard({
  href,
  label,
  title,
  detail,
}: {
  href: string;
  label: string;
  title: string;
  detail?: string;
}) {
  return (
    <Link href={href} className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl leading-tight">{title}</p>
      {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
    </Link>
  );
}
