import assert from "node:assert/strict";
import test from "node:test";
import { assignWeeks, getNextAssignee } from "./getNextAssignee.ts";
import { calculateStreak, totalPoints } from "./calculateStreak.ts";
import { weekDueDate } from "./week.ts";

const five = [
  { roommateId: "Mohit", position: 0 },
  { roommateId: "Urmi", position: 1 },
  { roommateId: "Jainil", position: 2 },
  { roommateId: "Rahul", position: 3 },
  { roommateId: "Aditi", position: 4 },
];
const active = five.map((seat) => seat.roommateId);

test("five-person rotation wraps back to Mohit", () => {
  assert.deepEqual(assignWeeks({ rotations: five, activeRoommateIds: active, weekCount: 6 }), [
    "Mohit",
    "Urmi",
    "Jainil",
    "Rahul",
    "Aditi",
    "Mohit",
  ]);
});

test("inactive roommate is skipped", () => {
  const next = getNextAssignee({
    rotations: five,
    activeRoommateIds: ["Mohit", "Jainil", "Rahul", "Aditi"],
    lastAssigneeId: "Mohit",
  });
  assert.equal(next, "Jainil");
});

test("first assignment can be offset so chores start on different people", () => {
  const first = getNextAssignee({
    rotations: five,
    activeRoommateIds: active,
    lastAssigneeId: null,
    startOffset: 2,
  });
  assert.equal(first, "Jainil");
});

test("next cycle continues from the last assignee", () => {
  const firstCycle = assignWeeks({
    rotations: five,
    activeRoommateIds: active,
    weekCount: 5,
  });
  const nextWeek = getNextAssignee({
    rotations: five,
    activeRoommateIds: active,
    lastAssigneeId: firstCycle[4],
  });
  assert.equal(firstCycle[4], "Aditi");
  assert.equal(nextWeek, "Mohit");
});

test("multiple chores stay independent and can start on different roommates", () => {
  const kitchen = assignWeeks({
    rotations: five,
    activeRoommateIds: active,
    weekCount: 1,
    startOffset: 0,
  });
  const bathroom = assignWeeks({
    rotations: five,
    activeRoommateIds: active,
    weekCount: 1,
    startOffset: 1,
  });
  const trash = assignWeeks({
    rotations: five,
    activeRoommateIds: active,
    weekCount: 1,
    startOffset: 2,
  });
  assert.deepEqual(kitchen, ["Mohit"]);
  assert.deepEqual(bathroom, ["Urmi"]);
  assert.deepEqual(trash, ["Jainil"]);
});

test("the same roommate can have two different chores in one week", () => {
  const kitchen = getNextAssignee({
    rotations: five,
    activeRoommateIds: active,
    lastAssigneeId: null,
    startOffset: 0,
  });
  const mopping = getNextAssignee({
    rotations: five,
    activeRoommateIds: active,
    lastAssigneeId: null,
    startOffset: 0,
  });
  assert.equal(kitchen, "Mohit");
  assert.equal(mopping, "Mohit");
});

test("completed assignments build a streak; missed breaks it", () => {
  assert.equal(
    calculateStreak([
      { status: "completed", dueDate: "2026-08-23" },
      { status: "completed", dueDate: "2026-08-30" },
      { status: "pending", dueDate: "2026-09-06" },
    ]),
    2
  );
  assert.equal(
    calculateStreak([
      { status: "completed", dueDate: "2026-08-16" },
      { status: "missed", dueDate: "2026-08-23" },
      { status: "completed", dueDate: "2026-08-30" },
    ]),
    1
  );
});

test("points count completed assignments only", () => {
  assert.equal(
    totalPoints([
      { status: "completed", pointsAwarded: 10 },
      { status: "completed", pointsAwarded: 12 },
      { status: "missed", pointsAwarded: null },
      { status: "pending", pointsAwarded: null },
    ]),
    22
  );
});

test("weekly due date is Sunday of the current week, then the next Sunday", () => {
  assert.equal(weekDueDate("2026-09-09"), "2026-09-13");
  assert.equal(weekDueDate("2026-09-13"), "2026-09-13");
  assert.equal(weekDueDate("2026-09-14"), "2026-09-20");
});
