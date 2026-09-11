"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Banknote,
  Refrigerator,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UnreadDot } from "@/components/notifications/NotificationBell";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/money", label: "Money", icon: Banknote },
  { href: "/inventory", label: "Food", icon: Refrigerator },
  { href: "/chores", label: "Chores", icon: Sparkles },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/inventory") {
    return (
      pathname === "/inventory" ||
      pathname.startsWith("/inventory/") ||
      pathname === "/recipes" ||
      pathname.startsWith("/recipes/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/20 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-2xl",
                  active && "bg-primary/12"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.href === "/more" ? <UnreadDot compact /> : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
