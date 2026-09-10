import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Bell,
  Bot,
  ClipboardList,
  Settings,
  ShoppingBasket,
  TriangleAlert,
} from "lucide-react";

const LINKS = [
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/issues", label: "Issues", icon: TriangleAlert },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/activity", label: "Activity", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" subtitle="Everything else in the apartment." />
      <div className="grid gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-16 items-center gap-4 rounded-3xl bg-card px-4 shadow-sm ring-1 ring-border"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
              </span>
              <span className="text-lg font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
