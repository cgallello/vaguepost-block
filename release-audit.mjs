import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, status: pass ? "pass" : "pending", detail });
}

function pngInfo(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 26 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString("ascii", 1, 4) !== "PNG") throw new Error(`Invalid PNG: ${path}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const zipPath = resolve(root, `vagueblock-${manifest.version}.zip`);
check("release ZIP exists", existsSync(zipPath), zipPath);
if (existsSync(zipPath)) {
  const entries = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  const required = ["manifest.json", manifest.background.service_worker, manifest.options_page, "offscreen.html", ...manifest.content_scripts[0].js, ...manifest.content_scripts[0].css, ...Object.values(manifest.action.default_icon), ...Object.values(manifest.icons)];
  const missing = required.filter((entry) => !entries.includes(entry));
  check("release ZIP contents", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : `${entries.length} runtime entries`);
}

const requiredPngs = { "assets/icon16.png": [16, 16], "assets/icon32.png": [32, 32], "assets/icon48.png": [48, 48], "assets/icon128.png": [128, 128], "store-assets/promo-small.png": [440, 280], "store-assets/marquee.png": [1400, 560] };
for (const [relative, [width, height]] of Object.entries(requiredPngs)) {
  const path = resolve(root, relative);
  try { const info = pngInfo(path); check(`asset ${relative}`, info.width === width && info.height === height, `${info.width}×${info.height}`); }
  catch (error) { check(`asset ${relative}`, false, error.message); }
}

const mascotFiles = readdirSync(resolve(root, "assets")).filter((name) => /^king-(?:idle|point|block)\.png$/.test(name));
check("transparent mascot set", mascotFiles.length === 3 && mascotFiles.every((name) => [4, 6].includes(pngInfo(resolve(root, "assets", name)).colorType)), `${mascotFiles.length} mascot PNGs`);

for (const page of ["site/support.html", "site/privacy.html"]) {
  const html = readFileSync(resolve(root, page), "utf8");
  check(`${page} contact`, !html.includes("maintained support contact"), "Replace the contact placeholder before submission");
}

const datasetPath = resolve(root, "eval/dataset.json");
const predictionPath = resolve(root, "eval/predictions.json");
if (!existsSync(datasetPath) || !existsSync(predictionPath)) check("strict evaluation set", false, "Generate eval/dataset.json, then capture eval/predictions.json from the installed local model");
else {
  try {
    const output = execFileSync(process.execPath, [resolve(root, "eval/score.mjs"), datasetPath, predictionPath], { cwd: root, encoding: "utf8" });
    const result = JSON.parse(output);
    check("strict evaluation set", result.eligible === true, `counts=${JSON.stringify(result.counts)} precision=${result.precision}`);
  } catch (error) {
    const detail = String(error.stdout || error.message).trim().slice(0, 500);
    check("strict evaluation set", false, `Evaluation data or predictions are invalid: ${detail}`);
  }
}

const screenshots = readdirSync(resolve(root, "store-assets")).filter((name) => /^screenshot-\d+\.png$/.test(name));
check("real Store screenshots", screenshots.length >= 5, `${screenshots.length}/5 staged; capture from live Chrome/X, not fixtures`);
const screenshotSizes = [];
for (const name of screenshots) {
  try {
    const info = pngInfo(resolve(root, "store-assets", name));
    screenshotSizes.push(`${name} ${info.width}×${info.height}`);
  } catch (error) {
    screenshotSizes.push(`${name}: invalid PNG`);
  }
}
const correctlySizedScreenshots = screenshots.length >= 5 && screenshots.every((name) => {
  try {
    const info = pngInfo(resolve(root, "store-assets", name));
    return info.width === 1280 && info.height === 800 && info.colorType === 2;
  } catch { return false; }
});
check("Store screenshots 24-bit PNG", correctlySizedScreenshots, screenshotSizes.join(", ") || "No screenshots staged");
for (const [name, detail] of [
  ["controlled X safety run", "Run the two-account followed/non-followed block test"],
  ["Web Store submission", "Use an authenticated developer account with 2-step verification"],
]) check(name, false, detail);

const localAiEvidencePath = resolve(root, "docs/evidence/local-ai.json");
if (!existsSync(localAiEvidencePath)) check("Chrome local model", false, "Prepare Gemini Nano on a supported unlocked Chrome profile");
else {
  try {
    const evidence = JSON.parse(readFileSync(localAiEvidencePath, "utf8"));
    const valid = evidence.promptApiAvailability === "available" && evidence.prepareResult === "available" && evidence.extensionStatus === "Local AI ready" && evidence.networkFallback === false && typeof evidence.chromeVersion === "string";
    check("Chrome local model", valid, valid ? `Verified on Chrome ${evidence.chromeVersion}` : "Evidence is incomplete or does not prove local readiness");
  } catch (error) { check("Chrome local model", false, `Invalid evidence: ${error.message}`); }
}

const pending = checks.filter((item) => item.status === "pending");
console.log(JSON.stringify({ version: manifest.version, status: pending.length ? "pending" : "ready", checks, pending: pending.length }, null, 2));
if (process.argv.includes("--strict") && pending.length) process.exitCode = 1;
