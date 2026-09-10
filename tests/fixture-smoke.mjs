import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = `file://${resolve(root, "tests/fixture.html")}`;
const candidates = [
  process.env.VGB_CHROME_BIN,
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
].filter(Boolean);

function runChrome(binary) {
  return new Promise((resolveRun, reject) => {
    const profile = mkdtempSync(resolve(tmpdir(), "vagueblock-fixture-"));
    const args = [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${profile}`,
      "--allow-file-access-from-files",
      "--virtual-time-budget=2500",
      "--dump-dom",
      fixture,
    ];
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    let settled = false;
    const finish = (error, dom = output) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!child.killed) child.kill("SIGKILL");
      rmSync(profile, { recursive: true, force: true });
      if (error) reject(error); else resolveRun(dom);
    };
    const timer = setTimeout(() => {
      if (output.includes("</html>")) finish(null);
      else finish(new Error(`Timed out launching ${binary}`));
    }, 15_000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("</html>")) finish(null);
    });
    child.on("error", (error) => finish(error));
    child.on("close", () => finish(null));
  });
}

let dom;
let lastError;
for (const binary of candidates) {
  try {
    dom = await runChrome(binary);
    break;
  } catch (error) {
    lastError = error;
  }
}
if (!dom) throw lastError || new Error("Set VGB_CHROME_BIN to a Chrome/Chromium executable");

function articleFor(handle) {
  const match = [...dom.matchAll(/<article[^>]*>[\s\S]*?<\/article>/g)].map(([article]) => article).find((article) => article.includes(handle));
  assert.ok(match, `fixture article missing: ${handle}`);
  return match;
}
assert.match(articleFor("fixture_author"), /vgb-overlay-host[\s\S]*Block @fixture_author/, "vague fixture should be blurred and actionable");
assert.doesNotMatch(articleFor("concrete_author"), /vgb-overlay/, "understandable fixture must remain untouched");
assert.doesNotMatch(articleFor("followed_author"), /vgb-overlay/, "followed fixture must remain untouched");
console.log("Fixture smoke passed: vague overlay shown; understandable and followed posts untouched.");
