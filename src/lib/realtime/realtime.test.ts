import assert from "node:assert/strict";
import test from "node:test";
import { changeMatchesTables } from "./tables.ts";

test("dashboard listens to every apartment table", () => {
  assert.equal(changeMatchesTables({ table: "expenses" }, "all"), true);
  assert.equal(changeMatchesTables({ table: "concern_comments" }, "all"), true);
});

test("feature hooks only reload for their tables", () => {
  assert.equal(
    changeMatchesTables({ table: "inventory_items" }, ["inventory_items", "inventory_transactions"]),
    true
  );
  assert.equal(
    changeMatchesTables({ table: "expenses" }, ["inventory_items", "inventory_transactions"]),
    false
  );
  assert.equal(
    changeMatchesTables({ table: "concern_comments" }, ["concerns", "concern_comments"]),
    true
  );
});
