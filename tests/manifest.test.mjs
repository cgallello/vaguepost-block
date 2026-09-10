import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));

test("manifest stays narrowly scoped to the single purpose", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["offscreen", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://x.com/*"]);
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.options_page, "options.html");
  assert.equal(manifest.content_scripts[0].matches[0], "https://x.com/*");
  assert.deepEqual(manifest.content_scripts[0].js, ["shared/policy.js", "shared/dom-adapter.js", "content.js"]);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test("runtime manifest references resolve to files", () => {
  const files = [
    manifest.background.service_worker,
    manifest.options_page,
    ...manifest.content_scripts[0].js,
    ...manifest.content_scripts[0].css,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons)
  ];
  for (const file of files) assert.equal(existsSync(new URL(file, root)), true, file);
});

test("web accessible resources are limited to bundled mascot assets", () => {
  assert.deepEqual(manifest.web_accessible_resources[0].resources, ["assets/*"]);
  assert.deepEqual(manifest.web_accessible_resources[0].matches, ["https://x.com/*"]);
});

test("runtime source contains no remote model or telemetry transport", () => {
  for (const file of ["background.js", "classifier.js", "content.js", "popup.js", "options.js"]) {
    const source = readFileSync(new URL(file, root), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, file);
    const externalUrls = [...source.matchAll(/https?:\/\/[^'"`\s)]+/g)].map(([url]) => url).filter((url) => !url.startsWith("https://x.com/"));
    assert.deepEqual(externalUrls, [], file);
  }
});
