import test from "node:test";
import assert from "node:assert/strict";
import { confidenceGate, automaticBlockAllowed, localCandidateGate, validateClassifierResult } from "../shared/policy.mjs";
import { nextStrike } from "../shared/strike.mjs";

test("candidate gate nominates short context-free quote commentary", () => {
  assert.equal(localCandidateGate("Can I say something without everyone getting mad?", "A quoted post with context."), true);
  assert.equal(localCandidateGate("This happened because the committee published the report yesterday.", "A quoted post with context."), false);
  assert.equal(localCandidateGate("", "A quoted post with context."), false);
});

test("confidence thresholds vary for display but automatic blocks stay high confidence", () => {
  const result = { isVague: true, confidence: 0.84, reasonCode: "IMPLIED_DRAMA" };
  assert.equal(confidenceGate(result, "standard"), true);
  assert.equal(confidenceGate(result, "conservative"), false);
  assert.equal(automaticBlockAllowed(result), false);
  assert.equal(automaticBlockAllowed({ ...result, confidence: 0.91 }), true);
});

test("classifier response validation rejects unsafe or malformed output", () => {
  assert.deepEqual(validateClassifierResult({ isVague: true, confidence: 0.9, reasonCode: "UNSPECIFIED_REFERENT", explanation: "No subject.", concreteSubjectPresent: false }).isVague, true);
  assert.throws(() => validateClassifierResult({ isVague: "yes", confidence: 0.9, reasonCode: "UNSPECIFIED_REFERENT" }));
  assert.throws(() => validateClassifierResult({ isVague: true, confidence: 1.2, reasonCode: "UNSPECIFIED_REFERENT" }));
});

test("strike thresholds mean 0 blocks on first, 1 on second, 3 on fourth", () => {
  assert.equal(nextStrike({ strikes: 0, processedPostIds: [] }, "a", 0).thresholdReached, true);
  assert.equal(nextStrike({ strikes: 0, processedPostIds: [] }, "a", 1).thresholdReached, false);
  assert.equal(nextStrike({ strikes: 1, processedPostIds: ["a"] }, "b", 1).thresholdReached, true);
  assert.equal(nextStrike({ strikes: 3, processedPostIds: ["a", "b", "c"] }, "d", 3).thresholdReached, true);
});

test("reprocessing a post cannot add a strike", () => {
  const result = nextStrike({ strikes: 2, processedPostIds: ["same"] }, "same", 3);
  assert.equal(result.duplicate, true);
  assert.equal(result.strikes, 2);
});
