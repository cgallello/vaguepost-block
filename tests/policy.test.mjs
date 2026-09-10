import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { confidenceGate, automaticBlockAllowed, followSkipOutcome, followStateAllowsAction, localCandidateGate, validateClassifierResult, normalizeSettings } from "../shared/policy.mjs";
import { dismissStrike, nextStrike } from "../shared/strike.mjs";
import cases from "./fixtures/candidate-cases.json" with { type: "json" };

const browserPolicyContext = { globalThis: {} };
vm.runInNewContext(readFileSync(new URL("../shared/policy.js", import.meta.url), "utf8"), browserPolicyContext);
const browserPolicy = browserPolicyContext.globalThis.VGBPolicy;

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
  assert.equal(confidenceGate({ ...result, confidence: 0.99, concreteSubjectPresent: true }, "aggressive"), false);
  assert.equal(automaticBlockAllowed({ ...result, confidence: 0.99, concreteSubjectPresent: true }), false);
  assert.equal(confidenceGate({ ...result, confidence: 0.99, reasonCode: "NOT_VAGUE" }, "aggressive"), false);
});

test("browser policy keeps the same unsafe-result gate as the worker policy", () => {
  const result = { isVague: true, confidence: 0.99, reasonCode: "NOT_VAGUE", concreteSubjectPresent: false };
  assert.equal(browserPolicy.confidenceGate(result, "aggressive"), false);
  assert.equal(browserPolicy.automaticBlockAllowed({ ...result, reasonCode: "UNSPECIFIED_REFERENT" }), true);
  assert.equal(browserPolicy.confidenceGate({ ...result, reasonCode: "UNSPECIFIED_REFERENT", concreteSubjectPresent: true }, "aggressive"), false);
});

test("classifier response validation rejects unsafe or malformed output", () => {
  assert.deepEqual(validateClassifierResult({ isVague: true, confidence: 0.9, reasonCode: "UNSPECIFIED_REFERENT", explanation: "No subject.", concreteSubjectPresent: false }).isVague, true);
  assert.deepEqual(validateClassifierResult({ isVague: true, confidence: 0.9, reasonCode: "UNSPECIFIED_REFERENT", explanation: "Names the subject.", concreteSubjectPresent: true }), { isVague: false, confidence: 0.9, reasonCode: "NOT_VAGUE", explanation: "Names the subject.", concreteSubjectPresent: true });
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

test("dismissing a flagged post removes only its strike", () => {
  const result = dismissStrike({ strikes: 2, processedPostIds: ["first", "second"] }, "second");
  assert.equal(result.dismissed, true);
  assert.equal(result.strikes, 1);
  assert.deepEqual(result.processedPostIds, ["first"]);
  assert.deepEqual(result.dismissedPostIds, ["second"]);
  assert.equal(dismissStrike({ strikes: 2, processedPostIds: ["first"] }, "missing").dismissed, false);
});

test("a dismissed post stays dismissed across a later scan", () => {
  const result = nextStrike({ strikes: 0, processedPostIds: [], dismissedPostIds: ["same"] }, "same", 3);
  assert.equal(result.duplicate, true);
  assert.equal(result.dismissed, true);
  assert.equal(result.strikes, 0);
});

test("follow safety allows only a positively verified not-following state", () => {
  assert.equal(followStateAllowsAction("not_following"), true);
  assert.equal(followStateAllowsAction("following"), false);
  assert.equal(followStateAllowsAction("unknown"), false);
  assert.equal(followSkipOutcome("following"), "skipped_followed");
  assert.equal(followSkipOutcome("unknown"), "skipped_unverified_follow_state");
});

test("settings normalization clamps user-controlled values and allowlist handles", () => {
  const settings = normalizeSettings({ enabled: 1, actionMode: "automatic", threshold: 999, sensitivity: "bogus", allowlist: [" @Alice", "alice", "", null] });
  assert.equal(settings.enabled, false);
  assert.equal(settings.actionMode, "automatic");
  assert.equal(settings.threshold, 10);
  assert.equal(settings.sensitivity, "standard");
  assert.deepEqual(settings.allowlist, ["alice"]);
});

test("candidate gate matches the labeled regression fixtures", () => {
  for (const fixture of cases) {
    assert.equal(localCandidateGate(fixture.added, fixture.quote), fixture.expectedCandidate, fixture.name);
  }
});
