const $ = (id) => document.getElementById(id);
const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => resolve(response || {})));
const AI_AVAILABILITY_OPTIONS = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };
let settings;

function updateModeHelp() {
  const text = { blur: "The King will cover likely vagueposts and let you decide.", review: "Show a quiet flag without covering the post.", automatic: "Block only after the threshold and final safety checks." };
  $("modeHelp").textContent = text[$("actionMode").value];
  $("automaticAckRow").classList.toggle("hidden", $("actionMode").value !== "automatic");
}
function thresholdValue() { return $("threshold").value === "custom" ? Math.max(0, Math.min(10, Number($("customThreshold").value || 0))) : Number($("threshold").value); }
async function save() { settings = await send({ type: "save-settings", settings: { ...settings, enabled: $("enabled").checked, actionMode: $("actionMode").value, threshold: thresholdValue(), sensitivity: $("sensitivity").value, automaticAck: $("automaticAck").checked } }); updateModeHelp(); }
async function init() {
  settings = await send({ type: "get-settings" }); $("enabled").checked = settings.enabled; $("actionMode").value = settings.actionMode; $("automaticAck").checked = settings.automaticAck === true; $("sensitivity").value = settings.sensitivity; $("threshold").value = [0, 1, 3, 5].includes(Number(settings.threshold)) ? String(settings.threshold) : "custom"; $("customThreshold").value = settings.threshold; $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); updateModeHelp();
  $("enabled").addEventListener("change", save); $("actionMode").addEventListener("change", async () => { updateModeHelp(); if ($("actionMode").value === "automatic" && !$("automaticAck").checked) { $("aiStatus").textContent = "Check the acknowledgement to enable automatic blocks"; return; } await save(); $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan"; }); $("automaticAck").addEventListener("change", async () => { if (!$('automaticAck').checked && $("actionMode").value === "automatic") $("actionMode").value = "blur"; updateModeHelp(); await save(); $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan"; }); $("sensitivity").addEventListener("change", save); $("threshold").addEventListener("change", () => { $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); save(); }); $("customThreshold").addEventListener("change", save);
  $("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("prepareAi").addEventListener("click", async () => {
    if (!globalThis.LanguageModel) { $("aiStatus").textContent = "Chrome local AI API unavailable"; return; }
    $("aiStatus").textContent = "Preparing local model…";
    try {
      const availability = await LanguageModel.availability(AI_AVAILABILITY_OPTIONS);
      if (availability === "unavailable") throw new Error("unsupported");
      const session = await LanguageModel.create({ temperature: 0.1, topK: 3, monitor(monitor) { monitor.addEventListener("downloadprogress", (event) => { $("aiStatus").textContent = `Downloading local AI ${Math.round(event.loaded * 100)}%`; }); } });
      session?.destroy?.(); settings.aiReady = true; await save(); $("aiStatus").textContent = "Local AI ready";
    } catch { $("aiStatus").textContent = "Local AI unavailable on this device"; }
  });
  const data = await send({ type: "get-log" }); const events = data.events || []; $("flagCount").textContent = events.filter((event) => event.outcome === "strike_added").length; $("blockCount").textContent = events.filter((event) => event.outcome === "blocked").length; $("skipCount").textContent = events.filter((event) => /skipped/.test(event.outcome)).length; $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan";
}
init();
