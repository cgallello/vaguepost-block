(() => {
  const DEFAULT_SETTINGS = Object.freeze({ enabled: false, actionMode: "blur", threshold: 3, sensitivity: "standard", blurTrigger: "every_high_confidence_flag", mascotMotion: "reduced", allowlist: [], aiReady: false, automaticAck: false });
  const CONFIDENCE_THRESHOLDS = Object.freeze({ conservative: 0.90, standard: 0.82, aggressive: 0.72 });
  function normalizeHandle(handle) { return String(handle || "").trim().replace(/^@/, "").toLowerCase(); }
  function clampThreshold(value) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(10, Math.round(number))) : DEFAULT_SETTINGS.threshold; }
  function normalizeSettings(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const actionModes = new Set(["blur", "review", "automatic"]);
    const sensitivities = new Set(Object.keys(CONFIDENCE_THRESHOLDS));
    const blurTriggers = new Set(["every_high_confidence_flag", "threshold_reached"]);
    const mascotMotions = new Set(["still", "reduced"]);
    const allowlist = Array.isArray(source.allowlist) ? [...new Set(source.allowlist.map(normalizeHandle).filter(Boolean))].slice(0, 500) : [];
    return { ...DEFAULT_SETTINGS, enabled: source.enabled === true, actionMode: actionModes.has(source.actionMode) ? source.actionMode : DEFAULT_SETTINGS.actionMode, threshold: clampThreshold(source.threshold), sensitivity: sensitivities.has(source.sensitivity) ? source.sensitivity : DEFAULT_SETTINGS.sensitivity, blurTrigger: blurTriggers.has(source.blurTrigger) ? source.blurTrigger : DEFAULT_SETTINGS.blurTrigger, mascotMotion: mascotMotions.has(source.mascotMotion) ? source.mascotMotion : DEFAULT_SETTINGS.mascotMotion, allowlist, aiReady: source.aiReady === true, automaticAck: source.automaticAck === true };
  }
  function followStateAllowsAction(state) { return state === "not_following"; }
  function followSkipOutcome(state) { return state === "following" ? "skipped_followed" : "skipped_unverified_follow_state"; }
  function confidenceGate(result, sensitivity = "standard") { return Boolean(result && result.isVague === true && Number.isFinite(result.confidence) && result.confidence >= (CONFIDENCE_THRESHOLDS[sensitivity] ?? CONFIDENCE_THRESHOLDS.standard)); }
  function automaticBlockAllowed(result) { return Boolean(result?.isVague === true && Number.isFinite(result.confidence) && result.confidence >= 0.90); }
  function isConcreteEnough(text) { const value = String(text || "").trim(); if (value.length < 6) return false; const words = value.split(/\s+/).filter(Boolean); if (words.length >= 18) return true; if (/[#:][\w-]+|https?:\/\/|\b(?:because|about|after|before|when|since|according|explained|announced)\b/i.test(value)) return true; if (/\b(?:is|was|are|means|shows|matters|needs|deserves)\b/i.test(value) && words.length >= 6) return true; if (/\b(?:he|she|they|this|that|it|someone|somebody|people)\b/i.test(value) && words.length >= 9) return true; return false; }
  function localCandidateGate(addedText, quoteText = "") { const added = String(addedText || "").trim(); const quote = String(quoteText || "").trim(); return Boolean(added && quote && !isConcreteEnough(added) && added.length <= 420); }
  function validateClassifierResult(raw) { const allowed = new Set(["UNSPECIFIED_REFERENT", "IMPLIED_DRAMA", "CONTEXT_FREE_QUESTION", "AMBIGUOUS_REACTION", "NOT_VAGUE", "UNPARSEABLE"]); const result = typeof raw === "string" ? JSON.parse(raw) : raw; if (!result || typeof result !== "object") throw new Error("Classifier response is not an object"); const confidence = Number(result.confidence); if (typeof result.isVague !== "boolean" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || !allowed.has(result.reasonCode)) throw new Error("Classifier response failed validation"); return { isVague: result.isVague, confidence, reasonCode: result.reasonCode, explanation: String(result.explanation || "").slice(0, 220), concreteSubjectPresent: Boolean(result.concreteSubjectPresent) }; }
  function accountKey({ accountId, handle } = {}) { return String(accountId || normalizeHandle(handle)); }
  globalThis.VGBPolicy = { DEFAULT_SETTINGS, CONFIDENCE_THRESHOLDS, normalizeHandle, clampThreshold, normalizeSettings, followStateAllowsAction, followSkipOutcome, confidenceGate, automaticBlockAllowed, isConcreteEnough, localCandidateGate, validateClassifierResult, accountKey };
})();
