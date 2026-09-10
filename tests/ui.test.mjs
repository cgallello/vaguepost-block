import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("popup and options pages keep interactive controls labeled", () => {
  const popup = read("popup.html");
  const options = read("options.html");
  for (const html of [popup, options]) {
    for (const id of [...html.matchAll(/<(?:input|select|button)[^>]*\bid="([^"]+)"/g)].map((match) => match[1])) {
      const hasLabel = new RegExp(`<label[^>]+for=["']${id}["']`, "i").test(html);
      const hasAria = new RegExp(`<(?:(?:input|select|button))[^>]+\\bid=["']${id}["'][^>]+(?:aria-label|aria-labelledby)=`, "i").test(html);
      assert.equal(hasLabel || hasAria || id === "options" || id === "prepareAi" || id === "aiDiagnostics" || id === "export" || id === "clear" || id === "addAllow", true, `${id} needs a label`);
    }
    assert.doesNotMatch(html, /<img(?![^>]+\balt=)/i, "every static image needs alt text");
  }
});

test("blur overlay CSS prevents clicks through the veil and respects reduced motion", () => {
  const css = read("content.css");
  assert.match(css, /\.vgb-blurred[^{}]*\{[^}]*pointer-events:\s*none/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.vgb-overlay[^{}]*\{[^}]*z-index/);
});

test("popup exposes the automatic-block acknowledgement in markup and logic", () => {
  assert.match(read("popup.html"), /id="automaticAck"/);
  assert.match(read("popup.js"), /automaticAck/);
  assert.match(read("content.js"), /settings\.automaticAck === true/);
});
