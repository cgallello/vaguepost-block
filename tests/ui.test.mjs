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
  assert.match(css, /@keyframes vgb-pop/);
  assert.match(css, /\.vgb-motion-reduced \.vgb-overlay-card[^{}]*\{[^}]*animation:\s*none/i);
});

test("popup exposes the automatic-block acknowledgement in markup and logic", () => {
  assert.match(read("popup.html"), /id="automaticAck"/);
  assert.match(read("popup.js"), /automaticAck/);
  assert.match(read("content.js"), /settings\.automaticAck === true/);
});

test("popup exposes separate followed and uncertain safety counters", () => {
  const popup = read("popup.html");
  const logic = read("popup.js");
  assert.match(popup, /id="followedSkipCount"/);
  assert.match(popup, /id="uncertainSkipCount"/);
  assert.match(logic, /event\.outcome === "skipped_followed"/);
  assert.match(logic, /event\.outcome === "skipped_unverified_follow_state"/);
});

test("options exposes local-AI preparation and diagnostics", () => {
  assert.match(read("options.html"), /id="prepareAi"/);
  assert.match(read("options.html"), /id="aiDiagnostics"/);
  assert.match(read("options.html"), /id="aiDetail"/);
  assert.match(read("options.js"), /type: "prepare-ai"/);
  assert.match(read("options.js"), /prompt_api_not_exposed/);
  assert.match(read("options.js"), /chrome:\/\/on-device-internals/);
});

test("evaluation runner exposes row-by-row benchmark results and export controls", () => {
  const runner = read("tools/eval-runner.html");
  const logic = read("tools/eval-runner.js");
  for (const id of ["scoreSummary", "labelFilter", "decisionFilter", "resultSearch", "copyResults", "resultsBody"]) assert.match(runner, new RegExp(`id=["']${id}["']`));
  for (const heading of ["Added tweet", "Quoted tweet", "Expected", "Scored", "Confidence", "Reason", "Explanation"]) assert.match(runner, new RegExp(`<th>${heading}</th>`));
  assert.match(logic, /function renderResults\(\)/);
  assert.match(logic, /function resultsCsv\(\)/);
  assert.match(logic, /navigator\.clipboard\.writeText\(resultsCsv\(\)\)/);
});

test("popup keeps a separate local-AI diagnostic detail region", () => {
  assert.match(read("popup.html"), /id="aiStatus"[^>]*aria-live="polite"/);
  assert.match(read("popup.html"), /id="aiDetail"/);
  assert.match(read("popup.js"), /prompt_api_not_exposed/);
});

test("block coordination scopes menu and result checks to explicit X controls", () => {
  const content = read("content.js");
  assert.match(content, /function findBlockMenuItem\(handle\)/);
  assert.match(content, /function findBlockConfirmation\(handle\)/);
  assert.match(content, /function blockResultConfirmed\(article, handle\)/);
  assert.doesNotMatch(content, /document\.body\.innerText/);
});

test("background serializes activity writes and waits before deletion", () => {
  const background = read("background.js");
  assert.match(background, /let eventQueue = Promise\.resolve\(\)/);
  assert.match(background, /eventQueue = eventQueue\.catch/);
  assert.match(background, /Promise\.all\(\[eventQueue\.catch/);
});

test("AI readiness and preparation have bounded failure paths", () => {
  const background = read("background.js");
  assert.match(background, /AI_STATUS_TIMEOUT_MS/);
  assert.match(background, /AI_PREPARE_TIMEOUT_MS/);
  assert.match(background, /local_ai_status_timeout/);
  assert.match(background, /local_ai_prepare_timeout/);
});

test("synthetic timeline fixture covers vague, understandable, and followed posts", () => {
  const fixture = read("tests/fixture.html");
  assert.match(fixture, /fixture_author/);
  assert.match(fixture, /concrete_author/);
  assert.match(fixture, /followed_author/);
  assert.match(fixture, /isVague: false/);
  assert.match(fixture, /state: message\.handle === 'followed_author' \? 'following'/);
});
