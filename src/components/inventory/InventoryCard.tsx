import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getExpiryStatus } from "@/lib/inventory/checkExpiry";
import { isLowStock } from "@/lib/inventory/checkLowStock";
import { labelForLocation } from "@/lib/inventory/constants";
import { formatQuantity } from "@/lib/inventory/format";
import { formatShortDate } from "@/lib/dates";
import type { InventoryItem, Roommate } from "@/types/database";

function expiryTone(item: InventoryItem) {
  const status = getExpiryStatus(item.expiry_date);
  if (status === "expired" || status === "critical") return "bad" as const;
  if (status === "soon") return "warn" as const;
  return null;
}

export function InventoryCard({
  item,
  owner,
}: {
  item: InventoryItem;
  owner?: Roommate;
}) {
  const expiry = expiryTone(item);
  const low = isLowStock(item.quantity, item.minimum_quantity);

  return (
    <Link
      href={`/inventory/${item.id}`}
      className="block rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border/80 transition active:translate-y-px"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatQuantity(item.quantity, item.unit)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {labelForLocation(item.storage_location)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge>
          {item.ownership_type === "personal"
            ? owner?.name ?? "Personal"
            : "Shared"}
        </StatusBadge>
        {low ? <StatusBadge tone="warn">Low stock</StatusBadge> : null}
        {item.expiry_date && expiry ? (
          <StatusBadge tone={expiry}>
            {getExpiryStatus(item.expiry_date) === "expired"
              ? "Expired"
              : `Expires ${formatShortDate(item.expiry_date)}`}
          </StatusBadge>
        ) : null}
      </div>
    </Link>
  );
}
