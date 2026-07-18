/*
 * Unit tests for the pure schedule logic in schedule.js.
 * Zero dependencies — run with:  node test/schedule.test.js
 * Exits non-zero on the first failure (CI runs this on every push).
 */
"use strict";

const assert = require("assert");
const {
  SCHEDULE,
  COLORS,
  PREVIEW,
  computeDisplayState,
  formatHM,
  formatClock,
  minutesToClockLabel
} = require("../schedule.js");

// Minutes-since-midnight helper so cases read as clock times.
const at = (h, m, s = 0) => h * 60 + m + s / 60;

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  ok  " + name);
}

// --- Phase boundaries (see requirements.md §2 for the schedule table) ------

test("midnight is RED with an empty bar", () => {
  const st = computeDisplayState(at(0, 0));
  assert.strictEqual(st.phase, "red");
  assert.strictEqual(st.fillPct, 0);
  assert.strictEqual(st.color, COLORS.red);
});

test("2:59 is still RED and still clamped to 0%", () => {
  const st = computeDisplayState(at(2, 59));
  assert.strictEqual(st.phase, "red");
  assert.strictEqual(st.fillPct, 0);
});

test("RED fill is proportional across 03:00-06:00", () => {
  assert.strictEqual(computeDisplayState(at(3, 0)).fillPct, 0);
  assert.strictEqual(computeDisplayState(at(4, 30)).fillPct, 0.5);
  assert.ok(computeDisplayState(at(5, 59)).fillPct < 1);
});

test("06:00 flips to YELLOW at 0%", () => {
  const st = computeDisplayState(at(6, 0));
  assert.strictEqual(st.phase, "yellow");
  assert.strictEqual(st.fillPct, 0);
  assert.strictEqual(st.color, COLORS.yellow);
});

test("YELLOW fill is proportional across 06:00-07:00", () => {
  assert.strictEqual(computeDisplayState(at(6, 30)).fillPct, 0.5);
});

test("07:00 flips to GREEN, full bar, no countdown (weekday)", () => {
  const st = computeDisplayState(at(7, 0));
  assert.strictEqual(st.phase, "green");
  assert.strictEqual(st.fillPct, 1);
  assert.strictEqual(st.cdText, "");
  assert.strictEqual(st.cdCaption, "");
});

test("07:30 flips to FAMILY (illustration), still green underneath", () => {
  const st = computeDisplayState(at(7, 30));
  assert.strictEqual(st.phase, "family");
  assert.strictEqual(st.color, COLORS.green);
  assert.strictEqual(st.cdText, "");
});

// --- Weekend schedule: GREEN and FAMILY shift 30 minutes later (Sat/Sun) ----

const WEEKEND = true;

test("weekend: 07:00 is still YELLOW, counting down to 7:30 AM", () => {
  const st = computeDisplayState(at(7, 0), WEEKEND);
  assert.strictEqual(st.phase, "yellow");
  assert.strictEqual(st.cdText, "30m");
  assert.strictEqual(st.cdCaption, "until 7:30 AM");
});

test("weekend: YELLOW fill is proportional across 06:00-07:30", () => {
  assert.strictEqual(computeDisplayState(at(6, 0), WEEKEND).fillPct, 0);
  assert.strictEqual(computeDisplayState(at(6, 45), WEEKEND).fillPct, 0.5);
  assert.ok(computeDisplayState(at(7, 29), WEEKEND).fillPct < 1);
});

test("weekend: 07:30 flips to GREEN, full bar, no countdown", () => {
  const st = computeDisplayState(at(7, 30), WEEKEND);
  assert.strictEqual(st.phase, "green");
  assert.strictEqual(st.fillPct, 1);
  assert.strictEqual(st.cdText, "");
  assert.strictEqual(st.cdCaption, "");
});

test("weekend: 08:00 flips to FAMILY", () => {
  assert.strictEqual(computeDisplayState(at(7, 59), WEEKEND).phase, "green");
  assert.strictEqual(computeDisplayState(at(8, 0), WEEKEND).phase, "family");
});

test("weekend: RED counts down to 7:30 AM", () => {
  const st = computeDisplayState(at(5, 48), WEEKEND);
  assert.strictEqual(st.phase, "red");
  assert.strictEqual(st.cdText, "1h 42m");
  assert.strictEqual(st.cdCaption, "until 7:30 AM");
});

test("weekend: countdown rounds up, never 0 while still running", () => {
  assert.strictEqual(computeDisplayState(at(7, 29, 30), WEEKEND).cdText, "1m");
});

test("weekend: afternoon/evening boundaries are unchanged", () => {
  assert.strictEqual(computeDisplayState(at(16, 14), WEEKEND).phase, "family");
  assert.strictEqual(computeDisplayState(at(16, 15), WEEKEND).phase, "blue");
  assert.strictEqual(computeDisplayState(at(17, 15), WEEKEND).phase, "locked");
});

test("16:14 is still FAMILY", () => {
  assert.strictEqual(computeDisplayState(at(16, 14)).phase, "family");
});

test("16:15 flips to BLUE with a full bar", () => {
  const st = computeDisplayState(at(16, 15));
  assert.strictEqual(st.phase, "blue");
  assert.strictEqual(st.fillPct, 1);
  assert.strictEqual(st.color, COLORS.blue);
});

test("BLUE drains linearly and hits ~0 just before 17:15", () => {
  assert.strictEqual(computeDisplayState(at(16, 45)).fillPct, 0.5);
  assert.ok(computeDisplayState(at(17, 14)).fillPct > 0);
});

test("17:15 flips to LOCKED: empty bar, 0m", () => {
  const st = computeDisplayState(at(17, 15));
  assert.strictEqual(st.phase, "locked");
  assert.strictEqual(st.fillPct, 0);
  assert.strictEqual(st.cdText, "0m");
  assert.strictEqual(st.cdCaption, "");
});

test("23:59 is still LOCKED", () => {
  assert.strictEqual(computeDisplayState(at(23, 59)).phase, "locked");
});

// --- Countdown text ---------------------------------------------------------

test("RED counts down to 7:00 AM in h/m form", () => {
  const st = computeDisplayState(at(5, 48));
  assert.strictEqual(st.cdText, "1h 12m");
  assert.strictEqual(st.cdCaption, "until 7:00 AM");
});

test("YELLOW counts down to 7:00 AM in minutes", () => {
  const st = computeDisplayState(at(6, 37));
  assert.strictEqual(st.cdText, "23m");
  assert.strictEqual(st.cdCaption, "until 7:00 AM");
});

test("countdown rounds up: never shows 0 while still running", () => {
  // 30 seconds before 07:00 must show 1m, not 0m
  assert.strictEqual(computeDisplayState(at(6, 59, 30)).cdText, "1m");
  // 30 seconds before 17:15 likewise
  assert.strictEqual(computeDisplayState(at(17, 14, 30)).cdText, "1m");
});

test("BLUE counts down to 5:15 PM in plain minutes", () => {
  const st = computeDisplayState(at(16, 45));
  assert.strictEqual(st.cdText, "30m");
  assert.strictEqual(st.cdCaption, "until 5:15 PM");
});

// --- Countdown captions derive from the schedule constants ------------------

test("captions match the boundary constants", () => {
  assert.strictEqual(
    computeDisplayState(at(5, 0)).cdCaption,
    "until " + minutesToClockLabel(SCHEDULE.GREEN_START)
  );
  assert.strictEqual(
    computeDisplayState(at(5, 0), WEEKEND).cdCaption,
    "until " + minutesToClockLabel(SCHEDULE.WEEKEND_GREEN_START)
  );
  assert.strictEqual(
    computeDisplayState(at(16, 30)).cdCaption,
    "until " + minutesToClockLabel(SCHEDULE.LOCK_TIME)
  );
});

// --- Helpers -----------------------------------------------------------------

test("formatHM", () => {
  assert.strictEqual(formatHM(0), "0m");
  assert.strictEqual(formatHM(59), "59m");
  assert.strictEqual(formatHM(60), "1h 0m");
  assert.strictEqual(formatHM(72), "1h 12m");
});

test("formatClock covers 12-hour edge cases", () => {
  assert.strictEqual(formatClock(0, 5), "12:05 AM");
  assert.strictEqual(formatClock(12, 0), "12:00 PM");
  assert.strictEqual(formatClock(7, 0), "7:00 AM");
  assert.strictEqual(formatClock(17, 15), "5:15 PM");
});

// --- Preview states ----------------------------------------------------------

test("PREVIEW covers exactly the six phases", () => {
  assert.deepStrictEqual(
    Object.keys(PREVIEW).sort(),
    ["blue", "family", "green", "locked", "red", "yellow"]
  );
  for (const [name, st] of Object.entries(PREVIEW)) {
    assert.strictEqual(st.phase, name);
    assert.ok(st.color, name + " has a color");
    assert.ok(st.fillPct >= 0 && st.fillPct <= 1, name + " fill in range");
  }
});

console.log("\nAll " + passed + " tests passed.");
