import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const dist = resolve(root, "dist");
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const zipPath = resolve(root, `vagueblock-${manifest.version}.zip`);
rmSync(dist, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(dist, { recursive: true });
for (const entry of ["manifest.json", "background.js", "classifier.js", "offscreen.html", "content.js", "content.css", "popup.html", "popup.js", "options.html", "options.js", "ui.css", "shared", "assets"]) cpSync(resolve(root, entry), resolve(dist, entry), { recursive: true });
execFileSync("zip", ["-qr", zipPath, "."], { cwd: dist });
console.log(`Packaged ${zipPath}`);
