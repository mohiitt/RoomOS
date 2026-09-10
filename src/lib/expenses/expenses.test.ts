import assert from "node:assert/strict";
import test from "node:test";
import { calculateSplits } from "./validateSplit.ts";
import { calculateNets, viewerTotals } from "./calculateBalances.ts";
import { simplifyDebts } from "./simplifyDebts.ts";

test("equal split of 100 among 5 is 20 each", () => {
  const splits = calculateSplits({
    amount: 100,
    splitType: "equal",
    participants: ["A", "B", "C", "D", "E"].map((roommateId) => ({ roommateId })),
  });
  assert.deepEqual(
    splits.map((split) => split.owedAmount),
    [20, 20, 20, 20, 20]
  );
});

test("equal split of 10 among 3 totals exactly 10", () => {
  const splits = calculateSplits({
    amount: 10,
    splitType: "equal",
    participants: ["A", "B", "C"].map((roommateId) => ({ roommateId })),
  });
  const total = splits.reduce((sum, split) => sum + Math.round(split.owedAmount * 100), 0);
  assert.equal(total, 1000);
  assert.deepEqual(
    splits.map((split) => split.owedAmount).sort((a, b) => b - a),
    [3.34, 3.33, 3.33]
  );
});

test("exact split 50/30/20", () => {
  const splits = calculateSplits({
    amount: 100,
    splitType: "exact",
    participants: [
      { roommateId: "A", exactAmount: 50 },
      { roommateId: "B", exactAmount: 30 },
      { roommateId: "C", exactAmount: 20 },
    ],
  });
  assert.deepEqual(
    splits.map((split) => split.owedAmount),
    [50, 30, 20]
  );
});

test("percentage split 50/30/20", () => {
  const splits = calculateSplits({
    amount: 100,
    splitType: "percentage",
    participants: [
      { roommateId: "A", percentage: 50 },
      { roommateId: "B", percentage: 30 },
      { roommateId: "C", percentage: 20 },
    ],
  });
  assert.deepEqual(
    splits.map((split) => split.owedAmount),
    [50, 30, 20]
  );
});

test("shares 2/1/1 of 100", () => {
  const splits = calculateSplits({
    amount: 100,
    splitType: "shares",
    participants: [
      { roommateId: "A", shares: 2 },
      { roommateId: "B", shares: 1 },
      { roommateId: "C", shares: 1 },
    ],
  });
  assert.deepEqual(
    splits.map((split) => split.owedAmount),
    [50, 25, 25]
  );
});

test("exact split that does not total is rejected", () => {
  assert.throws(
    () =>
      calculateSplits({
        amount: 100,
        splitType: "exact",
        participants: [
          { roommateId: "A", exactAmount: 50 },
          { roommateId: "B", exactAmount: 30 },
        ],
      }),
    /add up/
  );
});

test("simplifies A owes B 20 and B owes C 15", () => {
  const nets = calculateNets(
    ["A", "B", "C"],
    [
      {
        paidBy: "B",
        splits: [
          { roommateId: "A", owedAmount: 20 },
          { roommateId: "B", owedAmount: 0 },
        ],
      },
      {
        paidBy: "C",
        splits: [
          { roommateId: "B", owedAmount: 15 },
          { roommateId: "C", owedAmount: 0 },
        ],
      },
    ],
    []
  );
  const simplified = simplifyDebts(nets);
  assert.deepEqual(simplified, [
    { fromId: "A", toId: "C", amount: 15 },
    { fromId: "A", toId: "B", amount: 5 },
  ]);
});

test("settlement reduces what A owes B", () => {
  const nets = calculateNets(
    ["A", "B"],
    [
      {
        paidBy: "B",
        splits: [
          { roommateId: "A", owedAmount: 20 },
          { roommateId: "B", owedAmount: 0 },
        ],
      },
    ],
    [{ payerId: "A", receiverId: "B", amount: 8 }]
  );
  const simplified = simplifyDebts(nets);
  assert.deepEqual(simplified, [{ fromId: "A", toId: "B", amount: 12 }]);
});

test("viewer totals from simplified debts", () => {
  const totals = viewerTotals("A", [
    { fromId: "A", toId: "B", amount: 20 },
    { fromId: "A", toId: "C", amount: 22.5 },
    { fromId: "D", toId: "A", amount: 18 },
  ]);
  assert.equal(totals.youOwe, 42.5);
  assert.equal(totals.youAreOwed, 18);
  assert.equal(totals.net, -24.5);
});
