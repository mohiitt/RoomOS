import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveUnlockStatus,
  statusAfterSelectingRoommate,
  statusAfterVerifiedPin,
} from "./session.ts";

const ids = ["mohit", "urmi", "jainil", "rahul", "aditi"];

test("first visit asks for a name before the PIN", () => {
  assert.equal(
    resolveUnlockStatus({
      hasAccess: false,
      storedRoommateId: null,
      roommateIds: ids,
    }),
    "select"
  );
});

test("locked return visit with a stored name goes to PIN", () => {
  assert.equal(
    resolveUnlockStatus({
      hasAccess: false,
      storedRoommateId: "urmi",
      roommateIds: ids,
    }),
    "pin"
  );
});

test("valid apartment access with a stored name is ready", () => {
  assert.equal(
    resolveUnlockStatus({
      hasAccess: true,
      storedRoommateId: "mohit",
      roommateIds: ids,
    }),
    "ready"
  );
});

test("switch roommate always requires the PIN again", () => {
  assert.equal(
    resolveUnlockStatus({
      hasAccess: true,
      storedRoommateId: null,
      roommateIds: ids,
    }),
    "select"
  );
  assert.equal(statusAfterSelectingRoommate(true), "pin");
  assert.equal(statusAfterSelectingRoommate(false), "pin");
});

test("a good PIN does not become ready without a chosen roommate", () => {
  assert.equal(statusAfterVerifiedPin("jainil", ids), "ready");
  assert.equal(statusAfterVerifiedPin(null, ids), "select");
  assert.equal(statusAfterVerifiedPin("stranger", ids), "select");
});
