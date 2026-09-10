import { DEFAULT_SETTINGS, accountKey, confidenceGate, normalizeHandle, normalizeSettings } from "./shared/policy.mjs";
import { dismissStrike, nextStrike } from "./shared/strike.mjs";

const OFFSCREEN_URL = "offscreen.html";
const CLASSIFIER_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CLASSIFIER_CACHE_LIMIT = 300;
const MAX_CLASSIFIER_WAITERS = 8;
const AI_STATUS_TIMEOUT_MS = 8_000;
const AI_PREPARE_TIMEOUT_MS = 30_000;
let classifierReady = false;
let classifierQueue = Promise.resolve();
let classifierWaiters = 0;
let classifierUnavailableUntil = 0;
const classifierMemory = new Map();
let strikeQueue = Promise.resolve();
let eventQueue = Promise.resolve();
let offscreenPromise;
const followChecks = new Map();
const followRequests = new Map();

function rememberClassification(key, createdAt, response) {
  classifierMemory.delete(key);
  classifierMemory.set(key, { createdAt, response });
  while (classifierMemory.size > CLASSIFIER_CACHE_LIMIT) classifierMemory.delete(classifierMemory.keys().next().value);
}

async function getSettings() {
  const saved = await chrome.storage.local.get("settings");
  return normalizeSettings(saved.settings || DEFAULT_SETTINGS);
}

async function broadcastSettings(settings) {
  const tabs = await chrome.tabs.query({ url: ["https://x.com/*"] });
  await Promise.allSettled(tabs.map((tab) => tab.id == null ? Promise.resolve() : chrome.tabs.sendMessage(tab.id, { type: "settings-changed", settings })));
}

function resolveFollowCheck(tabId, state) {
  for (const [requestId, check] of followChecks) {
    if (check.tabId !== tabId) continue;
    clearTimeout(check.timeout);
    followChecks.delete(requestId);
    chrome.tabs.remove(tabId).catch(() => {});
    check.resolve(state === "following" || state === "not_following" ? state : "unknown");
    return true;
  }
  return false;
}

async function checkFollowState(handle, fresh = false) {
  const normalized = normalizeHandle(handle);
  if (!fresh && followRequests.has(normalized)) return followRequests.get(normalized);
  const requestId = crypto.randomUUID();
  const promise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      const check = followChecks.get(requestId);
      if (!check) return;
      followChecks.delete(requestId);
      if (check.tabId != null) chrome.tabs.remove(check.tabId).catch(() => {});
      resolve("unknown");
    }, 7000);
    followChecks.set(requestId, { resolve, timeout, tabId: null });
  });
  const request = (async () => {
  try {
    const tab = await chrome.tabs.create({ url: `https://x.com/${encodeURIComponent(normalized)}`, active: false });
    const check = followChecks.get(requestId);
    if (check) check.tabId = tab.id;
    else if (tab.id != null) chrome.tabs.remove(tab.id).catch(() => {});
    if (tab.id != null) {
      const poll = async () => {
        const current = followChecks.get(requestId);
        if (!current) return;
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: "profile-state-check" });
          if (response?.state === "following" || response?.state === "not_following") {
            resolveFollowCheck(tab.id, response.state);
            return;
          }
        } catch { /* The profile document may still be loading. */ }
        if (followChecks.has(requestId)) setTimeout(poll, 500);
      };
      setTimeout(poll, 1200);
    }
  } catch {
    const check = followChecks.get(requestId);
    if (check) { clearTimeout(check.timeout); followChecks.delete(requestId); check.resolve("unknown"); }
  }
  return promise;
  })();
  if (!fresh) followRequests.set(normalized, request);
  request.finally(() => { if (followRequests.get(normalized) === request) followRequests.delete(normalized); });
  return request;
}

async function ensureOffscreen() {
  if (offscreenPromise) return offscreenPromise;
  offscreenPromise = (async () => {
    const contexts = await chrome.runtime.getContexts?.({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)] });
    if (contexts?.length) return;
    await chrome.offscreen.createDocument({ url: OFFSCREEN_URL, reasons: ["DOM_PARSER"], justification: "Host the local Gemini Nano classifier in an extension document." });
  })().finally(() => { offscreenPromise = undefined; });
  return offscreenPromise;
}

async function localAiStatus() {
  try { await ensureOffscreen(); return await Promise.race([chrome.runtime.sendMessage({ type: "offscreen-ai-status" }), new Promise((resolve) => setTimeout(() => resolve({ availability: "unavailable", reason: "local_ai_status_timeout" }), AI_STATUS_TIMEOUT_MS))]); }
  catch (error) { return { availability: "unavailable", reason: "local_ai_status_error", message: String(error?.message || error) }; }
}

async function prepareLocalAi() {
  try { await ensureOffscreen(); return await Promise.race([chrome.runtime.sendMessage({ type: "offscreen-prepare" }), new Promise((resolve) => setTimeout(() => resolve({ available: false, reason: "local_ai_prepare_timeout" }), AI_PREPARE_TIMEOUT_MS))]); }
  catch (error) { return { available: false, reason: "local_ai_prepare_error", message: String(error?.message || error) }; }
}

async function readCachedClassification(postId) {
  const key = String(postId || "");
  if (!key) return null;
  const memory = classifierMemory.get(key);
  if (memory && Date.now() - memory.createdAt < CLASSIFIER_CACHE_TTL) return memory.response;
  if (memory) classifierMemory.delete(key);
  const { classifierCache = {} } = await chrome.storage.local.get("classifierCache");
  const cached = classifierCache[key];
  const createdAt = Number(cached?.createdAt);
  if (!cached?.result || !Number.isFinite(createdAt) || Date.now() - createdAt >= CLASSIFIER_CACHE_TTL) return null;
  const response = { available: true, result: cached.result, cached: true };
  rememberClassification(key, createdAt, response);
  return response;
}

async function writeCachedClassification(postId, response) {
  if (!postId || !response?.result) return;
  const { classifierCache = {} } = await chrome.storage.local.get("classifierCache");
  classifierCache[String(postId)] = { createdAt: Date.now(), result: response.result };
  const entries = Object.entries(classifierCache)
    .filter(([, value]) => value && Number.isFinite(value.createdAt) && value.result)
    .sort(([, left], [, right]) => left.createdAt - right.createdAt)
    .slice(-CLASSIFIER_CACHE_LIMIT);
  await chrome.storage.local.set({ classifierCache: Object.fromEntries(entries) });
  rememberClassification(String(postId), Date.now(), { ...response, cached: true });
}

async function classify(candidate) {
  const cached = await readCachedClassification(candidate?.postId);
  if (cached) return cached;
  if (Date.now() < classifierUnavailableUntil) return { available: false, reason: "local_ai_unavailable" };
  if (classifierWaiters >= MAX_CLASSIFIER_WAITERS) return { available: false, reason: "classifier_queue_full" };
  classifierWaiters += 1;
  const task = classifierQueue.catch(() => {}).then(async () => {
    try {
      await ensureOffscreen();
      const response = await chrome.runtime.sendMessage({ type: "offscreen-classify", candidate });
      classifierReady = response?.available === true;
      if (response?.available === false || response?.error) classifierUnavailableUntil = Date.now() + 30_000;
      if (response?.result) await writeCachedClassification(candidate.postId, response);
      return response || { available: false, reason: "classifier_empty_response" };
    } catch (error) {
      classifierReady = false;
      classifierUnavailableUntil = Date.now() + 30_000;
      return { available: false, reason: "classifier_error", message: String(error?.message || error) };
    }
  }).finally(() => { classifierWaiters -= 1; });
  classifierQueue = task;
  return task;
}

async function addEventInternal(event) {
  const allowedOutcomes = new Set(["candidate", "flagged", "dismissed", "strike_added", "blocked", "skipped_followed", "skipped_unverified_follow_state", "error"]);
  const outcome = allowedOutcomes.has(event?.outcome) ? event.outcome : "error";
  const safeEvent = {
    handle: normalizeHandle(event?.handle),
    outcome,
    ...(event?.reasonCode ? { reasonCode: String(event.reasonCode).slice(0, 64) } : {}),
    ...(event?.confidenceBand ? { confidenceBand: String(event.confidenceBand).slice(0, 16) } : {}),
    ...(event?.postIdHash ? { postIdHash: String(event.postIdHash) } : {}),
  };
  if (safeEvent.postIdHash && !/^[a-f0-9]{16}$/i.test(String(safeEvent.postIdHash))) safeEvent.postIdHash = await digest(safeEvent.postIdHash);
  const { events = [] } = await chrome.storage.local.get("events");
  const next = [...events, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...safeEvent }].slice(-500);
  await chrome.storage.local.set({ events: next });
  if (outcome === "blocked" && safeEvent.handle) {
    const { accounts = {} } = await chrome.storage.local.get("accounts");
    const key = accountKey({ handle: safeEvent.handle });
    accounts[key] = { ...(accounts[key] || { key, strikes: 0, processedPostIds: [], dismissedPostIds: [] }), latestHandle: safeEvent.handle, status: "blocked", updatedAt: new Date().toISOString() };
    await chrome.storage.local.set({ accounts });
  }
  return next.at(-1);
}

function addEvent(event) {
  eventQueue = eventQueue.catch(() => {}).then(() => addEventInternal(event));
  return eventQueue;
}

async function recordStrikeInternal({ candidate, result }) {
  const settings = await getSettings();
  const reviewMayProceedWithoutFollowProof = candidate?.followingState === "unknown" && settings.actionMode !== "automatic";
  if (!candidate || (candidate.followingState !== "not_following" && !reviewMayProceedWithoutFollowProof)) return { record: null, duplicate: false, skipped: true, thresholdReached: false };
  if ((settings.allowlist || []).includes(normalizeHandle(candidate.handle))) return { record: null, duplicate: false, skipped: true, thresholdReached: false, reason: "allowlisted" };
  if (!confidenceGate(result, settings.sensitivity)) return { record: null, duplicate: false, skipped: true, thresholdReached: false, reason: "invalid_classifier_result" };
  const key = accountKey(candidate);
  const { accounts = {} } = await chrome.storage.local.get("accounts");
  const record = accounts[key] || { key, latestHandle: candidate.handle, strikes: 0, processedPostIds: [], dismissedPostIds: [], status: "active", updatedAt: new Date().toISOString() };
  if (record.status === "blocked" || record.status === "allowlisted") return { record, duplicate: true, skipped: true, thresholdReached: false, reason: record.status };
  const next = nextStrike(record, candidate.postId, settings.threshold);
  if (next.dismissed) return { record, duplicate: true, dismissed: true, thresholdReached: next.thresholdReached };
  if (next.duplicate) return { record, duplicate: true, thresholdReached: next.thresholdReached };
  record.latestHandle = candidate.handle;
  record.strikes = next.strikes;
  record.processedPostIds = next.processedPostIds;
  record.updatedAt = new Date().toISOString();
  accounts[key] = record;
  await chrome.storage.local.set({ accounts });
  await addEvent({ handle: candidate.handle, postIdHash: await digest(candidate.postId), outcome: "strike_added", reasonCode: result.reasonCode, confidenceBand: result.confidence >= .9 ? "high" : result.confidence >= .82 ? "medium" : "low" });
  return { record, duplicate: false, thresholdReached: record.strikes > settings.threshold };
}

function recordStrike(message) {
  strikeQueue = strikeQueue.catch(() => {}).then(() => recordStrikeInternal(message));
  return strikeQueue;
}

async function dismissStrikeInternal({ candidate }) {
  if (!candidate?.postId) return { dismissed: false };
  const key = accountKey(candidate);
  const { accounts = {} } = await chrome.storage.local.get("accounts");
  const record = accounts[key];
  const next = dismissStrike(record, candidate.postId);
  if (!next.dismissed) return { dismissed: false };
  next.updatedAt = new Date().toISOString();
  accounts[key] = next;
  await chrome.storage.local.set({ accounts });
  return { dismissed: true, record: next };
}

function dismissRecordedStrike(message) {
  strikeQueue = strikeQueue.catch(() => {}).then(() => dismissStrikeInternal(message));
  return strikeQueue;
}

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ai-download-progress") { const broadcast = chrome.runtime.sendMessage({ type: "ai-progress", loaded: Number(message.loaded) || 0 }); broadcast?.catch?.(() => {}); sendResponse({ ok: true }); return false; }
  (async () => {
    if (message.type === "get-settings") return sendResponse(await getSettings());
    if (message.type === "open-options") { await chrome.runtime.openOptionsPage(); return sendResponse({ ok: true }); }
    if (message.type === "ai-status") return sendResponse(await localAiStatus());
    if (message.type === "prepare-ai") return sendResponse(await prepareLocalAi());
    if (message.type === "save-settings") {
      const settings = normalizeSettings(message.settings || DEFAULT_SETTINGS);
      await chrome.storage.local.set({ settings });
      try { await broadcastSettings(settings); } catch { /* The next X navigation will read storage. */ }
      return sendResponse(settings);
    }
    if (message.type === "classify-candidate") return sendResponse(await classify(message.candidate));
    if (message.type === "check-follow-state") return sendResponse({ state: await checkFollowState(message.handle, message.fresh === true) });
    if (message.type === "profile-state") { resolveFollowCheck(sender.tab?.id, message.state); return sendResponse({ ok: true }); }
    if (message.type === "record-strike") return sendResponse(await recordStrike(message));
    if (message.type === "dismiss-strike") return sendResponse(await dismissRecordedStrike(message));
    if (message.type === "record-event") return sendResponse(await addEvent(message.event));
    if (message.type === "reset-strikes") {
      await strikeQueue.catch(() => {});
      const handle = normalizeHandle(message.handle);
      const key = accountKey({ handle });
      const { accounts = {} } = await chrome.storage.local.get("accounts");
      if (accounts[key]) {
        accounts[key] = { ...accounts[key], strikes: 0, processedPostIds: [], dismissedPostIds: [], updatedAt: new Date().toISOString() };
        await chrome.storage.local.set({ accounts });
      }
      return sendResponse({ ok: true });
    }
    if (message.type === "get-log") {
      const data = await chrome.storage.local.get(["events", "accounts", "settings"]);
      return sendResponse(data);
    }
    if (message.type === "clear-data") {
      await Promise.all([eventQueue.catch(() => {}), strikeQueue.catch(() => {})]);
      const settings = await getSettings();
      await chrome.storage.local.clear();
      await chrome.storage.local.set({ settings, accounts: {}, events: [], classifierCache: {} });
      classifierMemory.clear();
      classifierUnavailableUntil = 0;
      classifierReady = false;
      return sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ error: error.message }));
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS, accounts: {}, events: [], classifierCache: {} });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [requestId, check] of followChecks) {
    if (check.tabId !== tabId) continue;
    clearTimeout(check.timeout);
    followChecks.delete(requestId);
    check.resolve("unknown");
  }
});
