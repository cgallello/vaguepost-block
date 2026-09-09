const $ = (id) => document.getElementById(id);
const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => resolve(response || {})));
let settings;

function updateModeHelp() {
  const text = { blur: "The King will cover likely vagueposts and let you decide.", review: "Show a quiet flag without covering the post.", automatic: "Block only after the threshold and final safety checks." };
  $("modeHelp").textContent = text[$("actionMode").value];
}
function thresholdValue() { return $("threshold").value === "custom" ? Math.max(0, Math.min(10, Number($("customThreshold").value || 0))) : Number($("threshold").value); }
async function save() { settings = await send({ type: "save-settings", settings: { ...settings, enabled: $("enabled").checked, actionMode: $("actionMode").value, threshold: thresholdValue() } }); updateModeHelp(); }
async function init() {
  settings = await send({ type: "get-settings" }); $("enabled").checked = settings.enabled; $("actionMode").value = settings.actionMode; $("threshold").value = [0, 1, 3, 5].includes(Number(settings.threshold)) ? String(settings.threshold) : "custom"; $("customThreshold").value = settings.threshold; $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); updateModeHelp();
  $("enabled").addEventListener("change", save); $("actionMode").addEventListener("change", save); $("threshold").addEventListener("change", () => { $("customThreshold").classList.toggle("hidden", $("threshold").value !== "custom"); save(); }); $("customThreshold").addEventListener("change", save);
  $("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("prepareAi").addEventListener("click", async () => {
    if (!globalThis.LanguageModel) { $("aiStatus").textContent = "Chrome local AI API unavailable"; return; }
    $("aiStatus").textContent = "Preparing local model…";
    try {
      const availability = await LanguageModel.availability({ languages: ["en"] });
      if (availability === "unavailable") throw new Error("unsupported");
      const session = await LanguageModel.create({ temperature: 0.1, topK: 3 });
      session?.destroy?.(); settings.aiReady = true; await save(); $("aiStatus").textContent = "Local AI ready";
    } catch { $("aiStatus").textContent = "Local AI unavailable on this device"; }
  });
  const data = await send({ type: "get-log" }); const events = data.events || []; $("flagCount").textContent = events.filter((event) => event.outcome === "strike_added").length; $("blockCount").textContent = events.filter((event) => event.outcome === "blocked").length; $("skipCount").textContent = events.filter((event) => /skipped/.test(event.outcome)).length; $("aiStatus").textContent = settings.aiReady ? "Local AI ready" : "Local AI checks on first scan";
}
init();
