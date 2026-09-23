import assert from "node:assert/strict";
import { test } from "node:test";
import { completeTask, startTask, updateTask } from "../lib/agent-task-state.ts";

const now = "2026-09-23T12:00:00.000Z";
const steps = [{ title: "Research the issue", owner: "researcher" }, { title: "Verify the fix", owner: "reviewer" }];

test("task closes only after steps finish with evidence", () => {
  let task = startTask("Fix search behavior", steps, now);
  assert.throws(() => completeTask(task, now, "passed"), /Finish every step/);
  task = updateTask(task, 1, "running", now);
  task = updateTask(task, 1, "done", now, "Source checked");
  task = updateTask(task, 2, "running", now);
  task = updateTask(task, 2, "done", now, "Production checked");
  task = completeTask(task, now, "Production check passed");
  assert.equal(task.phase, "verified");
  assert.equal(task.evidence.length, 3);
});

test("rejects invalid transitions and concurrent active steps", () => {
  const initial = startTask("Fix search behavior", steps, now);
  assert.throws(() => updateTask(initial, 1, "done", now), /Start the step/);
  const running = updateTask(initial, 1, "running", now);
  assert.throws(() => updateTask(running, 2, "running", now), /current step/);
  const blocked = updateTask(running, 1, "blocked", now, "Provider unavailable");
  assert.throws(() => updateTask(blocked, 2, "running", now), /closed/);
});
