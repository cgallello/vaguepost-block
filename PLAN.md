# VagueBlock — Product and launch plan

**Status:** Approved planning baseline  
**Platform:** Chrome desktop extension, Manifest V3  
**Initial scope:** `https://x.com/*` desktop timelines, English-language posts

## 1. Product definition

### The problem

Some people quote-post without supplying enough context to understand their reaction, relying on curiosity clicks into the quoted post. The product gives people a controlled way to identify this behavior and, after a configurable number of occurrences, block the account.

### The promise

VagueBlock analyzes likely vague **quote-posts** locally, counts strikes per account, and can block an account after the user-selected threshold. It must never block an account the user follows. When follow status cannot be verified, it skips the account rather than risking a block.

### Non-goals for version 1

- No mobile extension.
- No direct calls to X internal/private APIs.
- No cloud classifier, model API key, user account, telemetry, ads, or data resale.
- No muting, replying to, liking, reposting, or managing any other social activity. The sole feed treatment is the user-selected Blur & Review overlay for qualifying quote-posts.
- No language support outside English until measured evaluation supports it.

This keeps the Store purpose narrow: locally identify and act on vague quote-posts in X timelines.

## 2. Naming and brand

### Recommended name

**VagueBlock**

Tagline: **The Vaguepost King demands context.**

Do not use X's logo, stylized wordmark, or imply affiliation. The Store description can say “for x.com” only where needed to explain compatibility.

### Visual system

The supplied “Vaguepost King” reference sets the visual direction: charming, deliberately lo-fi internet-cartoon linework; a stern royal mascot; bright electric green; chunky black outlines; and strange, specific desktop-era details rather than generic productivity-app minimalism. The experience should feel like a mischievous court intervening in a boring bit of social-media theater.

- **Mascot:** The Vaguepost King—an original, transparent-background PNG character in a bright green robe, simple crown, dark beard, and staff with a glowing green orb. His expression is unimpressed rather than hostile.
- **Illustration style:** uneven hand-drawn black contours, flat fills, a few intentionally imperfect details, and a restrained retro-computer sensibility. Avoid gradients, glossy 3D, corporate vector art, and photorealism.
- **Core mark:** a crown over a speech bubble with a missing-context gap; at tiny icon sizes, use only the crown, orb, and speech-bubble silhouette.
- **Palette:** royal green `#00E848`, deep forest `#087C2C`, ink `#111111`, parchment `#FFFDF7`, gray-beard `#777777`, and alert burgundy `#8E1532`.
- **Type:** expressive italic green display lettering only in illustrations/promotional art; system sans-serif for product controls and every functional label.
- **Tone:** playful, specific, and user-controlled. The joke is the vaguepost, never the person using the extension.
- **Accessibility:** 4.5:1 minimum text contrast; every icon has a label or tooltip; never rely on the green color, character, or blur alone to communicate status.

### Mascot rights and production

The supplied image is a creative reference, not an automatically cleared production asset. Before using its exact character, creator, or any derivative in the Store, obtain written ownership/license permission. If that is not available, commission an original Vaguepost King that takes only the broad direction—lo-fi royal critic, green robe, staff, and transparent PNG—and does not copy the reference's exact drawing, face, crown, pose, wording, scene, or composition.

The production mascot is bundled in the extension package, never fetched from a server. Deliver `king-idle.png`, `king-point.png`, and `king-block.png` as transparent PNGs at 1× and 2×, with a source SVG/PSD/Procreate file retained privately for future fixes. Provide alt text and a non-mascot text equivalent for each message.

### Required assets

| Asset | Specification | Purpose |
|---|---:|---|
| Extension icons | PNG: 16, 32, 48, 128 px | Crown/orb/speech-bubble browser UI and package marks |
| Store icon | 128×128 PNG | Clear mascot or crown mark; not a tiny full scene |
| Transparent mascot set | `king-idle`, `king-point`, `king-block`, 1×/2× PNG | In-page Blur & Review overlay |
| Small promo tile | 440×280 PNG | Vaguepost King, short promise, and real UI glimpse |
| Marquee image | 1400×560 PNG, optional | The king at his retro terminal, with ample uncluttered space |
| Screenshots | Five 1280×800 PNGs | Blur overlay, review controls, strike settings, follow safety, activity log |
| Social/website image | 1200×630 PNG | Project/support site |

The current generated promotional files are [store-assets/promo-small.png](store-assets/promo-small.png) and [store-assets/marquee.png](store-assets/marquee.png). Capture the five product screenshots after live Chrome/X verification; do not substitute generated UI art for evidence of actual behavior.

Use the actual product in screenshots, not mockups that overstate capability. Chrome requires an icon and at least one screenshot; its listing guidance specifies the promo image and screenshot dimensions above. [Chrome listing requirements](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/) and [image guidance](https://developer.chrome.com/docs/webstore/images).

## 3. Product behavior

### Strike semantics

The setting is named **“Strikes allowed before block.”** It avoids ambiguity.

| Setting | Action |
|---:|---|
| 0 | Block on the first high-confidence qualifying quote-post |
| 1 | Block on the second |
| 3 | Block on the fourth |
| 5 | Block on the sixth |
| Custom 0–10 | Block after the selected number of prior strikes |

A strike belongs to one author and one distinct quote-post. Revisiting, scrolling, virtualized-card reuse, or a browser refresh must not generate another strike.

### Action modes and controls

| State | Behavior |
|---|---|
| Off | No scanning, no classification, no actions |
| Review-only | Show an explainable local flag; user can approve, dismiss, or allowlist |
| Blur & Review | Blur flagged quote-posts, put the Vaguepost King over them, and let the user reveal, allowlist, or explicitly block |
| Automatic block | Count only high-confidence flags; block only after all safety checks pass |
| Local AI downloading | Show progress; do not classify or block |
| Local AI unavailable | Keep the extension enabled for settings and local controls, but do not classify, add strikes, blur, or block until Chrome exposes the local model |

Blur & Review is the recommended default after onboarding. Automatic block starts disabled. Enabling automatic block requires an explicit acknowledgement that the extension will operate X's visible block controls on eligible accounts.

### Popup

- Master on/off switch.
- Action mode selector: Review-only, Blur & Review, or Automatic block.
- Strikes allowed: 0, 1, 3, 5, or custom.
- Conservative / Standard / Aggressive sensitivity.
- Local AI readiness: Available, Download needed, Downloading, or Unsupported.
- Session/account counters: candidates, flags, skipped-followed, skipped-uncertain, and blocks.
- Link to the activity log and options.

### Options page

- Strike threshold and sensitivity.
- Allowlist: add/remove account handles and reset their strikes.
- Activity log with reason, confidence band, timestamp, and outcome.
- Export local settings/log as JSON; delete all extension data.
- Clear explanation of local model availability and data handling.
- Blur behavior: blur every high-confidence flag or only accounts that reached the strike threshold.
- Mascot animation: still / reduced motion. Reduced motion is the default when the operating system requests it.
- Optional custom phrases are a later enhancement, not an automatic-block default.

### Blur & Review overlay

When the local classifier produces a high-confidence vaguepost result, Blur & Review replaces the candidate tweet's readable surface with a reversible overlay while preserving the timeline card's size and position. The underlying text and media receive a CSS blur and non-interactive veil; the overlay controls remain sharp and keyboard-accessible.

The overlay contains the transparent Vaguepost King PNG, a compact banner—“The Vaguepost King finds this lacking in context”—the explanation reason, the current strike count, and the following controls:

- **Reveal post:** removes the veil for this post in the current session. It does not erase its strike.
- **Not vague:** removes the veil, records a dismissal, and adds no strike.
- **Allow @handle:** removes the veil and prevents future classification/action for that account.
- **Block @handle:** an explicit user action; runs the same follow-state and author-identity safety checks as automatic mode.

Before the configured threshold, the button reads **Block now** to make clear that it is an intentional override. At/after the threshold it reads **Block @handle**. If the account is followed or follow status cannot be verified, no block control is shown; the overlay instead says “Block unavailable: this account is followed” or “Block unavailable: follow status could not be verified.”

Overlay rules:

- Never blur before local classification has a valid high-confidence result.
- Never place controls inside the blurred/filter element; keyboard focus and text must remain legible.
- Capture clicks on the veiled tweet so a user does not accidentally open replies; Reveal restores normal X interactions.
- Respect `prefers-reduced-motion`; no autoplay animation is required for the mascot.
- Do not obscure X's accessibility tree with an unlabeled image. The image is decorative; the status and every control have text.
- The overlay must disappear cleanly when X recycles/removes the timeline card or when VagueBlock turns off.

### In-page feedback

- A small, accessible toast after a completed block: account, reason, and “View activity log.”
- In review-only mode, an unobtrusive badge exposes the model's explanation and lets the user dismiss or allowlist.
- No permanent toolbar, no ad, and no hidden content collection.

## 4. Safety invariant: never block followed accounts

This invariant outranks detection confidence and the strike threshold.

Before a block, the action coordinator must:

1. Extract the candidate's handle from the current quote-post and bind it to the exact author element.
2. Check the user's local allowlist. An allowlisted handle is always skipped.
3. Use the current X UI's accessible follow-state evidence for that exact author/profile.
4. If evidence says **Following**, record `skipped_followed` and stop.
5. If evidence is absent, contradictory, stale, or attached to a different author, record `skipped_unverified_follow_state` and stop.
6. Only if evidence positively says the account is not followed may the extension continue.
7. Immediately before confirmation, re-check author identity and follow state. A mismatch cancels the action.

The implementation may reduce eligible blocks when X changes its UI. That is intentional: false negatives are acceptable; accidental blocks of followed accounts are not.

The test suite includes a dedicated followed account posting a deliberately qualifying quote-post. The required outcome is: no block menu click, no strike action in automatic mode, and a `skipped_followed` audit event.

## 5. Local AI detection

### Why local Gemini Nano

Vagueposting depends on whether the author's added text gives sufficient context without requiring the reader to open the quoted post. This is a semantic judgment that keyword matching alone cannot make reliably.

Chrome's Prompt API uses Gemini Nano locally. The model is downloaded separately when needed, but subsequent inference sends no content to Google or another provider. Current Chrome builds require the user's **Settings → System → On-device AI** setting to be enabled and may expose the `#prompt-api` flag; older builds may additionally expose `#optimization-guide-on-device-model` and `#prompt-api-for-gemini-nano`. The Prompt API is available to Chrome extensions on supported desktop Chrome builds. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api) and [built-in AI API status](https://developer.chrome.com/docs/ai/built-in-apis).

### Eligibility and fallback

The initial product requires current desktop Chrome and will test `LanguageModel.availability()` before exposing automatic mode.

| Availability | Product response |
|---|---|
| `available` | Enable local AI after the user enables the extension |
| `downloadable` | Offer a user-initiated “Download local AI” action with progress |
| `downloading` | Show progress; queue nothing |
| `unavailable` | Keep automatic mode unavailable; do not quietly send posts to a cloud model |

Chrome documents device requirements including supported desktop OS versions, 22 GB free profile-volume space, and GPU/CPU capacity requirements. This excludes some users, so supported-device messaging must be clear. [Chrome built-in AI requirements](https://developer.chrome.com/docs/ai/get-started).

### Candidate gating: prevent model work on every tweet

The model is local, but it still consumes CPU/GPU and battery. It must not assess every timeline item.

1. Process only quote-post cards with a recognizable author and quoted-post structure.
2. Reject obvious non-candidates locally: posts with substantial explanatory text, named subjects, links that provide context, or known non-vague structures.
3. Nominate short, context-dependent additions and common vague constructions for model assessment.
4. Deduplicate by post ID and cache `candidate → result` locally.
5. Use one FIFO queue, one active inference, a bounded queue, and idle scheduling. Drop low-priority work when the user scrolls rapidly.
6. Reuse a single low-temperature session while the classifier host remains alive.
7. Rate-limit classification per tab and per account; never retry a model error indefinitely.

The expected result is a small number of local classifications per timeline—not an API call for every post, and not any external call at all.

### Classifier contract

Inputs are plain text extracted from the candidate's added post and its quoted post. Do not include account profile data, private messages, cookies, or browser history.

System instruction, conceptually:

> Decide whether the author’s added text is a vague reaction to a quoted post: a typical reader must open the quote or replies to learn the relevant subject, event, or claim. Do not classify a terse but understandable reaction as vague. Return only the requested JSON.

Expected JSON:

```json
{
  "isVague": true,
  "confidence": 0.0,
  "reasonCode": "UNSPECIFIED_REFERENT",
  "explanation": "The added text does not identify what is being discussed.",
  "concreteSubjectPresent": false
}
```

Allowed reason codes: `UNSPECIFIED_REFERENT`, `IMPLIED_DRAMA`, `CONTEXT_FREE_QUESTION`, `AMBIGUOUS_REACTION`, `NOT_VAGUE`, and `UNPARSEABLE`.

Use constrained output validation. Invalid JSON, an unexpected reason code, a model error, or low confidence always yields **no strike and no block**.

### Decision policy

- Conservative: flag at ≥0.90 confidence.
- Standard: flag at ≥0.82 confidence.
- Aggressive: flag at ≥0.72 confidence.
- Automatic blocks require ≥0.90 regardless of the display sensitivity in version 1.
- A review-mode approval can add a strike; a dismissal never does.
- Model output is never treated as instruction. Quoted text is data, delimitated from the system instruction, and cannot alter the action policy.

Current Chrome exposes the Prompt API in extension service workers, so the classifier session lives in the MV3 service worker and shares its lifecycle with the action coordinator. The technical spike must verify `LanguageModel.availability()` in that service-worker context before release. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api).

## 6. Extension architecture

### Stack

- Manifest V3.
- The shipped 0.1.0 MVP uses dependency-free JavaScript and minimal CSS so it can be audited, loaded unpacked, and packaged without a build service.
- `chrome.storage.local` for all settings and logs.
- Node's built-in test runner for policy/fixture tests; controlled Chrome/X checks are documented in `docs/live-test.md`.
- No remote code, runtime downloads, analytics SDK, or dependency loaded from a CDN.

TypeScript, React, Vite, and Playwright remain reasonable post-MVP hardening options if the codebase grows, but they are not prerequisites for the current launch candidate.

### Components

| Component | Responsibility |
|---|---|
| Content script | Observe X timeline changes, extract cards, render small user feedback, and execute verified UI actions |
| Candidate extractor | Parse quote-post structure, author identity, text, post ID, and follow-state signals |
| Local gate | Cheap eligibility rules, deduplication request, and scheduler input |
| Classifier host | Maintain the local Prompt API session and return validated structured results |
| Service worker | Serialize records/actions, own settings, deduplicate across views, and coordinate messages |
| Block coordinator | Enforce the safety state machine and interact only with matching visible X controls |
| Blur overlay controller | Render, update, reveal, and remove the accessible Vaguepost King overlay without disturbing X's card lifecycle |
| Popup/options | Settings, onboarding, activity log, allowlist, and deletion/export |
| DOM adapter | Isolate X selectors and accessibility labels by UI variant; report selector-health failures |

### Minimal manifest permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["https://x.com/*"]
}
```

Use static content-script injection. Do not request `tabs`, `webRequest`, browsing history, downloads, notifications, or broad host access. Chrome's minimum-permission policy requires the narrowest permissions necessary. [Chrome User Data Policy](https://developer.chrome.com/docs/webstore/user_data).

### Storage model

```ts
type AccountRecord = {
  key: string;                 // immutable X ID if safely available; otherwise normalized handle
  latestHandle: string;
  strikes: number;
  status: "active" | "allowlisted" | "blocked";
  processedPostIds: string[];  // bounded LRU
  updatedAt: string;
};

type PresentationSettings = {
  actionMode: "review" | "blur" | "automatic";
  blurTrigger: "every_high_confidence_flag" | "threshold_reached";
  mascotMotion: "still" | "reduced";
};

type ActivityEvent = {
  id: string;
  createdAt: string;
  handle: string;
  postIdHash: string;
  outcome: "flagged" | "dismissed" | "strike_added" | "blocked" |
           "skipped_followed" | "skipped_unverified_follow_state" | "error";
  reasonCode?: string;
  confidenceBand?: "high" | "medium" | "low";
};
```

Do not persist raw tweet text by default. Bound logs and per-account post-ID history; make retention/deletion behavior visible in settings.

### Block action state machine

```text
candidate result → high confidence → threshold reached
       ↓
allowlist? ─ yes → skip
       ↓ no
follow-state positively NOT following? ─ no/unknown → skip and audit
       ↓ yes
bind author + post identity → open exact overflow menu
       ↓
find exact “Block @handle” item? ─ no → stop and audit
       ↓ yes
recheck identity + follow state → confirm block modal
       ↓
verify X reports blocked → persist event + show toast
```

All DOM queries must be scoped to the target article/modal. No global “first block button” selectors. Every transition has a timeout and a harmless failure path.

### Shipped repository layout

```text
manifest.json
background.js                 # service worker and action coordinator
content.js / content.css      # X adapter and Blur & Review overlay
classifier.js                  # service-worker Prompt API host
popup.{html,js} / options.{html,js}
shared/                       # policy, strike, storage, and DOM adapter helpers
assets/                       # icons and transparent mascot PNGs
tests/                        # unit and fixture tests
docs/                         # privacy, support, listing, and live-test docs
store-assets/                 # Web Store promo artwork, excluded from ZIP
```

## 7. Test and evaluation plan

### Evaluation dataset

Build a hand-labeled, sanitized dataset before enabling automatic mode:

- 250 clearly vague quote-posts.
- 250 terse-but-understandable quote-posts.
- 250 contextual quote-posts.
- 100 edge cases: sarcasm, text in images, multiple languages, threads, reposts, promotions, deleted quote cards, protected accounts, and malformed UI.

Record labels, confidence, model output, and expected outcome. Never use production user tweets outside the test account/approved fixture process.

### Required automated tests

| Layer | Required proof |
|---|---|
| Unit | Strike math, threshold boundaries, local gating, response validation, cache/LRU, and allowlist behavior |
| Safety | Followed/uncertain account always prevents a block; mismatched author/modal always cancels |
| Fixtures | Every supported X card/menu/modal adapter, including altered and missing selectors |
| Classifier | Precision/recall on the labeled dataset; injection-resistant output parsing |
| Integration | Loaded MV3 extension observes fixture timeline, queues once, presents review, and takes no unintended action |
| Overlay | Blur never leaks clickable underlying content; Reveal/Not vague/Allow work by mouse and keyboard; recycled cards remove the correct overlay |
| Manual live | Two owned X test accounts cover non-followed block and followed-account skip scenarios |
| Performance | No main-thread scroll jank; bounded queue; session reuse; overlays do not shift card layout; no external model traffic |
| Accessibility | Keyboard flow, focus restoration after modal action, labels, contrast, screen-reader announcement |

### Release gates

- 100% pass rate for the followed-account safety suite.
- 0 duplicate strikes across scroll/reload fixture tests.
- 0 orphaned, misbound, or inaccessible Blur & Review overlays across timeline-recycling tests.
- Automatic mode only acts on valid, high-confidence structured output.
- Unit, typecheck, lint, fixture, and browser tests pass in CI.
- Measured classifier precision ≥95% on the non-vague test set before automatic mode is enabled in the public release.
- Median local classification latency and hardware support rates are documented from beta.
- No unapproved external network request in a clean-profile run.

If the safety invariant fails, automatic mode is removed from the release candidate; do not ship a workaround.

## 8. Delivery phases

### Phase 0 — feasibility spike

1. Build a minimal MV3 extension that reports Prompt API availability from the service worker context used for inference.
2. Test supported Chrome versions and hardware states: available, downloadable, downloading, unavailable.
3. Verify local-only traffic using browser network inspection.
4. Inspect current X desktop DOM with two controlled accounts and document all needed selector/follow-state evidence.
5. Decide whether the classifier host remains viable across popup closure and service-worker restart.

**Exit criteria:** local model invocation succeeds on supported Chrome, no remote content traffic occurs, and the follow-state adapter has an evidence-backed safe path.

### Phase 1 — review-only MVP

1. Create the extension scaffold and Manifest V3 build/test pipeline.
2. Implement X card extraction, local candidate gate, local classifier queue, structured response validation, and cached results.
3. Implement the original mascot asset pipeline, accessible Blur & Review overlay, popup onboarding, local-AI readiness, activity log, and review decisions.
4. Create the dataset and tune the classifier prompt/thresholds.

**Exit criteria:** users can inspect, reveal, dismiss, allowlist, and reset local strikes. Blur & Review is accessible, reversible, and visually stable. No automatic block code is enabled.

### Phase 2 — safe automation

1. Implement the follow-status safeguard and block state machine.
2. Add DOM fixture coverage and controlled-account end-to-end validation.
3. Add selector-health fail-closed behavior and structured error audit entries.
4. Gate automatic mode behind a user acknowledgement.

**Exit criteria:** the followed account test has 100% passing runs across supported timeline variants; exact target matching and final UI verification work on controlled accounts.

### Phase 3 — beta

1. Obtain rights clearance for the supplied reference or commission the original mascot; produce icons, transparent PNGs, screenshots, promo tile, support page, privacy policy, and Store copy.
2. Publish a separate `VagueBlock BETA` item to trusted testers.
3. Monitor support reports, privacy feedback, classifier latency, no-action failures, and false positives—without collecting tweet text remotely.
4. Fix issues and run a full regression before production submission.

**Exit criteria:** release gates pass and beta feedback shows the product is understandable and safe.

### Phase 4 — public launch

1. Package the reviewed production ZIP with an incremented manifest version.
2. Complete Chrome Web Store Listing and Privacy tabs with exact, consistent disclosures.
3. Submit with deferred publishing enabled; publish after approval and final listing review.
4. Monitor support, Store review, X UI changes, and policy updates.

## 9. Store listing and compliance

### Draft listing copy

**Title:** VagueBlock

**Short description:** Let the Vaguepost King flag and blur vague quote-posts on X, track strikes, and block only accounts you do not follow.

**Long description:**

> VagueBlock helps you take control of context-free quote-posting on x.com. It evaluates likely vague quote-posts locally using Chrome’s on-device AI, keeps a strike count per account, and can blur a flagged post with the Vaguepost King while you decide what to do.
>
> You stay in control: start in Blur & Review mode, choose how many strikes to allow, reveal a post, mark it not vague, allowlist an account, or explicitly block it. VagueBlock will not block an account it can identify as followed; if it cannot verify follow status, it skips the action.
>
> VagueBlock is independent software and is not affiliated with X.

### Privacy disclosure

The product processes visible X timeline text and account handles locally to deliver its stated feature. It stores only user settings, strike counts, bounded processed-post identifiers, and local activity metadata. It does not transmit this information, use analytics, collect credentials, sell data, or use data for advertising.

Chrome requires accurate disclosures even when web content is processed and stored only locally. The privacy policy and Store Privacy tab must agree exactly with the extension's actual behavior. [Chrome User Data Policy](https://developer.chrome.com/docs/webstore/user_data) and [listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements).

### Submission checklist

- [ ] Register the Chrome Web Store developer account and enable two-step verification.
- [ ] Verify the store title, manifest name, version, description, support contact, and privacy URL.
- [ ] Upload icons, promo tile, and current product screenshots.
- [ ] Complete all privacy/data-use disclosures truthfully.
- [ ] Upload only production build output as a ZIP; inspect its contents first.
- [ ] Publish beta to trusted testers, then submit the production build for review.
- [ ] Use deferred publishing, inspect the live listing after approval, then announce.
- [ ] Save extension signing/ownership credentials securely; establish release ownership and incident contacts.

Chrome requires two-step verification for publishing/updating and requires Listing and Privacy tabs before publishing. [Chrome Web Store publishing documentation](https://developer.chrome.com/docs/webstore/using-api). Trusted-tester distribution remains subject to Store policies. [Chrome distribution documentation](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

### Support and operations

- Public support page: `site/support.html` covers installation, availability requirements, settings, false-positive recovery, data deletion, and reporting a broken X layout; publish it at a maintained HTTPS URL before submission.
- Private issue templates: X UI regression, detection false positive, follow-safety incident, and accessibility issue.
- Weekly selector-health review after launch; expedite a fail-closed update if X changes a block or follow control.
- Version releases use a changelog and repeat the full safety/fixture suite.
- Review Chrome policy changes at every release; Store policy evolves and accurate metadata is required. [Chrome quality guidance](https://developer.chrome.com/docs/webstore/program-policies/best-practices/).

## 10. Risks and decisions

| Risk | Mitigation | Launch decision |
|---|---|---|
| Local AI unavailable on some machines | Explain availability; no cloud fallback by default | Support only availability-positive devices for automatic mode |
| Local inference latency | Local gate, one-item queue, cache, idle scheduling | Skip stale work rather than degrading scroll |
| X changes selectors | Adapter layer, fixtures, health checks | Fail closed; do not guess/click |
| Model false positives | High automatic threshold, review-only default, evaluation dataset | Do not count/block on uncertain output |
| Accidentally blocking a followed account | Positive-not-followed preflight and final re-check | Absolute release blocker |
| Store privacy review | Minimal permissions, local-only behavior, truthful policy | No analytics or undisclosed collection |
| Prompt injection in post text | Strict delimiters, constrained JSON, output validation | Model output cannot override action rules |

## 11. Definition of launch-ready

VagueBlock is launch-ready only when it is a Manifest V3 extension with functioning local Gemini Nano classification on supported Chrome devices, a review-only default, verified strike accounting, a fully tested fail-closed followed-account safeguard, complete local data controls, polished accessible UI, validated icons/assets, passing CI and controlled-account tests, accurate privacy/support documentation, and an approved Chrome Web Store listing.
