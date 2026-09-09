import { DEFAULT_SETTINGS, accountKey } from "./shared/policy.mjs";
import { nextStrike } from "./shared/strike.mjs";

const OFFSCREEN_URL = "offscreen.html";
let classifierReady = false;
let classifierQueue = Promise.resolve();
let strikeQueue = Promise.resolve();
const followChecks = new Map();

async function getSettings() {
  const saved = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
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

async function checkFollowState(handle) {
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
  try {
    const tab = await chrome.tabs.create({ url: `https://x.com/${encodeURIComponent(String(handle).replace(/^@/, ""))}`, active: false });
    const check = followChecks.get(requestId);
    if (check) check.tabId = tab.id;
  } catch {
    const check = followChecks.get(requestId);
    if (check) { clearTimeout(check.timeout); followChecks.delete(requestId); check.resolve("unknown"); }
  }
  return promise;
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts?.({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)] });
  if (contexts?.length) return;
  await chrome.offscreen.createDocument({ url: OFFSCREEN_URL, reasons: ["DOM_PARSER"], justification: "Host the local Gemini Nano classifier in an extension document." });
}

async function classify(candidate) {
  classifierQueue = classifierQueue.catch(() => {}).then(async () => {
    await ensureOffscreen();
    const response = await chrome.runtime.sendMessage({ type: "offscreen-classify", candidate });
    classifierReady = response?.available === true;
    return response;
  });
  return classifierQueue;
}

async function addEvent(event) {
  const { events = [] } = await chrome.storage.local.get("events");
  const next = [...events, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...event }].slice(-500);
  await chrome.storage.local.set({ events: next });
  return next.at(-1);
}

async function recordStrikeInternal({ candidate, result }) {
  const settings = await getSettings();
  const key = accountKey(candidate);
  const { accounts = {} } = await chrome.storage.local.get("accounts");
  const record = accounts[key] || { key, latestHandle: candidate.handle, strikes: 0, processedPostIds: [], status: "active", updatedAt: new Date().toISOString() };
  const next = nextStrike(record, candidate.postId, settings.threshold);
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

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "get-settings") return sendResponse(await getSettings());
    if (message.type === "save-settings") {
      const settings = { ...DEFAULT_SETTINGS, ...(message.settings || {}) };
      await chrome.storage.local.set({ settings });
      try { await broadcastSettings(settings); } catch { /* The next X navigation will read storage. */ }
      return sendResponse(settings);
    }
    if (message.type === "classify-candidate") return sendResponse(await classify(message.candidate));
    if (message.type === "check-follow-state") return sendResponse({ state: await checkFollowState(message.handle) });
    if (message.type === "profile-state") { resolveFollowCheck(sender.tab?.id, message.state); return sendResponse({ ok: true }); }
    if (message.type === "record-strike") return sendResponse(await recordStrike(message));
    if (message.type === "record-event") return sendResponse(await addEvent(message.event));
    if (message.type === "get-log") {
      const data = await chrome.storage.local.get(["events", "accounts"]);
      return sendResponse(data);
    }
    if (message.type === "clear-data") {
      await chrome.storage.local.clear();
      return sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ error: error.message }));
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS, accounts: {}, events: [] });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [requestId, check] of followChecks) {
    if (check.tabId !== tabId) continue;
    clearTimeout(check.timeout);
    followChecks.delete(requestId);
    check.resolve("unknown");
  }
});
