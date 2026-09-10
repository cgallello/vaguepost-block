(() => {
  const seen = new Set();
  const seenOrder = [];
  const pending = new Set();
  const lastModelRequestByAccount = new Map();
  const requestAccountOrder = new Set();
  const ACCOUNT_MIN_INTERVAL_MS = 1500;
  const REQUEST_ACCOUNT_LIMIT = 600;
  let settings = null;
  let selectorHealthReported = false;
  let scanScheduled = false;
  const SEEN_LIMIT = 1200;

  function rememberPost(postId) {
    seen.add(postId); seenOrder.push(postId);
    while (seenOrder.length > SEEN_LIMIT) seen.delete(seenOrder.shift());
  }

  function rememberAccountRequest(handle) {
    lastModelRequestByAccount.delete(handle);
    lastModelRequestByAccount.set(handle, Date.now());
    requestAccountOrder.delete(handle);
    requestAccountOrder.add(handle);
    while (lastModelRequestByAccount.size > REQUEST_ACCOUNT_LIMIT) {
      const oldest = requestAccountOrder.values().next().value;
      requestAccountOrder.delete(oldest);
      lastModelRequestByAccount.delete(oldest);
    }
  }

  const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => {
    void chrome.runtime.lastError;
    resolve(response || {});
  }));

  const POST_SELECTOR = 'article[data-testid="tweet"], article, [role="article"]';
  function getArticleFor(node) { return node?.closest?.(POST_SELECTOR); }

  function statusFromArticle(article, handle) { const labels = [...article.querySelectorAll('button,[role="button"]')].map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim()); return VGBDom.followStateFromLabels(labels, handle); }

  function isProfilePage() {
    if (location.hostname !== 'x.com') return false;
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.length === 1 && !['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'compose'].includes(parts[0]);
  }

  function profileFollowState(handle) {
    const safeHandle = String(handle || '').replace(/[^a-z0-9_]/gi, '');
    if (!safeHandle) return 'unknown';
    const followPattern = new RegExp(`^follow(?: @?${safeHandle})?$`, 'i');
    const labels = [...document.querySelectorAll('button,[role="button"]')]
      .filter((el) => {
        const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
        return /^following(?:\s|$)/i.test(label) || followPattern.test(label);
      })
      .map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim());
    return VGBDom.followStateFromLabels(labels, safeHandle);
  }

  function reportProfileFollowState() {
    const handle = location.pathname.split('/').filter(Boolean)[0] || '';
    const state = profileFollowState(handle);
    // X renders the profile action asynchronously. Do not resolve a follow
    // check with an early unknown state; the background worker will close the
    // tab as soon as it receives a response. Wait for a definitive label or
    // let the worker's timeout fail closed.
    if (state !== 'unknown') chrome.runtime.sendMessage({ type: 'profile-state', state });
  }

  function extract(article) { return VGBDom.extractQuoteCandidate(article); }

  function findMenuButton(article) {
    return article.querySelector('[data-testid="caret"]') || [...article.querySelectorAll('button,[role="button"]')].find((el) => /more|overflow/i.test(el.getAttribute('aria-label') || ''));
  }

  function visibleMenu() {
    return [...document.querySelectorAll('[role="menu"], [data-testid="Dropdown"]')]
      .find((node) => node.getAttribute('aria-hidden') !== 'true');
  }

  function escapedHandle(handle) {
    return String(handle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findBlockMenuItem(handle) {
    const menu = visibleMenu();
    if (!menu) return null;
    const expected = new RegExp(`^block\\s+@?${escapedHandle(handle)}$`, 'i');
    return [...menu.querySelectorAll('[role="menuitem"], button, [role="button"]')]
      .find((el) => expected.test((el.textContent || '').trim()));
  }

  function findBlockConfirmation(handle) {
    const dialog = [...document.querySelectorAll('[role="dialog"]')]
      .find((node) => node.getAttribute('aria-hidden') !== 'true');
    if (!dialog) return null;
    const expected = new RegExp(`^block(?:\\s+@?${escapedHandle(handle)})?$`, 'i');
    return [...dialog.querySelectorAll('button, [role="button"]')]
      .find((el) => expected.test((el.textContent || '').trim()));
  }

  function blockResultConfirmed(article, handle) {
    if (!document.contains(article)) return true;
    const expected = new RegExp(`(?:you\\s+)?blocked\\s+@?${escapedHandle(handle)}\\b|unblock\\s+@?${escapedHandle(handle)}\\b`, 'i');
    const notices = [...document.querySelectorAll('[role="status"], [role="alert"], [data-testid="toast"], [aria-label^="Unblock @"]')];
    return notices.some((node) => expected.test(`${node.getAttribute('aria-label') || ''} ${node.textContent || ''}`));
  }

  function waitFor(predicate, timeout = 1400) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => { const value = predicate(); if (value || Date.now() - started > timeout) return resolve(value); setTimeout(tick, 50); };
      tick();
    });
  }

  async function blockAccount(article, candidate) {
    const auditFailure = async (reasonCode, followed = false) => {
      await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: followed ? 'skipped_followed' : 'error', reasonCode } });
    };
    const current = extract(article);
    const localState = current ? statusFromArticle(article, candidate.handle) : 'unknown';
    const profileState = await send({ type: 'check-follow-state', handle: candidate.handle, fresh: true });
    if (!current || current.handle.toLowerCase() !== candidate.handle.toLowerCase() || localState === 'following' || profileState.state !== 'not_following') {
      const followed = localState === 'following' || profileState.state === 'following';
      await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: VGBPolicy.followSkipOutcome(followed ? 'following' : 'unknown') } });
      return { ok: false, reason: followed ? 'followed' : 'unverified' };
    }
    const menu = findMenuButton(article);
    if (!menu) { await auditFailure('block_control_missing'); return { ok: false, reason: 'block_control_missing' }; }
    menu.click();
    const item = await waitFor(() => findBlockMenuItem(candidate.handle));
    if (!item) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return { ok: false, reason: 'block_menu_item_missing' }; }
    const finalCheck = extract(article);
    const finalLocalState = finalCheck ? statusFromArticle(article, candidate.handle) : 'unknown';
    const finalProfileState = await send({ type: 'check-follow-state', handle: candidate.handle, fresh: true });
    if (!finalCheck || finalCheck.handle.toLowerCase() !== candidate.handle.toLowerCase() || finalLocalState === 'following' || finalProfileState.state !== 'not_following') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const followed = finalLocalState === 'following' || finalProfileState.state === 'following';
      await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: followed ? 'skipped_followed' : 'skipped_unverified_follow_state' } });
      return { ok: false, reason: followed ? 'followed' : 'unverified' };
    }
    item.click();
    const confirm = await waitFor(() => findBlockConfirmation(candidate.handle));
    if (!confirm) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await auditFailure('block_confirmation_missing'); return { ok: false, reason: 'block_confirmation_missing' }; }
    confirm.click();
    const blocked = await waitFor(() => blockResultConfirmed(article, candidate.handle), 2200);
    if (!blocked) { await auditFailure('block_result_unverified'); return { ok: false, reason: 'block_result_unverified' }; }
    await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: 'blocked' } });
    return { ok: true };
  }

  function toast(message, mascot = 'idle', showLog = false) {
    const node = document.createElement('div'); node.className = 'vgb-toast'; node.setAttribute('role', 'status');
    const image = document.createElement('img'); image.src = chrome.runtime.getURL(`assets/king-${mascot}.png`); image.alt = '';
    const copy = document.createElement('span'); copy.textContent = message; node.append(image, copy);
    if (showLog) { const link = document.createElement('button'); link.type = 'button'; link.textContent = 'View activity log'; link.addEventListener('click', () => send({ type: 'open-options' })); node.append(link); }
    document.body.append(node); setTimeout(() => node.remove(), 4000);
  }

  function removeOverlay(article, restoreFocus = false) {
    article.classList.remove('vgb-blurred', 'vgb-overlay-host');
    article.querySelector('.vgb-overlay')?.remove();
    if (restoreFocus) { article.setAttribute('tabindex', '-1'); article.focus({ preventScroll: true }); setTimeout(() => article.removeAttribute('tabindex'), 0); }
  }

  function clearAllOverlays() {
    document.querySelectorAll('.vgb-overlay-host').forEach((article) => removeOverlay(article));
  }

  function addOverlay(article, candidate, result, strikeInfo, blurred = true) {
    if (article.querySelector('.vgb-overlay')) return;
    article.classList.add('vgb-overlay-host');
    if (blurred) article.classList.add('vgb-blurred');
    const overlay = document.createElement('div'); overlay.className = 'vgb-overlay'; overlay.setAttribute('role', 'region'); overlay.setAttribute('aria-live', 'polite'); overlay.setAttribute('aria-label', 'Vaguepost King review');
    if (settings.mascotMotion === 'reduced') overlay.classList.add('vgb-motion-reduced');
    if (!blurred) overlay.classList.add('vgb-review-overlay');
    const card = document.createElement('div'); card.className = 'vgb-overlay-card';
    const image = document.createElement('img'); image.src = chrome.runtime.getURL('assets/king-point.png'); image.alt = '';
    const copy = document.createElement('div'); copy.className = 'vgb-overlay-copy';
    const title = document.createElement('div'); title.className = 'vgb-overlay-title'; title.textContent = 'The Vaguepost King finds this lacking in context.';
    const reason = document.createElement('div'); reason.className = 'vgb-overlay-reason'; reason.textContent = result.explanation || 'The added text does not identify what is being discussed.';
    const strike = document.createElement('div'); strike.className = 'vgb-overlay-strike'; strike.textContent = `Strike ${strikeInfo.record.strikes} · ${candidate.handle}`;
    const actions = document.createElement('div'); actions.className = 'vgb-overlay-actions';
    const button = (label, handler, danger = false) => { const el = document.createElement('button'); el.type = 'button'; el.textContent = label; if (danger) el.className = 'vgb-danger'; el.addEventListener('click', handler); return el; };
    actions.append(button('Reveal post', () => removeOverlay(article, true)));
    actions.append(button('Not vague', async () => { removeOverlay(article, true); await send({ type: 'dismiss-strike', candidate }); await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: 'dismissed', reasonCode: result.reasonCode } }); }));
    actions.append(button(`Allow @${candidate.handle}`, async () => { const next = { ...settings, allowlist: [...new Set([...(settings.allowlist || []), candidate.handle.toLowerCase()])] }; settings = await send({ type: 'save-settings', settings: next }); removeOverlay(article, true); }));
    if (candidate.followingState === 'not_following') {
      actions.append(button(strikeInfo.thresholdReached ? `Block @${candidate.handle}` : 'Block now', async () => {
        const outcome = await blockAccount(article, candidate);
        if (outcome.ok) { removeOverlay(article); toast(`Blocked @${candidate.handle}.`, 'block', true); }
        else if (outcome.reason === 'followed' || outcome.reason === 'unverified') { removeOverlay(article); toast('Block skipped: follow status could not be verified safely.'); }
        else toast('Block skipped: X changed this control.');
      }, true));
    } else {
      const status = document.createElement('div'); status.className = 'vgb-overlay-status'; status.textContent = candidate.followingState === 'following' ? 'Block unavailable: you follow this account.' : 'Block unavailable: follow status could not be verified.'; actions.append(status);
    }
    copy.append(title, reason, strike, actions); card.append(image, copy); overlay.append(card); article.append(overlay);
  }

  async function processArticle(article) {
    const candidate = extract(article);
    if (!candidate || !VGBPolicy.localCandidateGate(candidate.addedText, candidate.quoteText) || seen.has(candidate.postId) || pending.has(candidate.postId)) return;
    if ((settings.allowlist || []).map(VGBPolicy.normalizeHandle).includes(VGBPolicy.normalizeHandle(candidate.handle))) return;
    rememberPost(candidate.postId); pending.add(candidate.postId);
    const account = VGBPolicy.normalizeHandle(candidate.handle);
    const lastRequest = lastModelRequestByAccount.get(account) || 0;
    if (Date.now() - lastRequest < ACCOUNT_MIN_INTERVAL_MS) { pending.delete(candidate.postId); return; }
    rememberAccountRequest(account);
    await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: 'candidate' } });
    try {
      const response = await send({ type: 'classify-candidate', candidate });
      if (!response?.result || !VGBPolicy.confidenceGate(response.result, settings.sensitivity)) return;
      await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: 'flagged', reasonCode: response.result.reasonCode, confidenceBand: response.result.confidence >= .9 ? 'high' : response.result.confidence >= .82 ? 'medium' : 'low' } });
      if (candidate.followingState === 'unknown') {
        const profileState = await send({ type: 'check-follow-state', handle: candidate.handle });
        candidate.followingState = profileState.state || 'unknown';
      }
      if (!VGBPolicy.followStateAllowsAction(candidate.followingState)) {
        await send({ type: 'record-event', event: { handle: candidate.handle, postIdHash: candidate.postId, outcome: VGBPolicy.followSkipOutcome(candidate.followingState) } });
        return;
      }
      const strikeInfo = await send({ type: 'record-strike', candidate, result: response.result });
      if (strikeInfo.skipped || strikeInfo.dismissed || strikeInfo.duplicate) return;
      if (settings.actionMode === 'blur' && (settings.blurTrigger === 'every_high_confidence_flag' || strikeInfo.thresholdReached)) addOverlay(article, candidate, response.result, strikeInfo, true);
      if (settings.actionMode === 'review') addOverlay(article, candidate, response.result, strikeInfo, false);
      if (settings.actionMode === 'automatic' && settings.automaticAck === true && strikeInfo.thresholdReached && VGBPolicy.automaticBlockAllowed(response.result) && candidate.followingState === 'not_following') {
        const outcome = await blockAccount(article, candidate);
        if (outcome.ok) { removeOverlay(article); toast(`Blocked @${candidate.handle}.`, 'block', true); }
      }
    } finally {
      pending.delete(candidate.postId);
    }
  }

  async function reportSelectorHealth() {
    if (selectorHealthReported || !settings?.enabled) return;
    const articles = [...document.querySelectorAll(POST_SELECTOR)];
    if (articles.length < 3) return;
    const hasTweetText = articles.some((article) => article.querySelector('[data-testid="tweetText"]'));
    const hasStatusLink = articles.some((article) => article.querySelector('a[href*="/status/"]'));
    if (hasTweetText && hasStatusLink) return;
    selectorHealthReported = true;
    await send({ type: 'record-event', event: { outcome: 'error', reasonCode: `selector_health_missing_${hasTweetText ? 'status_links' : 'tweet_text'}` } });
  }
  async function scan() { if (!settings?.enabled) return; document.querySelectorAll(POST_SELECTOR).forEach(processArticle); void reportSelectorHealth(); }
  function scheduleScan() { if (scanScheduled) return; scanScheduled = true; const run = () => { scanScheduled = false; void scan(); }; if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 500 }); else requestAnimationFrame(run); }
  async function init() { if (isProfilePage()) { const observer = new MutationObserver(reportProfileFollowState); observer.observe(document.body, { childList: true, subtree: true }); reportProfileFollowState(); setTimeout(reportProfileFollowState, 900); return; } settings = await send({ type: 'get-settings' }); await scan(); setTimeout(reportSelectorHealth, 2000); const observer = new MutationObserver(scheduleScan); observer.observe(document.body, { childList: true, subtree: true }); chrome.runtime.onMessage.addListener((message) => { if (message.type === 'settings-changed') { settings = message.settings; seen.clear(); seenOrder.length = 0; pending.clear(); lastModelRequestByAccount.clear(); requestAccountOrder.clear(); selectorHealthReported = false; if (!settings.enabled) clearAllOverlays(); else scheduleScan(); } }); }
  init();
})();
