# VagueBlock live verification checklist

This checklist requires an unlocked desktop, Chrome, and two owned X test accounts. Do not use a production account for the first run.

For UI-only smoke testing when Chrome's local model is unavailable, open `tests/fixture.html` directly in Chrome. It loads the real content script against a synthetic quote-post and a fake classifier/runtime; it does not call X, create strikes in extension storage, or exercise the real model. Treat it as a development fixture, never as evidence of model accuracy or block safety.

The same fixture can be checked headlessly with `npm run test:fixture` (set `VGB_CHROME_BIN` if Chrome is not installed in the default location). This verifies that the real content script renders the King overlay for the vague fixture, leaves the understandable and followed fixtures untouched, and completes a fake X menu/dialog block flow without ever blocking the followed fixture.

## Load the build

1. Run `npm run package` or use the repository directory.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the repository directory.
5. In Chrome **Settings → AI in Chrome**, turn on **On-device AI**. Some Chrome builds expose a **Prompt API** flag at `chrome://flags/#prompt-api`; enable it when present. On older Chrome builds that still expose them, also enable `chrome://flags/#optimization-guide-on-device-model` and `chrome://flags/#prompt-api-for-gemini-nano`. Relaunch Chrome, then open the VagueBlock popup and choose **Prepare local AI**. Record the Chrome version and the availability result. If it reports unavailable after the applicable setting and flags are enabled, inspect `chrome://on-device-internals` → **Model Status** and record the error; do not treat the extension as classifier-tested until `LanguageModel.availability()` returns `available` or a download completes.

## Test account setup

- Account A: the account signed into Chrome; do not follow Account B.
- Account B: a separate owned test account that Account A follows.
- Each account publishes a clearly synthetic quote-post containing a short context-free reaction, then a concrete contextual reaction.

Use text such as “Can I say something without everyone getting mad?” only on the controlled test account. Delete or unpublish test posts afterward through the normal X UI.

## Review-only

1. Enable the extension and choose Review-only.
2. Confirm the qualifying quote-post receives a non-blurring King flag.
3. Confirm the concrete quote-post does not receive a flag.
4. Confirm **Not vague**, **Allow**, and **Reveal post** work by mouse and keyboard.

## Blur & Review

1. Choose Blur & Review and set “every high-confidence flag.”
2. Confirm the qualifying post is blurred without moving the card or hiding the overlay controls.
3. Confirm the King PNG has no background and the text alternative is present to assistive technology.
4. Confirm Reveal restores normal X interactions.
5. On Account B's post, confirm the block control is absent and the overlay says the account is followed.

## Strike thresholds and blocking

1. Set threshold to `0` and use an Account A qualifying post. Confirm the overlay offers **Block now**.
2. Click it and confirm the action opens the matching X overflow menu, chooses the matching handle, confirms the dialog, and logs `blocked` only after X reports the blocked state.
3. Repeat with threshold `1` and verify the first qualifying post increments to one without automatic blocking, while the second reaches the block action.
4. Re-render/revisit a post and verify its strike does not increment twice.
5. Change follow status or make the follow state ambiguous before confirmation; verify the extension cancels and records a safe skip.

## Evidence to capture

- Chrome version and OS.
- Screenshot of each mode.
- Local activity log export after the run.
- Console/runtime error output if a selector is missing.
- Whether local AI was `available`, `downloadable`, `downloading`, or `unavailable`.

After the run, save a redacted evidence record at `docs/evidence/live-safety.json`. It must contain the Chrome version and boolean results for `reviewOverlayVerified`, `nonFollowedBlockVerified`, `followedSkipVerified`, `cleanupComplete`, and `networkFallback`. Use labels such as Account A and Account B only; never store handles, post text, passwords, cookies, or screenshots containing private data in this JSON file. The release audit accepts the safety gate only when all five booleans are true and `networkFallback` is false.

Do not include passwords, cookies, private messages, or real users' post text in an issue report.
