import assert from "node:assert/strict";
import test from "node:test";
import { signSession, verifySession } from "./token.ts";

test("signed sessions round-trip and expire", () => {
  process.env.ROOMOS_SESSION_SECRET = "test-secret-for-roomos";
  const now = 1_700_000_000;
  const token = signSession("30f7b770-3c4b-414c-a1fe-f29af6535092", now);
  const payload = verifySession(token, now + 10);
  assert.equal(payload?.rid, "30f7b770-3c4b-414c-a1fe-f29af6535092");
  assert.equal(verifySession(token, now + 60 * 60 * 24 * 31), null);
  assert.equal(verifySession("not-a-token", now), null);
  assert.equal(verifySession(token.slice(0, -2) + "ab", now), null);
});
