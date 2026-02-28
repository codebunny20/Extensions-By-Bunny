let magnifierEnabled = false;
let magnifier = null;
let viewportClone = null; // will be the <img>
let captureTimer = null;
let lastMouse = null;

const ZOOM = 2;
const LENS_SIZE = 180;
// lower = smoother but more CPU; higher = more lag but cheaper
const CAPTURE_MS = 120;

const ext = chrome;

// --- smoothing state (new) ---
let rafId = 0;
let targetX = 0,
  targetY = 0;
let curX = 0,
  curY = 0;
let targetClientX = 0,
  targetClientY = 0;
let curClientX = 0,
  curClientY = 0;

// 0..1 (higher = tighter/faster follow)
const FOLLOW = 0.22;
// avoid infinite tiny moves
const EPS = 0.1;

function setMagnifierEnabled(next) {
  magnifierEnabled = Boolean(next);
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
}

// Guard in case this script ever runs outside extension context
if (ext?.runtime?.onMessage) {
  ext.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggleMagnifier") {
      setMagnifierEnabled(!magnifierEnabled);
    }
  });
}

function enableMagnifier() {
  if (magnifier) return;

  magnifier = document.createElement("div");
  magnifier.id = "magnifier";
  magnifier.setAttribute("aria-hidden", "true");
  magnifier.tabIndex = -1;

  // Use an IMG backed by captureVisibleTab instead of cloning the DOM.
  viewportClone = document.createElement("img");
  viewportClone.id = "magnifier__clone";
  viewportClone.setAttribute("aria-hidden", "true");
  viewportClone.alt = "";
  viewportClone.decoding = "async";
  viewportClone.loading = "eager";
  viewportClone.draggable = false;

  magnifier.appendChild(viewportClone);
  (document.body || document.documentElement).appendChild(magnifier);

  magnifier.style.width = `${LENS_SIZE}px`;
  magnifier.style.height = `${LENS_SIZE}px`;

  // Initialize smoothed position so it doesn't "jump" on enable
  const initX = lastMouse?.clientX ?? window.innerWidth / 2;
  const initY = lastMouse?.clientY ?? window.innerHeight / 2;
  const { x, y } = clampLensCenter(initX, initY);

  targetX = curX = x;
  targetY = curY = y;
  targetClientX = curClientX = initX;
  targetClientY = curClientY = initY;

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  startRenderLoop();
  startCaptureLoop();
}

function disableMagnifier() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("scroll", onScrollOrResize);
  window.removeEventListener("resize", onScrollOrResize);

  stopRenderLoop();
  stopCaptureLoop();

  if (magnifier) magnifier.remove();
  magnifier = null;
  viewportClone = null;
}

function onKeyDown(e) {
  if (e.key === "Escape" && magnifierEnabled) {
    setMagnifierEnabled(false);
  }
}

function onMouseMove(e) {
  lastMouse = e;

  const { x, y } = clampLensCenter(e.clientX, e.clientY);
  targetX = x;
  targetY = y;

  targetClientX = e.clientX;
  targetClientY = e.clientY;

  // capturing at least once after movement reduces "laggy" feel
  requestCaptureOnce();
}

function onScrollOrResize() {
  // On scroll, the screenshot changes; request a refresh.
  requestCaptureOnce();

  // Keep the lens centered on the last mouse position (clamped)
  if (lastMouse) {
    const { x, y } = clampLensCenter(lastMouse.clientX, lastMouse.clientY);
    targetX = x;
    targetY = y;
    targetClientX = lastMouse.clientX;
    targetClientY = lastMouse.clientY;
  }
}

function clampLensCenter(clientX, clientY) {
  const half = LENS_SIZE / 2;
  const x = clamp(clientX, half, window.innerWidth - half);
  const y = clamp(clientY, half, window.innerHeight - half);
  return { x, y };
}

// --- render loop (new) ---
function startRenderLoop() {
  stopRenderLoop();
  rafId = requestAnimationFrame(renderTick);
}

function stopRenderLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function renderTick() {
  if (!magnifierEnabled || !magnifier || !viewportClone) {
    rafId = 0;
    return;
  }

  // Smoothly follow the target
  curX = lerp(curX, targetX, FOLLOW);
  curY = lerp(curY, targetY, FOLLOW);
  curClientX = lerp(curClientX, targetClientX, FOLLOW);
  curClientY = lerp(curClientY, targetClientY, FOLLOW);

  magnifier.style.left = `${curX}px`;
  magnifier.style.top = `${curY}px`;

  const half = LENS_SIZE / 2;

  // captureVisibleTab is viewport pixels; use client coords (no scroll)
  const tx = -(curClientX * ZOOM - half);
  const ty = -(curClientY * ZOOM - half);

  // Set these only when needed to avoid needless layout churn
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (viewportClone._mw !== w) {
    viewportClone._mw = w;
    viewportClone.style.width = `${w}px`;
  }
  if (viewportClone._mh !== h) {
    viewportClone._mh = h;
    viewportClone.style.height = `${h}px`;
  }

  viewportClone.style.transformOrigin = "top left";
  viewportClone.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;

  // If we're basically at rest, still keep animating lightly (prevents "snap" on next move).
  // You can stop when close enough, but continuous rAF is simple and smooth.
  rafId = requestAnimationFrame(renderTick);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// --- capture loop (adjusted) ---
function startCaptureLoop() {
  stopCaptureLoop();
  requestCaptureOnce();

  // A light keepalive capture helps dynamic pages match what you see.
  captureTimer = setInterval(() => {
    // Only capture if lens is enabled; requestCaptureOnce already checks refs.
    requestCaptureOnce();
  }, CAPTURE_MS);
}

function stopCaptureLoop() {
  if (captureTimer) clearInterval(captureTimer);
  captureTimer = null;
}

let captureInFlight = false;
let captureQueued = false;

function requestCaptureOnce() {
  if (!magnifierEnabled || !viewportClone) return;

  if (captureInFlight) {
    captureQueued = true;
    return;
  }

  captureInFlight = true;
  ext.runtime.sendMessage({ action: "magnifier:capture" }, (res) => {
    captureInFlight = false;

    if (res?.ok && res.dataUrl && viewportClone) {
      // Setting src can cause decoding work; async decode helps smoothness.
      viewportClone.src = res.dataUrl;
    }

    if (captureQueued) {
      captureQueued = false;
      requestCaptureOnce();
    }
  });
}

// Allow programmatic toggling when injected via chrome.scripting.executeScript.
globalThis.__magnifierToggle = () => {
  setMagnifierEnabled(!magnifierEnabled);
};