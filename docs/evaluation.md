# VagueBlock classifier evaluation

The release gate requires a hand-labeled, sanitized dataset with at least 250 vague examples, 250 terse-but-understandable examples, 250 contextual examples, and 100 edge cases. Automatic mode is not a precision claim until that dataset exists and the measured precision is at least 95%.

Each dataset row has an opaque `id`, one of `vague`, `understandable`, `contextual`, or `edge`, and sanitized `added` and `quote` text. Keep real user posts, handles, URLs, private messages, and account identifiers out of the repository.

Score captured local-model results with:

```sh
npm run eval:example
node eval/score.mjs eval/dataset.json eval/predictions.json --strict
```

The example data is intentionally too small for release eligibility. `--strict` must fail until the required coverage and precision gates are met.

The repository's sanitized benchmark is generated from author-labeled fictional templates with `node tools/generate-eval-data.mjs`. It contains no real handles, URLs, private messages, or production posts. Generate it only when the source template changes, then capture predictions from the installed extension's local Prompt API; do not hand-edit predictions to match labels.
