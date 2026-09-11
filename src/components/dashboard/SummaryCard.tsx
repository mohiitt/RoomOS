import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function SummaryCard({
  href,
  label,
  title,
  detail,
  imageSrc,
}: {
  href: string;
  label: string;
  title: string;
  detail?: string;
  imageSrc?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative block overflow-hidden rounded-3xl shadow-sm ring-1 ring-border/80",
        imageSrc ? "min-h-40" : "bg-card"
      )}
    >
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        </>
      ) : null}
      <div className={cn("relative p-5", imageSrc ? "flex min-h-40 flex-col justify-end" : "")}>
        <p
          className={cn(
            "text-xs font-medium tracking-[0.16em] uppercase",
            imageSrc ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-2 font-heading text-2xl leading-tight",
            imageSrc ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </p>
        {detail ? (
          <p className={cn("mt-1 text-sm", imageSrc ? "text-white/80" : "text-muted-foreground")}>
            {detail}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
