import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const zipPath = resolve(root, `vagueblock-${manifest.version}.zip`);
if (!existsSync(zipPath)) throw new Error(`Missing package: ${zipPath}`);

const entries = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
  .split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
const entrySet = new Set(entries);
const required = new Set([
  "manifest.json",
  manifest.background.service_worker,
  manifest.options_page,
  ...manifest.content_scripts[0].js,
  ...manifest.content_scripts[0].css,
  ...Object.values(manifest.action.default_icon),
  ...Object.values(manifest.icons),
]);
for (const file of required) if (!entrySet.has(file)) throw new Error(`Package is missing ${file}`);
for (const entry of entries) {
  if (/^(?:tests|docs|site|store-assets|dist|node_modules)\//.test(entry)) throw new Error(`Development-only file shipped: ${entry}`);
}
if (entries.some((entry) => /(?:^|\/)(?:\.DS_Store|Thumbs\.db)$/.test(entry))) throw new Error("Package contains an OS metadata file");
console.log(`Verified ${zipPath}: ${entries.length} runtime entries`);
