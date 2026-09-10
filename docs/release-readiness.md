# VagueBlock release readiness

Last verified: September 9, 2026

## Verified in this repository

- Manifest V3 package with Chrome 138+ baseline, narrow `x.com` host access, local storage, and offscreen Prompt API host.
- Blur & Review, Review-only, and acknowledged Automatic block modes.
- Per-account strike thresholds, duplicate suppression, dismissal, allowlist, local export/deletion, reduced-motion support, and separate followed/uncertain safety counters.
- Fail-closed author binding and follow-state checks before opening and immediately before confirming X's visible block control.
- Transparent King mascot PNGs, runtime icons, Store promo tile, and marquee artwork.
- 43 Node tests, dependency-free runtime lint, syntax checks, classifier evaluation-gate tests, and a headless Chrome fixture smoke test covering the overlay, understandable-post skip, followed-account skip, fake menu/dialog block flow, and audit events.
- Release package verified at `vagueblock-0.1.0.zip` with 25 runtime entries. The package is local-only and contains no tests, docs, site, or Store artwork.

Run the local verification set:

```sh
npm test
npm run lint
npm run check
npm run test:fixture
npm run release-check
npm run release-audit
```

`release-audit` reports repository-ready checks and explicitly lists external gates. Use `npm run release-audit:strict` only when the support contact, full evaluation files, live screenshots, model check, controlled X run, and Store account are all complete.

## Required external launch gates

These cannot be honestly marked complete from a repository-only test run:

1. **Pass:** Chrome's on-device AI reports `available` on a supported desktop device. The September 9, 2026 check verified **Settings → AI in Chrome → On-device AI**, a downloaded model asset, and VagueBlock's **Prepare local AI** flow reaching **Local AI ready**. Evidence is recorded in [`docs/evidence/local-ai.json`](evidence/local-ai.json). Re-run this check on each supported Chrome release because Prompt API availability is browser-managed.
2. **Pending:** Run the controlled two-account X test in `docs/live-test.md`, including a non-followed block and a followed-account skip, on the actual supported Chrome/model combination.
3. **Pass:** Five real product screenshots are staged at 1280×800, alongside the Store promo and marquee. Fixture screenshots are not used as Store evidence.
4. **Pass:** Support and privacy pages use maintained HTTPS GitHub issue URLs.
5. **Pending:** Capture local-model predictions for the sanitized evaluation set (250 vague, 250 understandable, 250 contextual, 100 edge cases) and pass `node eval/score.mjs eval/dataset.json eval/predictions.json --strict` before enabling public Automatic block.
6. **Pending:** Use the authenticated Chrome Web Store developer account to upload the reviewed ZIP, complete the Listing and Privacy tabs, run trusted beta distribution, and submit the production listing.

Until those gates pass, the extension intentionally remains a local release candidate and fails closed when Chrome cannot provide its model.
