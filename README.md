# VagueBlock

Local-first Chrome extension planning repository.

VagueBlock identifies likely vague quote-posts in X's desktop timeline, keeps a per-account strike count, and either blocks accounts after the configured threshold or places a playful “Vaguepost King” review overlay on the post. It blocks only when it can positively verify that the user does not follow the account.

The product plan is in [PLAN.md](PLAN.md). The initial privacy-policy draft is in [docs/privacy-policy.md](docs/privacy-policy.md).
Current engineering evidence and external launch gates are tracked in [docs/release-readiness.md](docs/release-readiness.md).
Release history is in [CHANGELOG.md](CHANGELOG.md).

## Product promise

- Classification runs locally using Chrome's built-in Gemini Nano Prompt API when it is available; the extension passes explicit English text input/output descriptors and never falls back to a cloud model.
- No tweet text, account data, or credentials leave the device in the standard product.
- The extension never intentionally blocks an account the user follows. If follow status is uncertain, it does nothing.
- It uses X's visible interface for the block action; it does not call private X APIs.
- The mascot is a packaged transparent PNG, not a remotely loaded image or tracking pixel.
- Chrome Web Store promotional artwork is staged under `store-assets/`; it is intentionally kept out of the runtime extension package.

If Chrome reports local AI as unavailable, first turn on Chrome's **On-device AI** setting in **Settings → System**, then enable the current **Prompt API** flag at `chrome://flags/#prompt-api` and relaunch Chrome. On older Chrome builds that still expose them, also enable the on-device model and Gemini Nano flags at `chrome://flags/#optimization-guide-on-device-model` and `chrome://flags/#prompt-api-for-gemini-nano`. Check `chrome://on-device-internals` for model status. If VagueBlock says **Prompt API not exposed**, Chrome is not exposing the API to the extension document; relaunch Chrome after changing the setting. VagueBlock never falls back to a cloud classifier.

## Status

Working MVP. The extension is loadable as an unpacked MV3 package, with local Gemini Nano classification when Chrome exposes the Prompt API, bounded candidate/result queues, Blur & Review overlays, local strike storage, strike dismissal, a fail-closed block coordinator, isolated X DOM adapters with fixtures, popup/options pages, tests, and a version-aware packaging script. Live X DOM extraction has been verified; the controlled two-account block test, screenshots, public support/privacy URLs, and Store submission remain launch gates.

## Development

```sh
npm test
npm run check
npm run lint
npm run test:fixture
npm run eval:example
npm run package
```

Load the repository directory (not the ZIP) from `chrome://extensions` with Developer mode enabled. The production ZIP is produced by `npm run package`.
