import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "../expenses/money.ts";
import {
  choreHeadline,
  eventsFromChores,
  eventsFromConcerns,
  eventsFromExpenses,
  foodHeadline,
  issueHeadline,
  mergeActivity,
  moneyHeadline,
  shoppingHeadline,
} from "./summarize.ts";

test("money headline answers what you owe", () => {
  assert.equal(moneyHeadline(0, formatMoney), "Settled up");
  assert.equal(moneyHeadline(12.5, formatMoney), "You're owed $12.50");
  assert.equal(moneyHeadline(-42.5, formatMoney), "You owe $42.50");
});

test("food, shopping, and issue headlines match the dashboard copy", () => {
  assert.equal(foodHeadline(2, 3), "2 expiring · 3 low-stock");
  assert.equal(shoppingHeadline(6), "6 items needed");
  assert.equal(shoppingHeadline(1), "1 item needed");
  assert.equal(issueHeadline(1), "1 open issue");
  assert.equal(issueHeadline(0), "No open issues");
});

test("chore headline prefers your pending count", () => {
  assert.equal(choreHeadline(2, 5, true), "You have 2 chores this week");
  assert.equal(choreHeadline(0, 1, true), "1 pending this week");
  assert.equal(choreHeadline(0, 0, true), "All caught up");
  assert.equal(choreHeadline(0, 0, false), "Set up the weekly rotation.");
});

test("recent activity is newest first and capped", () => {
  const names = { a: "Mohit", b: "Urmi" };
  const events = mergeActivity(
    [
      ...eventsFromExpenses(
        [
          { id: "e1", title: "Costco", paid_by: "a", created_at: "2026-09-01T10:00:00Z" },
          { id: "e2", title: "Internet", paid_by: "b", created_at: "2026-09-08T10:00:00Z" },
        ],
        names
      ),
      ...eventsFromChores(
        [
          {
            id: "c1",
            chore_template_id: "k",
            assigned_to: "a",
            status: "completed",
            completed_at: "2026-09-09T12:00:00Z",
            completed_by: "a",
            created_at: "2026-09-07T10:00:00Z",
          },
        ],
        { k: "Kitchen Cleaning" },
        names
      ),
      ...eventsFromConcerns(
        [
          {
            id: "i1",
            title: "Sink leaking",
            status: "open",
            reported_by: "b",
            created_at: "2026-09-05T10:00:00Z",
            resolved_at: null,
          },
        ],
        names
      ),
    ],
    3
  );
  assert.equal(events.length, 3);
  assert.equal(events[0].summary, "Mohit completed Kitchen Cleaning");
  assert.equal(events[1].summary, "Urmi added Internet");
  assert.equal(events[2].summary, "Urmi reported Sink leaking");
});
