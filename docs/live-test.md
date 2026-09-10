# VagueBlock live verification checklist

This checklist requires an unlocked desktop, Chrome, and two owned X test accounts. Do not use a production account for the first run.

## Load the build

1. Run `npm run package` or use the repository directory.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the repository directory.
5. Enable both `chrome://flags/#optimization-guide-on-device-model` and `chrome://flags/#prompt-api-for-gemini-nano`, relaunch Chrome, then open the VagueBlock popup and choose **Prepare local AI**. Record the Chrome version and the availability result. If it reports unavailable after both flags are enabled, inspect `chrome://on-device-internals` → **Model Status** and record the error; do not treat the extension as classifier-tested until `LanguageModel.availability()` returns `available` or a download completes.

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

Do not include passwords, cookies, private messages, or real users' post text in an issue report.
