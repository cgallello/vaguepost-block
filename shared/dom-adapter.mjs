export function followStateFromLabels(labels, handle = "") {
  const values = (labels || []).map((label) => String(label || "").trim()).filter(Boolean);
  const following = values.filter((label) => /^following(?:\s|$)/i.test(label));
  const followPattern = handle ? new RegExp(`^follow(?:\\s+back)?(?: @?${String(handle).replace(/[^a-z0-9_]/gi, "")})?$`, "i") : /^follow(?:\s|$)/i;
  const follow = values.filter((label) => followPattern.test(label) || /^follow$/i.test(label));
  if (following.length === 1 && follow.length === 0) return "following";
  if (follow.length === 1 && following.length === 0) return "not_following";
  return "unknown";
}

export function extractQuoteCandidate(article) {
  if (!article) return null;
  const links = [...article.querySelectorAll('a[href*="/status/"]')];
  const ids = [...new Set(links.map((link) => {
    const rawHref = link.getAttribute('href') || link.href || '';
    try { return new URL(rawHref, "https://x.com/").pathname.match(/\/status\/(\d+)$/)?.[1] || ''; } catch { return rawHref.match(/\/status\/(\d+)$/)?.[1] || ''; }
  }).filter(Boolean))];
  if (ids.length < 1) return null;
  const firstStatus = links[0];
  const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]') || (() => {
    const profileLinks = [...article.querySelectorAll('a')].filter((link) => {
      const rawHref = link.getAttribute('href') || link.href || '';
      let path = rawHref;
      try { path = new URL(rawHref, 'https://x.com/').pathname; } catch { /* malformed links are not author evidence */ }
      const parts = path.split('?')[0].split('/').filter(Boolean);
      return parts.length === 1 && !['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'compose'].includes(parts[0]);
    });
    return profileLinks.find((link) => (link.compareDocumentPosition(firstStatus) & 4) !== 0) || null;
  })();
  const handle = (() => {
    if (!authorLink) return '';
    const rawHref = authorLink.getAttribute('href') || authorLink.href || '';
    try {
      return new URL(rawHref, "https://x.com/").pathname.split('/').filter(Boolean)[0] || '';
    } catch {
      return rawHref.split('/').filter(Boolean)[0] || '';
    }
  })();
  if (!handle) return null;
  const textNodes = [...article.querySelectorAll('[data-testid="tweetText"]')].map((node) => node.innerText?.trim()).filter(Boolean);
  const addedText = (textNodes[0] || '').slice(0, 420);
  const quoteText = (textNodes[1] || '').slice(0, 1600);
  if (!addedText || !quoteText) return null;
  const labels = [...article.querySelectorAll('button,[role="button"]')].map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim());
  return { postId: ids[0], quotedPostId: ids[1] || `quote:${ids[0]}`, handle, addedText, quoteText, followingState: followStateFromLabels(labels, handle) };
}
