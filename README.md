# VagueBlock

Local-first Chrome extension planning repository.

VagueBlock identifies likely vague quote-posts in X's desktop timeline, keeps a per-account strike count, and either blocks accounts after the configured threshold or places a playful “Vaguepost King” review overlay on the post. It blocks only when it can positively verify that the user does not follow the account.

The product plan is in [PLAN.md](PLAN.md). The initial privacy-policy draft is in [docs/privacy-policy.md](docs/privacy-policy.md).

## Product promise

- Classification runs locally using Chrome's built-in Gemini Nano Prompt API when it is available.
- No tweet text, account data, or credentials leave the device in the standard product.
- The extension never intentionally blocks an account the user follows. If follow status is uncertain, it does nothing.
- It uses X's visible interface for the block action; it does not call private X APIs.
- The mascot is a packaged transparent PNG, not a remotely loaded image or tracking pixel.
- Chrome Web Store promotional artwork is staged under `store-assets/`; it is intentionally kept out of the runtime extension package.

## Status

Working MVP scaffold. The extension is loadable as an unpacked MV3 package, with local Gemini Nano classification when Chrome exposes the Prompt API, Blur & Review overlays, local strike storage, a fail-closed block coordinator, popup/options pages, tests, and a packaging script. Live X DOM validation still needs a logged-in controlled test account.

## Development

```sh
npm test
npm run check
npm run package
```

Load the repository directory (not the ZIP) from `chrome://extensions` with Developer mode enabled. The production ZIP is produced by `npm run package`.
