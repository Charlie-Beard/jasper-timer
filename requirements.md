# Jasper Timer — Requirements

## 1. Purpose

A "wake time" indicator app for an autistic child who wakes very early and cannot yet
tell the time. He is content watching Netflix on his iPad in his room, but periodically
switches over to check this app to see whether it's time to come find his parents. The
app must make that answer obvious from color alone, at a glance, with no reading or
time-telling skill required.

This is a personal single-user app for one child, not a general product. Favor
simplicity over flexibility.

## 2. Core Behavior — Time Logic

The app has no persisted state and no daily "reset" step. Every phase is derived purely
from the device's current local wall-clock time, recomputed continuously. The same
schedule applies every day of the week — no weekday/weekend variation.

| Time of day             | Phase  | Bar fill                                   |
|--------------------------|--------|---------------------------------------------|
| 00:00 – 05:59            | RED    | Proportional fill across a 03:00→06:00 window, clamped to 0% before 03:00 |
| 06:00 – 06:59            | YELLOW | Proportional fill across the 06:00→07:00 window |
| 07:00 – 23:59            | GREEN  | Full (100%), stays this way for the rest of the day |

Notes:
- Anything before 06:00 — including the middle of the night (e.g. 2am) — is RED. There
  is no separate "night" state; before 03:00 is visually identical to the rest of RED,
  just with the bar empty (0%).
- GREEN is a final state once reached: the bar stays full and green continuously until
  it naturally becomes RED again after midnight.
- Recommended pseudocode:
  ```
  minutesSinceMidnight = now.hours * 60 + now.minutes
  if minutesSinceMidnight < 360:        // before 6:00am
      phase = RED
      fillPct = clamp((minutesSinceMidnight - 180) / (360 - 180), 0, 1)   // 3:00–6:00 window
  else if minutesSinceMidnight < 420:   // 6:00–7:00am
      phase = YELLOW
      fillPct = (minutesSinceMidnight - 360) / (420 - 360)                // 6:00–7:00 window
  else:                                  // 7:00am onward
      phase = GREEN
      fillPct = 1
  ```

## 3. Visual Design

- **Background:** cream / off-white, fixed regardless of phase. The background itself
  never changes color.
- **Progress bar:** the single focal element, centered on the screen. Its fill color
  changes with phase using bright, standard, fully-saturated "traffic light" colors
  (true red / yellow / green — not muted or pastel tones). Exact hex values are an
  implementation detail; use conventional, unambiguous traffic-light shades.
- **No decorative personalization** — no characters, themes, or imagery. Keep the
  screen clean and uncluttered.
- **No plain-language instructional text** (e.g. do NOT show phrases like "stay in your
  room" or "you can come out now"). Color is the only status signal.
- **Numeric display required, alongside the bar:**
  - The current time (assume 12-hour format with AM/PM unless told otherwise).
  - A neutral countdown readout of time remaining until 7:00 AM (e.g. "1h 12m" or "23
    minutes"), showing 0 / not shown once GREEN.
  - These are factual/numeric only — not instructional phrasing.
- **No sound of any kind.** Fully silent, visual-only feedback.
- **Layout:** primarily used in landscape (iPad propped on a stand), but must be
  responsive and remain legible in portrait too. Standard iPad (not mini/Pro-specific
  sizing needed).

## 4. Interaction & Runtime Behavior

- The app must **auto-update live** while it is open/foregrounded — recompute phase,
  bar fill, current time, and countdown on an interval (e.g. every 15–30 seconds) so it
  never shows stale info without requiring a manual reload. He will open it, glance at
  it, and switch back to Netflix repeatedly through the morning.
- No buttons, no navigation, no user interaction beyond opening the app. It's a
  read-only display.
- No settings screen and no in-app configuration. The 3:00 / 6:00 / 7:00 boundaries are
  hardcoded constants in the source. If they ever need to change, that will be done by
  editing and redeploying the app, not via an in-app control.

## 5. Technical Constraints

- **Must be a static, self-contained web app** — a single HTML file (with inline/bundled
  CSS and JS is fine) with **no external network dependencies** (no CDN scripts, no
  external web fonts, no external images/API calls at runtime). This matters because:
  - The iPad will have Safari locked to a single allowed domain via iOS Screen Time
    ("Allowed Websites Only"), and any external sub-resources risk being blocked.
  - It should work fully offline once loaded, since it must never fail to load or
    show a broken state — this is safety-relevant (its whole job is telling him when
    it's okay to leave his room).
- No backend/server logic required — everything is computed client-side from
  `new Date()` / the device's local time and time zone.
- Must include standard iOS "home screen web app" meta tags so that after being added
  to the Home Screen via Safari's "Add to Home Screen," it launches full-screen without
  Safari's address bar/chrome:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - an `apple-touch-icon` (simple, recognizable; specific icon artwork not mandated)
  - a `viewport` meta tag tuned to prevent pinch-zoom/accidental scaling
- Disable text selection and iOS callout/long-press menus on the display elements,
  since there's nothing on screen meant to be selected or copied.
- No analytics, accounts, logins, or data persistence of any kind.

## 6. Explicitly Out of Scope

- Sound/audio cues.
- Personalized theming (characters, favorite colors, images).
- Plain-language instructional labels per phase.
- Any settings/configuration UI.
- Weekday vs. weekend (or holiday) schedule variation.
- Any mechanism to keep the iPad screen awake/unlocked overnight — that is a device
  setting (iOS Auto-Lock), not an app concern, and is out of scope for the build.

## 7. Deployment Strategy — GitHub Pages

The app is deployed as a static site via GitHub Pages. No repo exists yet; it needs to
be created as part of setup. This shapes how the code must be structured (see also
Section 5), so it's not purely informational.

1. **Create the repository:** a new GitHub repo under `github.com/Charlie-Beard`
   (assumed name: `jasper-timer`, public — see assumptions below).
2. **Ship as a single static file at the repo root**, named `index.html` (CSS/JS may be
   inlined in it, or included as additional files in the repo — but with no external
   network calls at runtime, per Section 5). No build step, no bundler, no package
   manager output — GitHub Pages must be able to serve the repo as-is with zero
   configuration.
3. **Enable Pages:** in the repo, Settings → Pages → "Build and deployment" → Source:
   "Deploy from a branch" → Branch: `main`, folder: `/ (root)`.
4. **Resulting live URL:** `https://charlie-beard.github.io/jasper-timer/` — served
   over HTTPS automatically, which iOS "Add to Home Screen" relies on for correct
   full-screen behavior.
5. **Redeploying:** any future change (e.g. editing the hardcoded time constants from
   Section 2) is deployed by committing and pushing to `main`; GitHub Pages rebuilds
   automatically, typically live within about a minute. This is the mechanism referred
   to in Section 4 for changing the schedule later.
6. **Device-side setup**, once the Pages URL is live:
   - On the child's iPad: Settings → Screen Time → Content & Privacy Restrictions →
     Content Restrictions → Web Content → **Allowed Websites Only** → add
     `https://charlie-beard.github.io/jasper-timer/`. This restricts Safari to that one
     site while leaving other apps (Netflix, etc.) completely unaffected.
   - In Safari, open that URL once and use Share → **Add to Home Screen**, giving the
     child an app-like icon that launches full-screen.
   - No Guided Access / kiosk lock is used, since the child needs normal access to
     other apps (e.g. Netflix) throughout the morning.

## 8. Open Assumptions (flag if incorrect before implementation)

- Clock format defaults to 12-hour with AM/PM.
- Exact traffic-light hex values and icon artwork are left to implementer discretion
  within "bright, standard, fully-saturated" guidance.
- Countdown refresh interval of 15–30 seconds is a reasonable default (exact figure not
  critical).
- GitHub repo is assumed named `jasper-timer`, public, with default branch `main`. If
  named or configured differently, the Pages URL in Section 7 changes accordingly
  (public vs. private doesn't affect the live site's own accessibility — GitHub Pages
  URLs are publicly reachable either way on a free account — it only affects who can
  see the source code).
