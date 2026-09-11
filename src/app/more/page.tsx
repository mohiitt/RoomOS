"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { UnreadDot } from "@/components/notifications/NotificationBell";
import {
  Bell,
  ClipboardList,
  Settings,
  ShoppingBasket,
  TriangleAlert,
} from "lucide-react";

const LINKS = [
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/issues", label: "Issues", icon: TriangleAlert },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Activity", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

const FEATURES = [
  {
    name: "Home",
    body: "Vibe, what actually needs a decision, your streak, and recent apartment noise.",
  },
  {
    name: "Money",
    body: "Log a spend, split it, attach a receipt, settle (even partway), and nudge someone who owes you. Recurring covers rent and internet.",
  },
  {
    name: "Food",
    body: "Fridge, freezer, pantry. Shared vs personal. Expiring and low-stock float up. Recipes live here too — you can send missing ingredients to shopping.",
  },
  {
    name: "Chores",
    body: "See everyone's assignment this week, mark done, swap, and keep a streak. Weekly or monthly rotations.",
  },
  {
    name: "Shopping",
    body: "The list. Manual adds, plus auto-add when food hits the minimum.",
  },
  {
    name: "Issues",
    body: "Leaky faucet energy. Priority, assignee, comments, photos, resolve.",
  },
  {
    name: "Alerts",
    body: "In-app bell, plus optional lock-screen banners on this phone.",
  },
  {
    name: "Settings",
    body: "Switch roommate, lock the session, theme, and push on this device.",
  },
];

export default function MorePage() {
  return (
    <div className="pb-8">
      <PageHeader title="More" subtitle="Everything else in the apartment." />
      <div className="grid gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-16 items-center gap-4 rounded-3xl bg-card px-4 shadow-sm ring-1 ring-border/80 transition active:translate-y-px"
            >
              <span className="relative flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
                {link.href === "/notifications" ? <UnreadDot compact /> : null}
              </span>
              <span className="text-lg font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          How to use RoomOS
        </h2>
        <div className="mt-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/80">
          <p className="text-base leading-7">
            Pick your name. Enter the four-digit PIN from the fridge. That name owns every
            write — money included — so only switch in Settings when it is actually you.
            You’ll re-enter the PIN.
          </p>
          <p className="mt-3 text-base leading-7">
            Tabs are Home, Money, Food, Chores, and More. Food has Fridge and Recipes. Add
            RoomOS to your Home Screen for the phone-app feel. You can browse offline;
            saving anything needs a connection.
          </p>
          <ul className="mt-4 grid gap-3 border-t border-border/80 pt-4">
            {FEATURES.map((feature) => (
              <li key={feature.name}>
                <p className="font-medium">{feature.name}</p>
                <p className="mt-0.5 text-sm leading-6 text-foreground/80">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
