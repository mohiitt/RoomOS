import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceAside,
  copy,
  foodAside,
  greeting,
  pinHey,
  wrongPinLine,
} from "./copy.ts";

test("greeting is morning, hey, or evening with a name", () => {
  assert.equal(greeting(new Date("2026-09-10T08:00:00"), "Mohit"), "Morning, Mohit");
  assert.equal(greeting(new Date("2026-09-10T14:00:00"), "Urmi"), "Hey, Urmi");
  assert.equal(greeting(new Date("2026-09-10T20:00:00"), "Rahul"), "Evening, Rahul");
  assert.equal(greeting(new Date("2026-09-10T08:00:00")), "Morning");
});

test("PIN and card asides stay roommate-chat", () => {
  assert.equal(pinHey("Aditi"), "Hey Aditi.");
  assert.equal(wrongPinLine(0), copy.wrongPin[0]);
  assert.equal(wrongPinLine(4), copy.wrongPin[0]);
  assert.equal(balanceAside(0), "Nobody owes nobody. Weird.");
  assert.equal(foodAside(2), "The milk is writing its will.");
  assert.equal(copy.homeQuietTitle, "Quiet. Too quiet.");
  assert.match(copy.landingHeadline, /Zero group-chat math/);
});
