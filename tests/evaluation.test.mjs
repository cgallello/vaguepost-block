import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const score = resolve(root, "eval/score.mjs");
const dataset = resolve(root, "eval/dataset.example.json");
const predictions = resolve(root, "eval/predictions.example.json");

test("classifier evaluation gate reports example coverage as ineligible", () => {
  const output = execFileSync(process.execPath, [score, dataset, predictions], { cwd: root, encoding: "utf8" });
  const result = JSON.parse(output);
  assert.equal(result.precision, 1);
  assert.equal(result.recall, 1);
  assert.equal(result.eligible, false);
});

test("classifier evaluation gate rejects strict mode until coverage is complete", () => {
  assert.throws(() => execFileSync(process.execPath, [score, dataset, predictions, "--strict"], { cwd: root, stdio: "pipe" }));
});
