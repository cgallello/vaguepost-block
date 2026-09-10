import test from "node:test";
import assert from "node:assert/strict";

let listener;
let availabilityOptions;
let createOptions;
let promptOptions;

globalThis.chrome = { runtime: { onMessage: { addListener(callback) { listener = callback; } } } };
globalThis.LanguageModel = {
  availability: async (options) => { availabilityOptions = options; return "available"; },
  create: async (options) => {
    createOptions = options;
    return { prompt: async (_text, options) => { promptOptions = options; return JSON.stringify({ isVague: true, confidence: 0.94, reasonCode: "UNSPECIFIED_REFERENT", explanation: "The reaction does not name the subject.", concreteSubjectPresent: false }); } };
  },
};

await import("../classifier.js?test=contract");

function invoke(message) {
  return new Promise((resolve) => listener(message, {}, resolve));
}

test("classifier host uses the same English text contract for availability and session creation", async () => {
  const response = await invoke({ type: "offscreen-classify", candidate: { addedText: "Can I say something?", quoteText: "A quoted post." } });
  assert.equal(response.available, true);
  assert.equal(response.result.reasonCode, "UNSPECIFIED_REFERENT");
  assert.deepEqual(availabilityOptions, { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] });
  assert.deepEqual(createOptions.expectedInputs, availabilityOptions.expectedInputs);
  assert.deepEqual(createOptions.expectedOutputs, availabilityOptions.expectedOutputs);
  assert.equal(createOptions.temperature, 0.1);
  assert.equal(createOptions.topK, 3);
  assert.equal(promptOptions.responseConstraint.type, "object");
  assert.deepEqual(promptOptions.responseConstraint.required, ["isVague", "confidence", "reasonCode", "explanation", "concreteSubjectPresent"]);
  assert.equal(promptOptions.signal instanceof AbortSignal, true);
});

test("classifier host fails closed when the model is unavailable", async () => {
  const original = LanguageModel.availability;
  LanguageModel.availability = async () => "unavailable";
  // The existing session is intentionally reused; create a fresh module host to exercise the unavailable branch.
  let unavailableListener;
  globalThis.chrome = { runtime: { onMessage: { addListener(callback) { unavailableListener = callback; } } } };
  await import("../classifier.js?test=unavailable");
  const response = await new Promise((resolve) => unavailableListener({ type: "offscreen-classify", candidate: { addedText: "Maybe.", quoteText: "Context." } }, {}, resolve));
  assert.deepEqual(response, { available: false, reason: "local_ai_unavailable" });
  LanguageModel.availability = original;
});
