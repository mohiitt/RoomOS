import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/inventory/format";
import type { ShoppingItem, Roommate } from "@/types/database";

const REASON_LABEL: Record<ShoppingItem["reason"], string> = {
  manual: "Manual",
  low_stock: "Low stock",
  expired: "Expired",
  planned: "Planned",
};

export function ShoppingItemCard({
  item,
  roommates,
  onPurchase,
  onRemove,
}: {
  item: ShoppingItem;
  roommates: Roommate[];
  onPurchase?: (item: ShoppingItem) => void;
  onRemove?: (item: ShoppingItem) => void;
}) {
  const addedBy = roommates.find((person) => person.id === item.added_by);
  const purchasedBy = roommates.find((person) => person.id === item.purchased_by);
  const qty =
    item.requested_quantity !== null
      ? formatQuantity(item.requested_quantity, item.unit ?? undefined)
      : item.unit;

  return (
    <article className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{item.name}</h2>
          {qty ? <p className="mt-1 text-sm text-muted-foreground">{qty}</p> : null}
        </div>
        <StatusBadge tone={item.reason === "low_stock" ? "warn" : "neutral"}>
          {REASON_LABEL[item.reason]}
        </StatusBadge>
      </div>

      {item.status === "needed" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            className="min-h-11"
            onClick={() => onPurchase?.(item)}
          >
            Purchased
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            onClick={() => onRemove?.(item)}
          >
            Remove
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {purchasedBy ? `Bought by ${purchasedBy.name}` : addedBy ? `Added by ${addedBy.name}` : "Purchased"}
        </p>
      )}
    </article>
  );
}
