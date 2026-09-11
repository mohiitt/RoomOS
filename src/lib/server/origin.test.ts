import assert from "node:assert/strict";
import test from "node:test";
import { OriginError, assertSameOrigin } from "../server/origin.ts";

test("mutation requests need a matching origin", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://roomos.local/api/inventory", {
        method: "GET",
        headers: { host: "roomos.local" },
      })
    )
  );

  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://roomos.local/api/inventory", {
        method: "POST",
        headers: { origin: "https://roomos.local", host: "roomos.local" },
      })
    )
  );

  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://roomos.local/api/inventory", {
          method: "POST",
          headers: { origin: "https://evil.example", host: "roomos.local" },
        })
      ),
    OriginError
  );
});

test("cross-site requests without origin are rejected", () => {
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://roomos.local/api/inventory", {
          method: "POST",
          headers: { host: "roomos.local", "sec-fetch-site": "cross-site" },
        })
      ),
    OriginError
  );
});
