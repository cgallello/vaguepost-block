import test from "node:test";
import assert from "node:assert/strict";
import { extractQuoteCandidate, followStateFromLabels } from "../shared/dom-adapter.mjs";

function link(href) { return { href, getAttribute(name) { return name === "href" ? href : null; } }; }
function textNode(text) { return { innerText: text }; }
function button(label) { return { textContent: label, getAttribute(name) { return name === "aria-label" ? label : null; } }; }
function article({ labels = ["Follow"], added = "Can I say something?", quote = "A quoted post with context." } = {}) {
  const nodes = {
    'a[href*="/status/"]': [link("https://x.com/a/status/111"), link("https://x.com/b/status/222")],
    '[data-testid="User-Name"] a[href^="/"]': [link("/sample_author")],
    'a[href^="/"][role="link"]': [],
    '[data-testid="tweetText"]': [textNode(added), textNode(quote)],
    'button,[role="button"]': labels.map(button),
  };
  return { querySelectorAll(selector) { return nodes[selector] || []; }, querySelector(selector) { return (nodes[selector] || [])[0] || null; } };
}

test("follow-state adapter is fail-closed when evidence is ambiguous", () => {
  assert.equal(followStateFromLabels(["Following"], "author"), "following");
  assert.equal(followStateFromLabels(["Follow @author"], "author"), "not_following");
  assert.equal(followStateFromLabels(["Follow", "Following"], "author"), "unknown");
  assert.equal(followStateFromLabels([], "author"), "unknown");
});

test("quote-post adapter extracts two status IDs, bounded text, and author state", () => {
  const result = extractQuoteCandidate(article({ labels: ["Follow @sample_author"] }));
  assert.deepEqual(result, { postId: "111", quotedPostId: "222", handle: "sample_author", addedText: "Can I say something?", quoteText: "A quoted post with context.", followingState: "not_following" });
  assert.equal(extractQuoteCandidate(article({ quote: "" })), null);
});

test("quote-post adapter truncates model input to bounded lengths", () => {
  const result = extractQuoteCandidate(article({ added: "a".repeat(1000), quote: "b".repeat(3000) }));
  assert.equal(result.addedText.length, 420);
  assert.equal(result.quoteText.length, 1600);
});
