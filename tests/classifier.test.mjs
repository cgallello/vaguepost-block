import test from "node:test";
import assert from "node:assert/strict";

let availabilityOptions;
let createOptions;
let promptOptions;

globalThis.chrome = { runtime: { sendMessage() { return Promise.resolve(); } } };
globalThis.LanguageModel = {
  availability: async (options) => { availabilityOptions = options; return "available"; },
  create: async (options) => {
    createOptions = options;
    return { prompt: async (_text, options) => { promptOptions = options; return JSON.stringify({ isVague: true, confidence: 0.94, reasonCode: "UNSPECIFIED_REFERENT", explanation: "The reaction does not name the subject.", concreteSubjectPresent: false }); } };
  },
};

const classifier = await import("../classifier.js?test=service-worker");

test("classifier host uses the same English text contract for availability and session creation", async () => {
  const response = await classifier.classify({ addedText: "Can I say something?", quoteText: "A quoted post." });
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

test("classifier host exposes readiness from the service-worker context used for inference", async () => {
  assert.equal(await classifier.availability(), "available");
  assert.deepEqual(await classifier.prepare(), { available: true, availability: "available" });
});

test("classifier host fails closed when the model is unavailable", async () => {
  const original = LanguageModel.availability;
  LanguageModel.availability = async () => "unavailable";
  const fresh = await import("../classifier.js?test=unavailable-service-worker");
  assert.deepEqual(await fresh.classify({ addedText: "Maybe.", quoteText: "Context." }), { available: false, reason: "local_ai_unavailable" });
  LanguageModel.availability = original;
});
