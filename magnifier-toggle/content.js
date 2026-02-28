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

// Guard in case this script ever runs outside extension context
if (ext?.runtime?.onMessage) {
  ext.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggleMagnifier") {
      magnifierEnabled = !magnifierEnabled;
      magnifierEnabled ? enableMagnifier() : disableMagnifier();
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

  magnifier.appendChild(viewportClone);
  (document.body || document.documentElement).appendChild(magnifier);

  magnifier.style.width = `${LENS_SIZE}px`;
  magnifier.style.height = `${LENS_SIZE}px`;

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  startCaptureLoop();
}

function disableMagnifier() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("scroll", onScrollOrResize);
  window.removeEventListener("resize", onScrollOrResize);

  stopCaptureLoop();

  if (magnifier) magnifier.remove();
  magnifier = null;
  viewportClone = null;
}

function onKeyDown(e) {
  if (e.key === "Escape" && magnifierEnabled) {
    magnifierEnabled = false;
    disableMagnifier();
  }
}

function onMouseMove(e) {
  lastMouse = e;
  moveMagnifier(e);
}

function onScrollOrResize() {
  // Keep position correct and refresh capture after scroll/resize changes.
  if (lastMouse) moveMagnifier(lastMouse);
  requestCaptureOnce();
}

function moveMagnifier(e) {
  if (!magnifier || !viewportClone) return;

  const half = LENS_SIZE / 2;
  const x = clamp(e.clientX, half, window.innerWidth - half);
  const y = clamp(e.clientY, half, window.innerHeight - half);

  magnifier.style.left = `${x}px`;
  magnifier.style.top = `${y}px`;

  // We are panning a screenshot of the *viewport* (client coords),
  // so do NOT add scrollX/scrollY here.
  const tx = -(e.clientX * ZOOM - half);
  const ty = -(e.clientY * ZOOM - half);

  viewportClone.style.width = `${window.innerWidth}px`;
  viewportClone.style.height = `${window.innerHeight}px`;
  viewportClone.style.transformOrigin = "top left";
  viewportClone.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function startCaptureLoop() {
  stopCaptureLoop();
  requestCaptureOnce();

  captureTimer = setInterval(() => {
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
  magnifierEnabled = !magnifierEnabled;
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
};