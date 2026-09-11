import assert from "node:assert/strict";
import test from "node:test";
import { buildAttention } from "./attention.ts";
import {
  apartmentVibe,
  choreStatLabel,
  foodStatLabel,
  moneyStatLabel,
  roommateOfTheWeek,
  streakCopy,
} from "./vibe.ts";

test("apartment vibe prefers sponge drama over money", () => {
  assert.equal(
    apartmentVibe({ overdueChores: 2, openUrgent: 0, moneyNet: 80, expiring: 4 }).mood,
    "sponge drama"
  );
  assert.equal(
    apartmentVibe({ overdueChores: 0, openUrgent: 0, moneyNet: 0, expiring: 0 }).mood,
    "chill"
  );
});

test("stat cards are numbers, not call-to-action copy", () => {
  assert.equal(moneyStatLabel(40), "+$40.00");
  assert.equal(moneyStatLabel(-12.5), "−$12.50");
  assert.equal(moneyStatLabel(0), "$0.00");
  assert.equal(foodStatLabel(0, 2), "0 expiring · 2 low");
  assert.equal(choreStatLabel(1, 0), "1 yours");
  assert.equal(choreStatLabel(1, 2), "2 overdue");
});

test("needs attention hides due-this-week chores and fresh balances", () => {
  const items = buildAttention({
    viewerId: "a",
    moneyNet: 40,
    oldestUnsettledExpenseDate: "2026-09-08",
    overdueChores: [],
    expiringItems: [],
    yourIssues: [],
    today: "2026-09-10",
  });
  assert.equal(items.length, 0);
});

test("needs attention includes stale owed, overdue chores, expiring food, assigned issues", () => {
  const items = buildAttention({
    viewerId: "a",
    moneyNet: 40,
    oldestUnsettledExpenseDate: "2026-08-01",
    overdueChores: [{ id: "c1", name: "Kitchen", dueDate: "2026-09-01" }],
    expiringItems: [{ id: "m1", name: "Milk" }],
    yourIssues: [{ id: "i1", title: "Leaky faucet" }],
    today: "2026-09-10",
  });
  assert.equal(items.length, 4);
  assert.equal(items[0].id, "money-stale");
  assert.equal(items[1].id, "chore-c1");
  assert.match(items[2].title, /Milk/);
  assert.equal(items[3].id, "issue-i1");
});

test("zero streak shrugs instead of reading as a failure number", () => {
  assert.equal(streakCopy(0).shrugging, true);
  assert.equal(streakCopy(3).label, "3 week flame");
});

test("roommate of the week is most points, then earliest completion", () => {
  const winner = roommateOfTheWeek([
    { id: "a", name: "Mohit", points: 10, earliestCompletedAt: "2026-09-09T10:00:00Z" },
    { id: "b", name: "Sarvesh", points: 20, earliestCompletedAt: "2026-09-10T10:00:00Z" },
    { id: "c", name: "Atharva", points: 0, earliestCompletedAt: null },
  ]);
  assert.equal(winner?.name, "Sarvesh");
  assert.equal(roommateOfTheWeek([{ id: "a", name: "Mohit", points: 0, earliestCompletedAt: null }]), null);
});
