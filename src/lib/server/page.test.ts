import assert from "node:assert/strict";
import test from "node:test";
import { pageResult } from "./page.ts";

test("pageResult peeks one extra row to set hasMore", () => {
  const rows = [1, 2, 3];
  assert.deepEqual(pageResult(rows, 2), { items: [1, 2], hasMore: true });
  assert.deepEqual(pageResult([1, 2], 2), { items: [1, 2], hasMore: false });
});
