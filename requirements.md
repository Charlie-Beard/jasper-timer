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
from the device's current local wall-clock time, recomputed continuously. The schedule
is the same every day except for one weekend difference: on Saturday and Sunday the
GREEN wake-up boundary (and the FAMILY boundary that follows it) shifts 30 minutes
later, so GREEN starts at 07:30 instead of 07:00. Weekends also add a visual
difference: the daytime FAMILY scene gains a second "trip to the cinema" illustration
(see the note below).

The boundaries below are hardcoded constants in the `SCHEDULE` object at the top of
`schedule.js` (`RED_FILL_START`, `YELLOW_START`, `GREEN_START`, `FAMILY_START`,
`WEEKEND_GREEN_START`, `WEEKEND_FAMILY_START`, `DRAIN_START`, `LOCK_TIME`). Changing
the schedule means editing those and redeploying (Section 7).

Weekdays (Mon–Fri):

| Time of day     | Phase  | What's shown                                                        |
|-----------------|--------|---------------------------------------------------------------------|
| 00:00 – 05:59   | RED    | Red bar, proportional fill across 03:00→06:00, clamped to 0% before 03:00 |
| 06:00 – 06:59   | YELLOW | Yellow bar, proportional fill across the 06:00→07:00 window          |
| 07:00 – 07:29   | GREEN  | Full green bar — the "you can come out" signal                       |
| 07:30 – 16:14   | FAMILY | Green state continues, shown as a daytime family illustration (bar hidden) |
| 16:15 – 17:14   | BLUE   | Blue "wind-down" bar draining from full at 16:15 to empty at 17:15   |
| 17:15 – 23:59   | LOCKED | Bedtime illustration (sleeping boy) on a calm twilight background    |

Weekends (Sat–Sun) — GREEN/FAMILY shift 30 minutes later; everything else is identical:

| Time of day     | Phase  | What's shown                                                        |
|-----------------|--------|---------------------------------------------------------------------|
| 06:00 – 07:29   | YELLOW | Yellow bar, proportional fill across the 06:00→07:30 window          |
| 07:30 – 07:59   | GREEN  | Full green bar — the "you can come out" signal                       |
| 08:00 – 16:14   | FAMILY | Family illustration plus the weekend cinema scene (bar hidden)       |

Notes:
- Anything before 06:00 — including the middle of the night (e.g. 2am) — is RED. There
  is no separate "night" state; before 03:00 is visually identical to the rest of RED,
  just with the bar empty (0%).
- GREEN/FAMILY is the "okay to leave your room" state for the day. Thirty minutes into
  GREEN (07:30 weekdays, 08:00 weekends) the full green bar is swapped for the calm
  daytime family illustration; the meaning is unchanged, it's just gentler to look at
  for the many hours it's shown.
- BLUE is a visual wind-down toward the evening: a full blue bar appears at 16:15 and
  drains to empty by 17:15, with a factual "Xm until 5:15 PM" countdown.
- LOCKED corresponds to the device's own iOS Screen Time lock taking over at 17:15 (the
  app cannot lock the device itself — see Section 6). It shows a sleeping-boy bedtime
  scene until the clock rolls past midnight and the cycle returns to RED.
- Countdown boundaries: RED/YELLOW count down to GREEN's start (07:00 on weekdays,
  07:30 on weekends, with the "until …" caption matching); BLUE counts down to 17:15.
  No countdown is shown during GREEN, FAMILY, or LOCKED.
- **Weekend cinema scene:** on Saturday and Sunday (device local day of week), the FAMILY
  phase shows the usual family illustration *plus* a second flat-SVG scene of the blonde
  boy heading to the cinema (popcorn in hand), stacked below it. On weekdays only the
  family scene shows.

A `?phase=` query parameter (e.g. `.../jasper-timer/?phase=locked`) forces any phase's
artwork for preview/testing, while the live clock stays real. It has no effect on normal
use and exists only so the schedule's visuals can be checked without waiting for that
time of day. Valid values: `red`, `yellow`, `green`, `family`, `blue`, `locked`. A
companion `?weekend=1` / `?weekend=0` parameter forces the weekend variant (the
30-minute-later morning schedule and the cinema scene) on or off for preview
(e.g. `.../jasper-timer/?phase=family&weekend=1`).

## 3. Visual Design

- **Background:** cream / off-white for the daytime phases (RED through BLUE), fixed and
  not tied to fill color. The LOCKED bedtime phase shifts to a calm twilight-lavender
  background to reinforce the wind-down for the evening.
- **Progress bar:** the focal element for the timed phases (RED, YELLOW, GREEN, BLUE),
  centered on the screen. Its fill color changes with phase using bright, standard,
  fully-saturated "traffic light" colors (true red / yellow / green, plus a blue
  wind-down — not muted or pastel tones). Exact hex values are an implementation detail.
- **Phase illustrations:** flat, calming inline-SVG scenes replace the bar for the long
  stretches where it would otherwise sit static — a daytime family scene during FAMILY
  (07:30–16:15) and a sleeping-boy bedtime scene during LOCKED (17:15–midnight). On
  weekends the FAMILY phase adds a second scene of the blonde boy going to the cinema,
  stacked below the family scene. These are deliberate, gentle visuals; they carry no
  words and don't change the color-based meaning. (This intentionally supersedes the
  original "no imagery" guidance — the illustrations proved calmer to look at than a
  static bar for hours.)
- **No plain-language instructional text** (e.g. do NOT show phrases like "stay in your
  room" or "you can come out now"). Color / scene is the status signal, never words.
- **Numeric display required, alongside the bar:**
  - The current time (assume 12-hour format with AM/PM unless told otherwise).
  - A neutral countdown readout of time remaining until GREEN starts (7:00 AM on
    weekdays, 7:30 AM on weekends; e.g. "1h 12m" or "23 minutes"), showing 0 / not
    shown once GREEN.
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
- No settings screen and no in-app configuration. The schedule boundaries (3:00 / 6:00
  and the 7:00 weekday / 7:30 weekend wake-up) are hardcoded constants in the source.
  If they ever need to change, that will be done by editing and redeploying the app,
  not via an in-app control.

## 5. Technical Constraints

- **Must be a static, self-contained web app** — plain HTML/CSS/JS files served from the
  repo itself (inline or as same-origin files; currently `index.html`, `styles.css`,
  `schedule.js`, `app.js`) with **no external network dependencies** (no CDN scripts, no
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
- Plain-language instructional labels per phase (color and the calming phase
  illustrations carry the meaning — never words).
- Any settings/configuration UI.
- Holiday variation in the schedule — holidays are not distinguished from ordinary
  days. (Weekends *do* differ: the GREEN/FAMILY morning boundaries shift 30 minutes
  later and the daytime illustration adds the cinema scene; see Sections 2 and 3.
  Nothing beyond that single weekday/weekend split is supported.)
- Any mechanism to keep the iPad screen awake/unlocked overnight — that is a device
  setting (iOS Auto-Lock), not an app concern, and is out of scope for the build.

## 7. Deployment Strategy — GitHub Pages

The app is deployed as a static site via GitHub Pages. No repo exists yet; it needs to
be created as part of setup. This shapes how the code must be structured (see also
Section 5), so it's not purely informational.

1. **Create the repository:** a new GitHub repo under `github.com/Charlie-Beard`
   (assumed name: `jasper-timer`, public — see assumptions below).
2. **Ship as static files at the repo root**: `index.html` (markup + inline SVG scenes)
   plus same-origin `styles.css`, `schedule.js` (schedule constants and pure phase
   logic), and `app.js` (DOM wiring) — with no external network calls at runtime, per
   Section 5. No build step, no bundler, no package manager output — GitHub Pages must
   be able to serve the repo as-is with zero configuration.
3. **Enable Pages via GitHub Actions:** in the repo, Settings → Pages → "Build and
   deployment" → Source: **"GitHub Actions"**. Deployment is driven by the workflow at
   `.github/workflows/deploy.yml` (official `actions/deploy-pages`), which publishes the
   repo root on every push to `main`. Its `concurrency: cancel-in-progress` setting means
   a superseded build is cancelled rather than left queued — this replaced the earlier
   "Deploy from a branch" auto-build, which once sat stuck in a queued state and failed
   to publish.
4. **Resulting live URL:** `https://charlie-beard.github.io/jasper-timer/` — served
   over HTTPS automatically, which iOS "Add to Home Screen" relies on for correct
   full-screen behavior.
5. **Redeploying:** any future change (e.g. editing the hardcoded time constants from
   Section 2) is deployed by committing and pushing to `main`; the Actions workflow
   rebuilds automatically, typically live within about a minute. This is the mechanism
   referred to in Section 4 for changing the schedule later.
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
