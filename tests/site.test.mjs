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
  assert.match(support, /chrome:\/\/flags\/#prompt-api/);
  assert.match(support, /Settings → System/);
  assert.match(support, /On-device AI/);
  assert.match(support, /optimization-guide-on-device-model/);
  assert.match(support, /prompt-api-for-gemini-nano/);
});

test("support issue templates avoid requesting sensitive post data", () => {
  const templates = [
    ".github/ISSUE_TEMPLATE/ui-regression.md",
    ".github/ISSUE_TEMPLATE/false-positive.md",
    ".github/ISSUE_TEMPLATE/follow-safety.md",
    ".github/ISSUE_TEMPLATE/accessibility.md",
  ];
  for (const file of templates) {
    const content = readFileSync(resolve(root, file), "utf8");
    assert.match(content, /Chrome version/);
    assert.match(content, /Do not include|Do not paste/);
  }
});
