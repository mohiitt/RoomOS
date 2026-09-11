import assert from "node:assert/strict";
import test from "node:test";
import { moneyViewFromNets } from "./view.ts";

test("ledger nets from the database drive money totals", () => {
  const view = moneyViewFromNets(
    [
      { roommateId: "a", net: -20 },
      { roommateId: "b", net: 20 },
    ],
    "a"
  );
  assert.equal(view.totals.youOwe, 20);
  assert.equal(view.totals.youAreOwed, 0);
  assert.equal(view.totals.net, -20);
  assert.equal(view.debts[0]?.fromId, "a");
  assert.equal(view.debts[0]?.toId, "b");
});
