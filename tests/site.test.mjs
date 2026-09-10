import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);

test("public support and privacy pages are self-contained and present", () => {
  for (const file of ["site/index.html", "site/privacy.html", "site/support.html", "site/styles.css", "site/assets/marquee.png", "site/assets/king-point.png"]) assert.equal(existsSync(resolve(root, file)), true, file);
  const privacy = readFileSync(resolve(root, "site/privacy.html"), "utf8");
  const support = readFileSync(resolve(root, "site/support.html"), "utf8");
  assert.match(privacy, /No transmission or sale/);
  assert.match(privacy, /https:\/\/x\.com/);
  assert.match(support, /optimization-guide-on-device-model/);
  assert.match(support, /prompt-api-for-gemini-nano/);
});
