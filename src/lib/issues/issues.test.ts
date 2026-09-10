import assert from "node:assert/strict";
import test from "node:test";
import {
  isOpenStatus,
  statusOnAssign,
  statusTone,
  priorityTone,
} from "./constants.ts";

test("assigning someone on an open issue moves it to assigned", () => {
  assert.equal(statusOnAssign("open", "mohit"), "assigned");
});

test("clearing the assignee on an assigned issue returns it to open", () => {
  assert.equal(statusOnAssign("assigned", null), "open");
});

test("in-progress and resolved issues keep their status when assignee changes", () => {
  assert.equal(statusOnAssign("in_progress", "urmi"), "in_progress");
  assert.equal(statusOnAssign("resolved", null), "resolved");
});

test("resolved is the only closed status", () => {
  assert.equal(isOpenStatus("open"), true);
  assert.equal(isOpenStatus("assigned"), true);
  assert.equal(isOpenStatus("in_progress"), true);
  assert.equal(isOpenStatus("resolved"), false);
});

test("urgent and high priorities use stronger tones", () => {
  assert.equal(priorityTone("urgent"), "bad");
  assert.equal(priorityTone("high"), "warn");
  assert.equal(statusTone("resolved"), "good");
});
