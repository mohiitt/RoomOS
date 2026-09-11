import Link from "next/link";
import { Banknote, Refrigerator, Sparkles, TriangleAlert } from "lucide-react";
import { copy } from "@/lib/copy";

const JUMPS = [
  { href: "/money/new", label: "Money", prompt: "Split a receipt", icon: Banknote },
  { href: "/inventory/new", label: "Food", prompt: "Stock the fridge", icon: Refrigerator },
  { href: "/chores/new", label: "Chores", prompt: "Put the sponge to work", icon: Sparkles },
  { href: "/issues/new", label: "Issues", prompt: "Report the leak", icon: TriangleAlert },
];

export function HomeQuiet() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 py-2">
      <section className="rounded-3xl bg-gradient-to-b from-card to-secondary/50 px-5 py-6 text-center shadow-sm ring-1 ring-border/70">
        <h2 className="font-heading text-2xl">{copy.homeQuietTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.homeQuietBody}</p>
      </section>
      <ul className="grid grid-cols-2 items-start gap-3">
        {JUMPS.map((jump) => {
          const Icon = jump.icon;
          return (
            <li key={jump.href}>
              <Link
                href={jump.href}
                className="flex h-auto w-full flex-col gap-2 rounded-2xl bg-card px-4 py-4 shadow-sm ring-1 ring-border/80 transition active:translate-y-px"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="font-medium">{jump.label}</span>
                <span className="text-sm leading-5 text-foreground/80">{jump.prompt}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

