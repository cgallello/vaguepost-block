import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const runtimeFiles = ["background.js", "classifier.js", "content.js", "popup.js", "options.js", "shared/policy.js", "shared/dom-adapter.js"];
const forbidden = [
  [/\beval\s*\(/, "eval"],
  [/\bnew\s+Function\s*\(/, "dynamic Function"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, "remote transport"],
  [/document\.body\.innerText/, "unscoped body text"],
];
const errors = [];
for (const file of runtimeFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  if (!source.endsWith("\n")) errors.push(`${file}: missing trailing newline`);
  for (const [pattern, label] of forbidden) if (pattern.test(source)) errors.push(`${file}: forbidden ${label}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Lint passed: ${runtimeFiles.length} runtime files checked.`);
}
