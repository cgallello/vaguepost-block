# VagueBlock brand direction

## Reference and intent

The supplied “Vaguepost King” image is the creative north star: old-web-cartoon energy, a green-robed king with an orb staff, a retro terminal, large black outlines, and a funny degree of ceremonial seriousness. VagueBlock should feel like an absurd royal court appointed to demand context from a vaguepost.

This reference is not proof of production-use rights. Use the exact supplied artwork only with written permission from its rights holder. Otherwise, create an original transparent-background mascot that takes the broad direction without copying the supplied drawing's pose, face, crown, scene, wording, or composition.

## Character brief

**The Vaguepost King** is a friendly, irritated monarch of context. He wears a saturated green robe, small uneven crown, simple dark beard, and carries a staff topped by a green orb. He is a critic of behavior, not a bully of people.

Required poses:

1. `king-idle`: arms folded or staff at rest; used in settings and empty states.
2. `king-point`: gesturing toward the missing context; used on a Blur & Review overlay.
3. `king-block`: a firm but nonviolent “enough” gesture; used only after a completed block.

Do not show a real account handle, a recognizable X logo, speech from a real user, violence, humiliation, or profanity in the asset.

## Art direction

- Flat, bright green garment with black irregular linework.
- Simple, somewhat crude desktop-era cartoon detailing is a feature, not a defect.
- The staff orb is the primary neon-green accent; the crown and robe must remain readable at small scale.
- Deliver transparent PNGs with no baked-in text, card frame, screenshot, or white background.
- Keep the silhouette clean enough to read at approximately 96–160 CSS pixels tall.
- Use an original asset in the browser toolbar: crown/orb/speech gap, not a shrunken full-body character.

## Overlay composition

```text
┌────────────────── blurred quoted-post card ────────────────────┐
│  [transparent King, 96–160px]  The Vaguepost King finds this   │
│                                    lacking in context.          │
│  Reason: implied drama • Strike 2 of 3                          │
│  [Reveal post] [Not vague] [Allow @handle] [Block @handle]     │
└────────────────────────────────────────────────────────────────┘
```

On narrow cards, put the King above the text and make the buttons wrap to two rows. The visual must never cover the controls or leave them below the fold. If the account is followed/uncertain, replace the block control with an explanatory text status.

## Store visuals

1. The King hovering over a real Blur & Review card.
2. Strike threshold screen with crown/orb iconography.
3. A follow-safety screenshot: “Block unavailable: this account is followed.”
4. Activity log with simple court-record visual accents, not dense ornament.
5. Local-AI privacy screenshot: “Runs on your device. No tweet text sent away.”
