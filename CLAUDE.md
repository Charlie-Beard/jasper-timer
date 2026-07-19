# Jasper Timer — Maintainer Guide

A "wake time" indicator for an autistic child who wakes very early and cannot
yet tell the time. He checks this app on his iPad to see, **from color alone**,
whether it's okay to leave his room. It is **safety-relevant**: if it fails to
load, freezes, or shows the wrong phase, he may leave his room in the middle of
the night or sit waiting long past wake-up time. Treat every change with that
in mind.

Read `requirements.md` before making any behavioral change — it is the
authoritative spec (schedule table, visual rules, device setup). This file is
the code map and the working rules.

## File map

| File | Role |
|---|---|
| `index.html` | Markup only: iOS meta tags, the clock/bar/countdown elements, and three inline SVG scenes (`#family`, `#cinema`, `#bedtime`). No CSS or JS logic lives here. |
| `styles.css` | All styling. Phase visibility is driven purely by `data-phase` / `data-weekend` attributes on `<body>`. |
| `schedule.js` | **The single source of truth for behavior.** Schedule constants + pure functions (no DOM). `computeDisplayState(minutesSinceMidnight)` returns `{ phase, color, fillPct, cdText, cdCaption }`. Exports to `window.JasperSchedule` in the browser and via `module.exports` in Node. |
| `app.js` | DOM wiring only: reads the clock, calls `computeDisplayState`, applies the result to the page, handles `?phase=` / `?weekend=` preview overrides and iOS wake-from-background re-rendering. |
| `test/schedule.test.js` | Zero-dependency Node tests for `schedule.js`. |
| `requirements.md` | The spec. Keep it in sync with any behavior change. |
| `.github/workflows/deploy.yml` | Publishes the repo root to GitHub Pages on every push to `main`. |
| `.github/workflows/test.yml` | Runs the tests on every push and PR. |

## Common tasks

- **Change the schedule** (e.g. move wake-up time): edit the `SCHEDULE`
  constants at the top of `schedule.js`, update the table in
  `requirements.md` §2, update any test expectations, run the tests, push to
  `main`. Countdown captions ("until 7:15 AM") are derived from the constants
  automatically — do not hardcode times in strings.
- **Change artwork**: the scenes are inline SVGs in `index.html`; their
  show/hide rules are in `styles.css` under the `data-phase` selectors.
- **Add a phase**: extend `SCHEDULE`, add a branch in `computeDisplayState`,
  add a `PREVIEW` entry, add CSS `data-phase` rules, add tests, update
  `requirements.md`.

## Testing and preview

```
node test/schedule.test.js
```

No test framework, no npm install — plain Node `assert`. CI runs this on every
push; keep it green.

Visual check without waiting for the time of day: open the deployed site (or
the local file) with `?phase=red|yellow|green|family|blue|locked` and
optionally `?weekend=1|0`. The live clock stays real; only the visuals are
forced.

## Hard constraints — do not break these

1. **No build step, no bundler, no package manager.** GitHub Pages serves the
   repo root as-is. There is deliberately no `package.json`.
2. **No external network dependencies at runtime** — no CDNs, web fonts,
   remote images, or API calls. The iPad's Safari is locked to this one domain
   via Screen Time "Allowed Websites Only"; any external sub-resource risks
   being blocked. All assets are inline (SVGs, data-URI icon) or same-origin
   files in this repo.
3. **No words that instruct.** Color and illustration carry the meaning. The
   only text is the clock and the numeric countdown. Never add phrases like
   "you can come out now".
4. **No sound, no buttons, no settings UI, no persisted state.** Everything is
   a pure function of the device's local wall-clock time.
5. **The display must never freeze.** `render()` in `app.js` is wrapped in a
   try/catch on purpose so a bad frame self-heals on the next tick — keep that
   safety net, and keep `render()` cheap.
6. **Keep the JS conservative** (script tags, `var`-era-compatible patterns,
   no ES modules) — it runs on an iPad Safari that may not be current.

## Deployment

Push to `main` → the Pages workflow deploys automatically, live in about a
minute at https://charlie-beard.github.io/jasper-timer/. There is no staging
environment; use the `?phase=` preview parameters to verify visuals after
deploying, ideally before the phase in question occurs in real time.
