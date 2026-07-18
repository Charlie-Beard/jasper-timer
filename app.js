/*
 * app.js — DOM wiring and the render loop. All schedule/phase decisions come
 * from schedule.js (window.JasperSchedule); this file only reads the clock,
 * applies the computed state to the page, and handles the preview overrides.
 */
(function () {
  "use strict";

  var S = window.JasperSchedule;

  // Optional ?phase= override for previewing any phase's artwork without
  // waiting for that time of day (e.g. ?phase=locked). Invisible in normal
  // use — the live clock stays real; only the bar/illustration/countdown are
  // forced. ?weekend=1 / ?weekend=0 forces the weekend (cinema) variant on or
  // off; otherwise the real day of week decides.
  var QS = new URLSearchParams(location.search);
  var OVERRIDE = QS.get("phase");
  var WEEKEND_OVERRIDE = QS.get("weekend");

  var fillEl      = document.getElementById("fill");
  var clockEl     = document.getElementById("clock");
  var remainingEl = document.getElementById("remaining");
  var untilEl     = document.getElementById("until");

  function render() {
   try {
    var now = new Date();
    // Seconds are folded in so the fill moves smoothly between ticks; phase
    // boundaries land on exactly the minute marks in SCHEDULE.
    var mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    var state = S.computeDisplayState(mins);

    // Preview override: force the requested phase's look, keep the real clock.
    if (OVERRIDE && S.PREVIEW.hasOwnProperty(OVERRIDE)) {
      state = S.PREVIEW[OVERRIDE];
    }

    // Weekend flag drives the extra cinema scene during the daytime phase.
    var day = now.getDay(); // 0 = Sunday, 6 = Saturday
    var isWeekend = (day === 0 || day === 6);
    if (WEEKEND_OVERRIDE === "1" || WEEKEND_OVERRIDE === "true")  isWeekend = true;
    if (WEEKEND_OVERRIDE === "0" || WEEKEND_OVERRIDE === "false") isWeekend = false;

    document.body.setAttribute("data-phase", state.phase);
    document.body.setAttribute("data-weekend", isWeekend ? "true" : "false");
    fillEl.style.width = (state.fillPct * 100) + "%";
    fillEl.style.backgroundColor = state.color;

    clockEl.textContent = S.formatClock(now.getHours(), now.getMinutes());
    remainingEl.textContent = state.cdText;
    untilEl.textContent = state.cdCaption;
   } catch (e) {
    // Safety net: this display must never freeze. Swallow any unexpected error
    // so the last good frame stays on screen and the next tick can self-heal.
   }
  }

  render();
  setInterval(render, 15000); // live refresh every 15s

  // iOS suspends timers while the web app is backgrounded (e.g. during
  // Netflix); re-render the instant it comes back so it never shows stale info.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) render();
  });
  window.addEventListener("pageshow", render);
  window.addEventListener("focus", render);

  // Extra guard against pinch zoom — Safari doesn't always honor the viewport meta.
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
})();
