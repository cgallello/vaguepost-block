# VagueBlock support

VagueBlock is an independent Chrome extension for x.com. It does not use X's private APIs and is not affiliated with X.

## First run

1. Open VagueBlock from the Chrome toolbar.
2. Turn on **Enable VagueBlock**.
3. Keep **Blur & Review** selected while you tune the experience.
4. In Chrome **Settings → System**, turn on **On-device AI**. This per-user setting must be on before Chrome will download its local generative model.
5. Enable the current **Prompt API** flag at `chrome://flags/#prompt-api`; older Chrome builds may additionally expose `chrome://flags/#optimization-guide-on-device-model` and `chrome://flags/#prompt-api-for-gemini-nano`. Relaunch Chrome. Automatic classification remains disabled until a supported model is available. Chrome also requires a supported desktop OS, at least 22 GB free on the volume containing the Chrome profile, and either at least 16 GB RAM plus four CPU cores or a GPU with more than 4 GB VRAM. Check `chrome://on-device-internals` for the model's exact download/error state, then restart Chrome and retry **Prepare local AI**.
6. If the extension says **Prompt API not exposed**, Chrome is not making the built-in API available to the extension document. This is a Chrome configuration or support issue, not an X selector issue; relaunch Chrome after changing the setting and check `chrome://on-device-internals` again.
   On newer Chrome builds, **On-device Internals → Broker State** may list the `prompt_api` use case as **Not Supported** and show no text-model asset. That is a Chrome rollout or build-capability limitation; VagueBlock cannot bypass it and will not send post text to a cloud service.

## Actions

- **Reveal post** restores one flagged post for the current session.
- **Not vague** dismisses the flag without adding a strike.
- **Allow** prevents future classification/action for an account.
- **Block** uses the visible X block controls. It is hidden when the account is followed or when follow status cannot be verified.

## If the king does not appear

Check that the extension is enabled, the page is on `x.com`, the post is a quote-post, and local AI is available. Open the extension options to verify sensitivity and clear old records. X can change its page structure; VagueBlock is designed to fail safely rather than guess at a changed control.

## Report a problem

Before reporting, note the Chrome version, operating system, VagueBlock version, action mode, and whether the issue occurred in Review-only, Blur & Review, or Automatic block mode. Do not send private messages, cookies, or account credentials. Add the maintained support contact before publishing the Store listing.
