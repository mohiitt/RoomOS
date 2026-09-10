import assert from "node:assert/strict";
import test from "node:test";
import { cleanIngredients, formatIngredient } from "./format.ts";

test("ingredient line puts quantity, unit, then name", () => {
  assert.equal(
    formatIngredient({ name: "rice", quantity: "2", unit: "cups" }),
    "2 cups rice"
  );
  assert.equal(
    formatIngredient({ name: "salt", quantity: "a pinch", unit: "" }),
    "a pinch salt"
  );
  assert.equal(
    formatIngredient({ name: "garlic", quantity: "3", unit: "cloves" }),
    "3 cloves garlic"
  );
});

test("blank ingredient rows are dropped", () => {
  assert.deepEqual(
    cleanIngredients([
      { name: "  eggs ", quantity: "2", unit: "count" },
      { name: "   ", quantity: "1", unit: "cup" },
    ]),
    [{ name: "eggs", quantity: "2", unit: "count" }]
  );
});
