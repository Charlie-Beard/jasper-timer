/*
 * schedule.js — schedule constants and pure phase logic. No DOM access here;
 * everything in this file is a plain function of "minutes since midnight" so
 * it can be unit-tested in Node (see test/schedule.test.js). DOM wiring lives
 * in app.js.
 */
(function (root) {
  "use strict";

  // Schedule boundaries in minutes since midnight. Hardcoded by design —
  // change them by editing here and pushing to main (see requirements.md §2).
  var SCHEDULE = {
    RED_FILL_START: 3 * 60,       // 03:00 — bar begins filling (clamped to 0% before)
    YELLOW_START:   6 * 60,       // 06:00 — RED becomes YELLOW
    GREEN_START:    7 * 60,       // 07:00 — YELLOW becomes GREEN (weekdays)
    FAMILY_START:   7 * 60 + 30,  // 07:30 — bar is replaced by the family illustration (weekdays)
    // Sat/Sun sleep in: GREEN and FAMILY shift 30 minutes later. The other
    // boundaries are the same every day.
    WEEKEND_GREEN_START:  7 * 60 + 30, // 07:30 — YELLOW becomes GREEN (Sat/Sun)
    WEEKEND_FAMILY_START: 8 * 60,      // 08:00 — family illustration (Sat/Sun)
    DRAIN_START:    16 * 60 + 15, // 16:15 — full BLUE bar appears and starts draining
    LOCK_TIME:      17 * 60 + 15  // 17:15 — bar empty; device Screen Time lock takes over
  };

  // Bright, fully-saturated signal colors
  var COLORS = { red: "#FF0000", yellow: "#FFCC00", green: "#00CC00", blue: "#0080FF" };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // "1h 12m" above an hour, "23m" below; callers round up so it never shows 0
  // while a countdown is still running.
  function formatHM(minsLeft) {
    var hLeft = Math.floor(minsLeft / 60);
    var mLeft = minsLeft % 60;
    return hLeft > 0 ? hLeft + "h " + mLeft + "m" : mLeft + "m";
  }

  // 12-hour clock with AM/PM, e.g. formatClock(7, 5) -> "7:05 AM"
  function formatClock(hours, minutes) {
    var h12 = hours % 12 === 0 ? 12 : hours % 12;
    return h12 + ":" + (minutes < 10 ? "0" : "") + minutes + " " + (hours < 12 ? "AM" : "PM");
  }

  // Clock label for a schedule boundary given in minutes since midnight,
  // e.g. minutesToClockLabel(SCHEDULE.GREEN_START) -> "7:00 AM". Countdown
  // captions are derived from the constants so they can never go stale.
  function minutesToClockLabel(mins) {
    return formatClock(Math.floor(mins / 60), mins % 60);
  }

  var GREEN_CAPTION         = "until " + minutesToClockLabel(SCHEDULE.GREEN_START);
  var WEEKEND_GREEN_CAPTION = "until " + minutesToClockLabel(SCHEDULE.WEEKEND_GREEN_START);
  var LOCK_CAPTION          = "until " + minutesToClockLabel(SCHEDULE.LOCK_TIME);

  /*
   * The single source of truth for what the screen shows. Takes minutes since
   * midnight (fractional — seconds are folded in by the caller so the fill
   * moves smoothly between ticks) plus an isWeekend flag (Sat/Sun wake-up is
   * 30 minutes later) and returns:
   *   { phase, color, fillPct, cdText, cdCaption }
   * Phase boundaries land exactly on the minute marks in SCHEDULE.
   */
  function computeDisplayState(mins, isWeekend) {
    var s = SCHEDULE;
    var greenStart  = isWeekend ? s.WEEKEND_GREEN_START : s.GREEN_START;
    var familyStart = isWeekend ? s.WEEKEND_FAMILY_START : s.FAMILY_START;
    var greenCaption = isWeekend ? WEEKEND_GREEN_CAPTION : GREEN_CAPTION;

    if (mins < s.YELLOW_START) {
      return {
        phase: "red",
        color: COLORS.red,
        fillPct: clamp((mins - s.RED_FILL_START) / (s.YELLOW_START - s.RED_FILL_START), 0, 1),
        cdText: formatHM(Math.ceil(greenStart - mins)),
        cdCaption: greenCaption
      };
    }
    if (mins < greenStart) {
      return {
        phase: "yellow",
        color: COLORS.yellow,
        fillPct: (mins - s.YELLOW_START) / (greenStart - s.YELLOW_START),
        cdText: formatHM(Math.ceil(greenStart - mins)),
        cdCaption: greenCaption
      };
    }
    if (mins < familyStart) {
      return { phase: "green", color: COLORS.green, fillPct: 1, cdText: "", cdCaption: "" };
    }
    if (mins < s.DRAIN_START) {
      // Bar is hidden during FAMILY; color/fill keep its state sane underneath.
      return { phase: "family", color: COLORS.green, fillPct: 1, cdText: "", cdCaption: "" };
    }
    if (mins < s.LOCK_TIME) {
      // Blue bar drains from full at DRAIN_START to empty at LOCK_TIME
      return {
        phase: "blue",
        color: COLORS.blue,
        fillPct: 1 - (mins - s.DRAIN_START) / (s.LOCK_TIME - s.DRAIN_START),
        cdText: Math.ceil(s.LOCK_TIME - mins) + "m", // 60m … 1m
        cdCaption: LOCK_CAPTION
      };
    }
    // After the Screen Time lock: drained bar stays for the evening
    return { phase: "locked", color: COLORS.blue, fillPct: 0, cdText: "0m", cdCaption: "" };
  }

  // Canned states for the ?phase= preview override (see app.js). Keyed by
  // phase name; also acts as the list of valid override values.
  var PREVIEW = {
    red:    { phase: "red",    color: COLORS.red,    fillPct: 0.5, cdText: "1h 30m", cdCaption: GREEN_CAPTION },
    yellow: { phase: "yellow", color: COLORS.yellow, fillPct: 0.5, cdText: "30m",    cdCaption: GREEN_CAPTION },
    green:  { phase: "green",  color: COLORS.green,  fillPct: 1,   cdText: "",       cdCaption: "" },
    family: { phase: "family", color: COLORS.green,  fillPct: 1,   cdText: "",       cdCaption: "" },
    blue:   { phase: "blue",   color: COLORS.blue,   fillPct: 0.5, cdText: "30m",    cdCaption: LOCK_CAPTION },
    locked: { phase: "locked", color: COLORS.blue,   fillPct: 0,   cdText: "0m",     cdCaption: "" }
  };

  var api = {
    SCHEDULE: SCHEDULE,
    COLORS: COLORS,
    PREVIEW: PREVIEW,
    clamp: clamp,
    formatHM: formatHM,
    formatClock: formatClock,
    minutesToClockLabel: minutesToClockLabel,
    computeDisplayState: computeDisplayState
  };

  // Browser: attach to window for app.js. Node: export for the test suite.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.JasperSchedule = api;
  }
})(this);
