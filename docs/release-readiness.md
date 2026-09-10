# VagueBlock release readiness

Last verified: September 9, 2026

## Verified in this repository

- Manifest V3 package with Chrome 138+ baseline, narrow `x.com` host access, local storage, and offscreen Prompt API host.
- Blur & Review, Review-only, and acknowledged Automatic block modes.
- Per-account strike thresholds, duplicate suppression, dismissal, allowlist, local export/deletion, reduced-motion support, and separate followed/uncertain safety counters.
- Fail-closed author binding and follow-state checks before opening and immediately before confirming X's visible block control.
- Transparent King mascot PNGs, runtime icons, Store promo tile, and marquee artwork.
- 39 Node tests, dependency-free runtime lint, syntax checks, classifier evaluation-gate tests, and a headless Chrome fixture smoke test covering the overlay, understandable-post skip, followed-account skip, fake menu/dialog block flow, and audit events.
- Release package verified at `vagueblock-0.1.0.zip` with 25 runtime entries. The package is local-only and contains no tests, docs, site, or Store artwork.

Run the local verification set:

```sh
npm test
npm run lint
npm run check
npm run test:fixture
npm run release-check
```

## Required external launch gates

These cannot be honestly marked complete from a repository-only test run:

1. Chrome's on-device AI must report `available` or complete a model download on a supported desktop device. The inspected Chrome session currently reports `prompt_api` as **Not Supported**, with no text-model asset; the user must enable **Settings → System → On-device AI** and rerun the live check.
2. Run the controlled two-account X test in `docs/live-test.md`, including a non-followed block and a followed-account skip, on the actual supported Chrome/model combination.
3. Capture five real product screenshots after that live run. The Store promo and marquee are staged; fixture screenshots must not be used as Store evidence.
4. Replace the support/privacy contact placeholders with a maintained HTTPS support URL and developer contact.
5. Populate the hand-labeled sanitized evaluation set (250 vague, 250 understandable, 250 contextual, 100 edge cases) and pass `node eval/score.mjs eval/dataset.json eval/predictions.json --strict` before enabling public Automatic block.
6. Use an authenticated Chrome Web Store developer account with two-step verification to upload the reviewed ZIP, complete the Listing and Privacy tabs, run trusted beta distribution, and submit the production listing.

Until those gates pass, the extension intentionally remains a local release candidate and fails closed when Chrome cannot provide its model.
