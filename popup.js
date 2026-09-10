const $ = (id) => document.getElementById(id);
const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => { void chrome.runtime.lastError; resolve(response || {}); }));
let settings;

function updateModeHelp() {
  const text = { blur: "The King will cover likely vagueposts and let you decide.", review: "Show a quiet flag without covering the post.", automatic: "Block only after the threshold and final safety checks." };
  $("modeHelp").textContent = text[$("actionMode").value];
  $("automaticAckRow").classList.toggle("hidden", $("actionMode").value !== "automatic");
}
function showAiDiagnostics(show) { $("aiDiagnostics").classList.toggle("hidden", !show); }
function thresholdValue() { return $("threshold").value === "custom" ? Math.max(0, Math.min(10, Number($("customThreshold").value || 0))) : Number($("threshold").value); }
async function refreshAiStatus() {
  const response = await send({ type: "ai-status" });
  const availability = response.availability || "unavailable";
  const labels = { available: "Local AI ready", downloadable: "Local AI download needed", downloading: "Downloading local AI…", unavailable: "Local AI unavailable on this device" };
  $("aiStatus").textContent = labels[availability] || "Local AI status unknown";
  showAiDiagnostics(availability === "unavailable");
  if (availability === "available" && settings.aiReady !== true) settings = await send({ type: "save-settings", settings: { ...settings, aiReady: true } });
}
async function save() { settings = await send({ type: "save-settings", settings: { ...settings, enabled: $("enabled").checked, actionMode: $("actionMode").value, threshold: thresholdValue(), sensitivity: $("sensitivity").value, automaticAck: $("automaticAck").checked } }); updateModeHelp(); }
async function init() {
  settings = await send({ type: "get-settings" }); $("enabled").checked = settings.enabled; $("actionMode").value = settings.actionMode; $("automaticAck").checked = settings.automaticAck === true; $("sensitivity").value = settings.sensitivity; $("threshold").value = [0, 1, 3, 5].includes(Number(settings.threshold)) ? String(settings.threshold) : "custom"; $("customThreshold").value = settings.threshold; $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); updateModeHelp();
  $("enabled").addEventListener("change", save); $("actionMode").addEventListener("change", async () => { updateModeHelp(); if ($("actionMode").value === "automatic" && !$("automaticAck").checked) { $("aiStatus").textContent = "Check the acknowledgement to enable automatic blocks"; return; } await save(); $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan"; }); $("automaticAck").addEventListener("change", async () => { if (!$('automaticAck').checked && $("actionMode").value === "automatic") $("actionMode").value = "blur"; updateModeHelp(); await save(); $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan"; }); $("sensitivity").addEventListener("change", save); $("threshold").addEventListener("change", () => { $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); save(); }); $("customThreshold").addEventListener("change", save);
  $("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("actionMode").addEventListener("change", () => { if ($("actionMode").value === "automatic" && !$("automaticAck").checked) { $("actionMode").value = settings.actionMode; updateModeHelp(); } });
  $("prepareAi").addEventListener("click", async () => {
    $("prepareAi").disabled = true; $("aiStatus").textContent = "Preparing local model…";
    const response = await send({ type: "prepare-ai" });
    $("prepareAi").disabled = false;
    if (response.available) { settings.aiReady = true; await save(); showAiDiagnostics(false); $("aiStatus").textContent = "Local AI ready"; }
    else { settings.aiReady = false; await save(); showAiDiagnostics(true); $("aiStatus").textContent = "Local AI unavailable — check Chrome AI diagnostics"; }
  });
  $("aiDiagnostics").addEventListener("click", () => chrome.tabs.create({ url: "chrome://on-device-internals" }));
  chrome.runtime.onMessage.addListener((message) => { if (message.type === "ai-progress") $("aiStatus").textContent = `Downloading local AI ${Math.round(Math.max(0, Math.min(1, Number(message.loaded) || 0)) * 100)}%`; });
  const data = await send({ type: "get-log" }); const events = data.events || []; $("candidateCount").textContent = events.filter((event) => event.outcome === "candidate").length; $("flagCount").textContent = events.filter((event) => event.outcome === "flagged").length; $("followedSkipCount").textContent = events.filter((event) => event.outcome === "skipped_followed").length; $("uncertainSkipCount").textContent = events.filter((event) => event.outcome === "skipped_unverified_follow_state").length; $("blockCount").textContent = events.filter((event) => event.outcome === "blocked").length; await refreshAiStatus();
}
init();
