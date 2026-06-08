"use strict";
(() => {
  if (!window.__autoScrollExtensionInitialized) {
    let getRuntimeState = function() {
      if (scrollTimer !== null) {
        return "running";
      }
      if (isPaused) {
        return "paused";
      }
      return "idle";
    }, reportBadgeState = function() {
      void chrome.runtime.sendMessage({
        type: "badge-status",
        state: getRuntimeState(),
        speed: scrollStep
      }).catch(() => {
      });
    }, getMinScrollStep = function() {
      return slowModeEnabled ? SLOW_MODE_MIN_SCROLL_STEP : NORMAL_MIN_SCROLL_STEP;
    }, normalizeScrollStep = function(value) {
      const clamped = Math.min(MAX_SCROLL_STEP, Math.max(getMinScrollStep(), value));
      if (!slowModeEnabled) {
        return Math.round(clamped);
      }
      return Math.round(clamped * 10) / 10;
    }, setScrollSpeed = function(speed) {
      if (typeof speed !== "number" || !Number.isFinite(speed)) {
        return;
      }
      scrollStep = normalizeScrollStep(speed);
      if (scrollTimer !== null) {
        reportBadgeState();
      }
    }, setSlowModeSetting = function(enabled) {
      if (typeof enabled !== "boolean") {
        return;
      }
      slowModeEnabled = enabled;
      scrollStep = normalizeScrollStep(scrollStep);
      if (scrollTimer !== null) {
        reportBadgeState();
      }
    }, setScrollDirection = function(direction) {
      if (direction !== "up" && direction !== "left" && direction !== "down" && direction !== "right") {
        return;
      }
      scrollDirection = direction;
    }, setLoopSetting = function(loop) {
      if (typeof loop === "boolean") {
        loopAtEnd = loop;
      }
    }, clampLineDelay = function(delay) {
      return Math.min(1200, Math.max(60, Math.round(delay / 20) * 20));
    }, setJumpScrollSetting = function(enabled) {
      if (typeof enabled !== "boolean") {
        return;
      }
      if (jumpScrollEnabled === enabled) {
        return;
      }
      jumpScrollEnabled = enabled;
      if (scrollTimer !== null) {
        restartScrollTimer();
      }
    }, setLineDelay = function(delay) {
      if (typeof delay !== "number" || !Number.isFinite(delay)) {
        return;
      }
      const nextDelay = clampLineDelay(delay);
      if (lineDelayMs === nextDelay) {
        return;
      }
      lineDelayMs = nextDelay;
      if (scrollTimer !== null && jumpScrollEnabled) {
        restartScrollTimer();
      }
    }, resetToStart = function() {
      if (scrollDirection === "up") {
        const maxVerticalScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(window.scrollX, maxVerticalScroll);
      } else if (scrollDirection === "left") {
        window.scrollTo(window.scrollX + window.innerWidth, window.scrollY);
      } else if (scrollDirection === "right") {
        window.scrollTo(0, window.scrollY);
      } else {
        window.scrollTo(window.scrollX, 0);
      }
    }, isAtPageBottom = function() {
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      return scrollBottom >= pageHeight - 2;
    }, isAtPageTop = function() {
      return window.scrollY <= 0;
    }, isAtHorizontalStart = function() {
      return window.scrollX <= 0;
    }, isAtHorizontalEnd = function() {
      const scrollRight = window.scrollX + window.innerWidth;
      const pageWidth = document.documentElement.scrollWidth;
      return scrollRight >= pageWidth - 2;
    }, isAtScrollBoundary = function() {
      if (scrollDirection === "up") {
        return isAtPageTop();
      }
      if (scrollDirection === "left") {
        return isAtHorizontalStart();
      }
      if (scrollDirection === "right") {
        return isAtHorizontalEnd();
      }
      return isAtPageBottom();
    }, getScrollDelta = function() {
      if (scrollDirection === "up") {
        return { x: 0, y: -scrollStep };
      }
      if (scrollDirection === "left") {
        return { x: -scrollStep, y: 0 };
      }
      if (scrollDirection === "right") {
        return { x: scrollStep, y: 0 };
      }
      return { x: 0, y: scrollStep };
    }, scrollByDistance = function(distance) {
      if (scrollDirection === "up") {
        window.scrollBy(0, -distance);
        return;
      }
      if (scrollDirection === "left") {
        window.scrollBy(-distance, 0);
        return;
      }
      if (scrollDirection === "right") {
        window.scrollBy(distance, 0);
        return;
      }
      window.scrollBy(0, distance);
    }, getJumpDistance = function() {
      const computedLineHeight = Number.parseFloat(window.getComputedStyle(document.body).lineHeight);
      if (Number.isFinite(computedLineHeight) && computedLineHeight > 0) {
        return Math.max(8, Math.min(120, Math.round(computedLineHeight)));
      }
      return 24;
    }, performScrollTick = function() {
      if (isAtScrollBoundary()) {
        if (loopAtEnd) {
          resetToStart();
        } else {
          stopAutoScroll();
        }
        return;
      }
      if (jumpScrollEnabled) {
        const jumpDistance = getJumpDistance();
        const jumpMultiplier = slowModeEnabled ? Math.max(SLOW_MODE_MIN_SCROLL_STEP, scrollStep / 3) : Math.max(1, Math.round(scrollStep / 3));
        scrollByDistance(jumpDistance * jumpMultiplier);
        return;
      }
      const delta = getScrollDelta();
      window.scrollBy(delta.x, delta.y);
    }, getTickIntervalMs = function() {
      return jumpScrollEnabled ? lineDelayMs : 16;
    }, stopScrollScheduler = function() {
      if (scrollTimer === null) {
        scrollSchedulerMode = null;
        smoothLastFrameTime = null;
        return;
      }
      if (scrollSchedulerMode === "smooth") {
        window.cancelAnimationFrame(scrollTimer);
      } else {
        window.clearInterval(scrollTimer);
      }
      scrollTimer = null;
      scrollSchedulerMode = null;
      smoothLastFrameTime = null;
    }, runSmoothFrame = function(timestamp) {
      if (scrollTimer === null || scrollSchedulerMode !== "smooth") {
        return;
      }
      if (isAtScrollBoundary()) {
        if (loopAtEnd) {
          resetToStart();
        } else {
          stopAutoScroll();
          return;
        }
      }
      if (smoothLastFrameTime === null) {
        smoothLastFrameTime = timestamp;
      }
      const elapsedMs = Math.max(0, timestamp - smoothLastFrameTime);
      smoothLastFrameTime = timestamp;
      const pixelsPerSecond = scrollStep * 62.5;
      const nextDistance = pixelsPerSecond * elapsedMs / 1e3;
      if (nextDistance > 0) {
        scrollByDistance(nextDistance);
      }
      scrollTimer = window.requestAnimationFrame(runSmoothFrame);
    }, startSmoothScheduler = function() {
      stopScrollScheduler();
      scrollSchedulerMode = "smooth";
      smoothLastFrameTime = null;
      scrollTimer = window.requestAnimationFrame(runSmoothFrame);
    }, startJumpScheduler = function() {
      stopScrollScheduler();
      scrollSchedulerMode = "jump";
      scrollTimer = window.setInterval(() => {
        performScrollTick();
      }, getTickIntervalMs());
    }, restartScrollTimer = function() {
      if (jumpScrollEnabled) {
        startJumpScheduler();
        return;
      }
      startSmoothScheduler();
    }, startAutoScroll = function() {
      if (scrollTimer !== null) {
        return;
      }
      hasStarted = true;
      isPaused = false;
      restartScrollTimer();
      reportBadgeState();
    }, stopAutoScroll = function() {
      if (scrollTimer === null) {
        hasStarted = false;
        isPaused = false;
        return;
      }
      stopScrollScheduler();
      hasStarted = false;
      isPaused = false;
      reportBadgeState();
    }, resetScrollSession = function() {
      scrollStep = DEFAULT_SCROLL_STEP;
      scrollDirection = DEFAULT_SCROLL_DIRECTION;
      jumpScrollEnabled = DEFAULT_JUMP_SCROLL;
      slowModeEnabled = DEFAULT_SLOW_MODE;
      lineDelayMs = DEFAULT_LINE_DELAY_MS;
    }, pauseAutoScroll = function() {
      if (scrollTimer === null) {
        return;
      }
      stopScrollScheduler();
      if (hasStarted) {
        isPaused = true;
      }
      reportBadgeState();
    }, resumeAutoScroll = function() {
      if (!hasStarted || !isPaused || scrollTimer !== null) {
        return;
      }
      startAutoScroll();
      reportBadgeState();
    }, getScrollStatus = function() {
      return {
        isRunning: scrollTimer !== null,
        isPaused,
        speed: scrollStep
      };
    };
    var getRuntimeState2 = getRuntimeState, reportBadgeState2 = reportBadgeState, getMinScrollStep2 = getMinScrollStep, normalizeScrollStep2 = normalizeScrollStep, setScrollSpeed2 = setScrollSpeed, setSlowModeSetting2 = setSlowModeSetting, setScrollDirection2 = setScrollDirection, setLoopSetting2 = setLoopSetting, clampLineDelay2 = clampLineDelay, setJumpScrollSetting2 = setJumpScrollSetting, setLineDelay2 = setLineDelay, resetToStart2 = resetToStart, isAtPageBottom2 = isAtPageBottom, isAtPageTop2 = isAtPageTop, isAtHorizontalStart2 = isAtHorizontalStart, isAtHorizontalEnd2 = isAtHorizontalEnd, isAtScrollBoundary2 = isAtScrollBoundary, getScrollDelta2 = getScrollDelta, scrollByDistance2 = scrollByDistance, getJumpDistance2 = getJumpDistance, performScrollTick2 = performScrollTick, getTickIntervalMs2 = getTickIntervalMs, stopScrollScheduler2 = stopScrollScheduler, runSmoothFrame2 = runSmoothFrame, startSmoothScheduler2 = startSmoothScheduler, startJumpScheduler2 = startJumpScheduler, restartScrollTimer2 = restartScrollTimer, startAutoScroll2 = startAutoScroll, stopAutoScroll2 = stopAutoScroll, resetScrollSession2 = resetScrollSession, pauseAutoScroll2 = pauseAutoScroll, resumeAutoScroll2 = resumeAutoScroll, getScrollStatus2 = getScrollStatus;
    window.__autoScrollExtensionInitialized = true;
    const DEFAULT_SCROLL_STEP = 3;
    const DEFAULT_SCROLL_DIRECTION = "down";
    const DEFAULT_JUMP_SCROLL = false;
    const DEFAULT_SLOW_MODE = false;
    const DEFAULT_LINE_DELAY_MS = 220;
    const MAX_SCROLL_STEP = 20;
    const NORMAL_MIN_SCROLL_STEP = 1;
    const SLOW_MODE_MIN_SCROLL_STEP = 0.1;
    let scrollTimer = null;
    let scrollSchedulerMode = null;
    let smoothLastFrameTime = null;
    let scrollStep = DEFAULT_SCROLL_STEP;
    let scrollDirection = DEFAULT_SCROLL_DIRECTION;
    let jumpScrollEnabled = DEFAULT_JUMP_SCROLL;
    let slowModeEnabled = DEFAULT_SLOW_MODE;
    let lineDelayMs = DEFAULT_LINE_DELAY_MS;
    let loopAtEnd = false;
    let hasStarted = false;
    let isPaused = false;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message.action) {
        return;
      }
      if (message.action === "status") {
        sendResponse(getScrollStatus());
        return;
      }
      setSlowModeSetting(message.slowMode);
      setScrollSpeed(message.speed);
      setScrollDirection(message.direction);
      setLoopSetting(message.loop);
      setJumpScrollSetting(message.jumpScroll);
      setLineDelay(message.lineDelayMs);
      if (message.action === "start") {
        startAutoScroll();
      }
      if (message.action === "stop") {
        stopAutoScroll();
        if (message.reset) {
          resetScrollSession();
        }
      }
      if (message.action === "pause") {
        pauseAutoScroll();
      }
      if (message.action === "resume") {
        resumeAutoScroll();
      }
    });
    reportBadgeState();
  }
})();
//# sourceMappingURL=scroll.js.map
