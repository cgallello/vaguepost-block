import test from "node:test";
import assert from "node:assert/strict";
import { extractQuoteCandidate, followStateFromLabels } from "../shared/dom-adapter.mjs";

function link(href, order = 0) { return { href, getAttribute(name) { return name === "href" ? href : null; }, compareDocumentPosition(other) { return order < (other.order || 0) ? 4 : 0; }, order }; }
function textNode(text) { return { innerText: text }; }
function button(label) { return { textContent: label, getAttribute(name) { return name === "aria-label" ? label : null; } }; }
function article({ labels = ["Follow"], added = "Can I say something?", quote = "A quoted post with context.", authorHref = "/sample_author", statusLinks = ["https://x.com/a/status/111", "https://x.com/b/status/222"] } = {}) {
  const nodes = {
    'a[href*="/status/"]': statusLinks.map((href, index) => link(href, index + 2)),
    '[data-testid="User-Name"] a[href^="/"]': [link(authorHref)],
    'a[href^="/"][role="link"]': [],
    '[data-testid="tweetText"]': [textNode(added), textNode(quote)],
    'button,[role="button"]': labels.map(button),
  };
  return { querySelectorAll(selector) { return nodes[selector] || []; }, querySelector(selector) { return (nodes[selector] || [])[0] || null; } };
}

test("follow-state adapter is fail-closed when evidence is ambiguous", () => {
  assert.equal(followStateFromLabels(["Following"], "author"), "following");
  assert.equal(followStateFromLabels(["Follow @author"], "author"), "not_following");
  assert.equal(followStateFromLabels(["Follow back @author"], "author"), "not_following");
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

test("quote-post adapter fails closed when the author identity selector is missing", () => {
  const candidate = article({});
  candidate.querySelector = () => null;
  assert.equal(extractQuoteCandidate(candidate), null);
});

test("quote-post adapter supports the conversation-view author-link layout", () => {
  const author = link("/conversation_author", 1);
  const ownStatus = link("https://x.com/conversation_author/status/111", 2);
  const quoteStatus = link("https://x.com/original/status/222", 3);
  const nodes = {
    'a[href*="/status/"]': [ownStatus, quoteStatus],
    a: [author, ownStatus, quoteStatus],
    '[data-testid="tweetText"]': [textNode("Can I say something?"), textNode("A quoted post with context.")],
    'button,[role="button"]': [button("Follow @conversation_author")],
  };
  const candidate = { querySelectorAll(selector) { return nodes[selector] || []; }, querySelector() { return null; } };
  assert.equal(extractQuoteCandidate(candidate).handle, "conversation_author");
});

test("quote-post adapter normalizes absolute author links", () => {
  const candidate = article({
    authorHref: "https://x.com/absolute_author",
    statusLinks: [
      "https://x.com/absolute_author/status/222",
      "https://x.com/quoted/status/333",
    ],
  });
  assert.equal(extractQuoteCandidate(candidate).handle, "absolute_author");
});

test("quote-post adapter accepts X conversation posts whose quote has no status anchor", () => {
  const author = link("/conversation_author", 1);
  const ownStatus = link("/conversation_author/status/111", 2);
  const photo = link("/conversation_author/status/111/photo/1", 3);
  const nodes = {
    'a[href*="/status/"]': [photo, ownStatus],
    a: [author, photo, ownStatus],
    '[data-testid="tweetText"]': [textNode("can i say something without everyone getting mad at me"), textNode("is that american psycho remake still happening? #thinking...")],
    'button,[role="button"]': [button("More")],
  };
  const candidate = { querySelectorAll(selector) { return nodes[selector] || []; }, querySelector() { return null; } };
  assert.equal(extractQuoteCandidate(candidate).quotedPostId, "quote:111");
});
