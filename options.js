const $ = (id) => document.getElementById(id);
const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => { void chrome.runtime.lastError; resolve(response || {}); }));
let settings;
let data;

function thresholdValue() {
  return $("threshold").value === "custom" ? Math.max(0, Math.min(10, Math.round(Number($("customThreshold").value || 0)))) : Number($("threshold").value);
}

function showAiDiagnostics(show) { $("aiDiagnostics").classList.toggle("hidden", !show); }

function renderAiStatus(response = {}) {
  const availability = response.availability || "unavailable";
  const labels = { available: "Local AI ready", downloadable: "Local AI download needed", downloading: "Downloading local AI…", unavailable: "Local AI unavailable on this device" };
  $("aiStatus").textContent = labels[availability] || "Local AI status unknown";
  showAiDiagnostics(availability === "unavailable");
  return availability;
}

async function refreshAiStatus() {
  const availability = renderAiStatus(await send({ type: "ai-status" }));
  if (availability === "available" && settings.aiReady !== true) settings = await send({ type: "save-settings", settings: { ...settings, aiReady: true } });
}

async function save() {
  settings = await send({ type: "save-settings", settings: { ...settings, threshold: thresholdValue() } });
}

function renderAllowlist() {
  $("allowlist").innerHTML = "";
  (settings.allowlist || []).forEach((handle) => {
    const row = document.createElement("div"); row.className = "activity-row";
    const label = document.createElement("span"); label.textContent = `@${handle}`;
    const reset = document.createElement("button"); reset.className = "link-button"; reset.textContent = "reset strikes";
    reset.addEventListener("click", async () => { await send({ type: "reset-strikes", handle }); $("message").textContent = `Reset strikes for @${handle}.`; });
    const remove = document.createElement("button"); remove.className = "link-button"; remove.textContent = "remove";
    remove.addEventListener("click", async () => { settings.allowlist = settings.allowlist.filter((item) => item !== handle); await save(); renderAllowlist(); });
    row.append(label, reset, remove); $("allowlist").append(row);
  });
}

function renderLog() {
  const target = $("activityLog"); target.innerHTML = "";
  const events = [...(data.events || [])].reverse().slice(0, 25);
  if (!events.length) { target.textContent = "No local activity yet."; return; }
  for (const event of events) {
    const row = document.createElement("div"); row.className = "activity-row";
    const when = document.createElement("time"); when.dateTime = event.createdAt; when.textContent = new Date(event.createdAt).toLocaleString();
    const detail = document.createElement("span"); detail.textContent = `${event.outcome.replaceAll("_", " ")} · @${event.handle || "unknown"}${event.confidenceBand ? ` · ${event.confidenceBand} confidence` : ""}${event.reasonCode ? ` · ${event.reasonCode}` : ""}`;
    row.append(when, detail); target.append(row);
  }
}

function renderLedger() {
  const target = $("accountLedger"); target.innerHTML = "";
  const accounts = Object.values(data.accounts || {}).sort((left, right) => String(left.latestHandle || "").localeCompare(String(right.latestHandle || "")));
  if (!accounts.length) { target.textContent = "No account strikes yet."; return; }
  for (const account of accounts) {
    const row = document.createElement("div"); row.className = "activity-row";
    const detail = document.createElement("span"); detail.textContent = `@${account.latestHandle || account.key} · ${account.strikes || 0} strike${account.strikes === 1 ? "" : "s"} · ${account.status || "active"}`;
    const reset = document.createElement("button"); reset.className = "link-button"; reset.textContent = "reset";
    reset.addEventListener("click", async () => { await send({ type: "reset-strikes", handle: account.latestHandle || account.key }); data = await send({ type: "get-log" }); renderLedger(); $("message").textContent = `Reset strikes for @${account.latestHandle || account.key}.`; });
    row.append(detail, reset); target.append(row);
  }
}

function renderThreshold() {
  $("threshold").value = [0, 1, 3, 5].includes(Number(settings.threshold)) ? String(settings.threshold) : "custom";
  $("customThreshold").value = settings.threshold;
  $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom");
}

async function init() {
  settings = await send({ type: "get-settings" }); data = await send({ type: "get-log" });
  $("sensitivity").value = settings.sensitivity; $("blurTrigger").value = settings.blurTrigger; $("mascotMotion").value = settings.mascotMotion;
  renderThreshold(); renderAllowlist(); renderLedger(); renderLog();
  $("prepareAi").addEventListener("click", async () => {
    $("prepareAi").disabled = true; $("aiStatus").textContent = "Preparing local model…";
    const response = await send({ type: "prepare-ai" });
    $("prepareAi").disabled = false;
    if (response.available) { settings.aiReady = true; await save(); showAiDiagnostics(false); $("aiStatus").textContent = "Local AI ready"; }
    else { settings.aiReady = false; await save(); showAiDiagnostics(true); $("aiStatus").textContent = "Local AI unavailable — check Chrome AI diagnostics"; }
  });
  $("aiDiagnostics").addEventListener("click", () => chrome.tabs.create({ url: "chrome://on-device-internals" }));
  chrome.runtime.onMessage.addListener((message) => { if (message.type === "ai-progress") $("aiStatus").textContent = `Downloading local AI ${Math.round(Math.max(0, Math.min(1, Number(message.loaded) || 0)) * 100)}%`; });
  ["sensitivity", "blurTrigger", "mascotMotion"].forEach((id) => $(id).addEventListener("change", async () => { settings[id] = $(id).value; await save(); $("message").textContent = "Saved locally."; }));
  $("threshold").addEventListener("change", async () => { renderThreshold(); await save(); $("message").textContent = "Saved locally."; });
  $("customThreshold").addEventListener("change", async () => { await save(); $("message").textContent = "Saved locally."; });
  $("addAllow").addEventListener("click", async () => { const handle = $("allowInput").value.trim().replace(/^@/, "").toLowerCase(); if (handle && !settings.allowlist.includes(handle)) settings.allowlist.push(handle); await save(); $("allowInput").value = ""; renderAllowlist(); });
  $("export").addEventListener("click", () => { const blob = new Blob([JSON.stringify({ settings, events: data.events || [], accounts: data.accounts || {} }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "vagueblock-local-records.json"; anchor.click(); URL.revokeObjectURL(url); });
  $("clear").addEventListener("click", async () => { if (!confirm("Delete all VagueBlock records?")) return; await send({ type: "clear-data" }); data = { events: [], accounts: {} }; renderLedger(); renderLog(); $("message").textContent = "Deleted."; });
  await refreshAiStatus();
}
init();
