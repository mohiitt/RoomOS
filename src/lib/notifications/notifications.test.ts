import assert from "node:assert/strict";
import test from "node:test";
import {
  excludeActor,
  hrefForNotification,
  lowStockRecipients,
  shouldNotifyExpiring,
  shouldNotifyLowStock,
  unreadLabel,
  shouldSendPush,
} from "./createNotification.ts";

test("the person who acted is not notified", () => {
  assert.deepEqual(excludeActor(["a", "b", "c"], "b"), ["a", "c"]);
  assert.deepEqual(excludeActor(["a", "b"], null), ["a", "b"]);
});

test("low stock notifies when quantity first crosses the minimum", () => {
  assert.equal(
    shouldNotifyLowStock({ quantityBefore: 3, quantityAfter: 1, minimumQuantity: 2 }),
    true
  );
  assert.equal(
    shouldNotifyLowStock({ quantityBefore: 1, quantityAfter: 0, minimumQuantity: 2 }),
    false
  );
  assert.equal(
    shouldNotifyLowStock({ quantityBefore: 5, quantityAfter: 4, minimumQuantity: 2 }),
    false
  );
  assert.equal(
    shouldNotifyLowStock({ quantityBefore: 5, quantityAfter: 1, minimumQuantity: null }),
    false
  );
});

test("personal low stock goes only to the owner", () => {
  assert.deepEqual(
    lowStockRecipients({
      ownershipType: "personal",
      ownerId: "urmi",
      roommateIds: ["mohit", "urmi", "jainil"],
    }),
    ["urmi"]
  );
  assert.deepEqual(
    lowStockRecipients({
      ownershipType: "shared",
      ownerId: null,
      roommateIds: ["mohit", "urmi"],
    }),
    ["mohit", "urmi"]
  );
});

test("expiring covers today, tomorrow, and already gone", () => {
  const today = "2026-09-10";
  assert.equal(shouldNotifyExpiring("2026-09-10", today), true);
  assert.equal(shouldNotifyExpiring("2026-09-13", today), true);
  assert.equal(shouldNotifyExpiring("2026-09-20", today), false);
  assert.equal(shouldNotifyExpiring(null, today), false);
});

test("notification taps open the matching screen", () => {
  assert.equal(
    hrefForNotification({ entity_type: "expense", entity_id: "exp-1" }),
    "/money/expense/exp-1"
  );
  assert.equal(
    hrefForNotification({ entity_type: "concern", entity_id: "iss-1" }),
    "/issues/iss-1"
  );
  assert.equal(
    hrefForNotification({ entity_type: "chore_assignment", entity_id: "ch-1" }),
    "/chores"
  );
  assert.equal(
    hrefForNotification({ entity_type: "inventory_item", entity_id: "food-1" }),
    "/inventory/food-1"
  );
});

test("unread badge caps at nine", () => {
  assert.equal(unreadLabel(0), "");
  assert.equal(unreadLabel(3), "3");
  assert.equal(unreadLabel(12), "9+");
});

test("lock-screen push is only for important apartment events", () => {
  assert.equal(shouldSendPush("expense_added"), true);
  assert.equal(shouldSendPush("chore_due"), true);
  assert.equal(shouldSendPush("shopping_added"), false);
  assert.equal(shouldSendPush("concern_created", "urgent"), true);
  assert.equal(shouldSendPush("concern_created", "low"), false);
});
