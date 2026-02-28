let magnifierEnabled = false;
let magnifier = null;
let viewportClone = null;
let lastMouse = null;

const ZOOM = 2;
const LENS_SIZE = 180;

const ext = chrome;

// Capture throttling
const CAPTURE_MS = 120;
let captureTimer = null;
let captureInFlight = false;
let captureQueued = false;

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

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  startCaptureLoop();

  // Initial position
  const initX = lastMouse?.clientX ?? window.innerWidth / 2;
  const initY = lastMouse?.clientY ?? window.innerHeight / 2;
  moveAndRender(initX, initY);
  requestCaptureOnce();
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
  moveAndRender(e.clientX, e.clientY);
  requestCaptureOnce();
}

function onScrollOrResize() {
  // Screenshot changes on scroll; refresh + re-render at last position.
  requestCaptureOnce();
  if (lastMouse) moveAndRender(lastMouse.clientX, lastMouse.clientY);
}

function moveAndRender(clientX, clientY) {
  if (!magnifier || !viewportClone) return;

  const half = LENS_SIZE / 2;
  const x = clamp(clientX, half, window.innerWidth - half);
  const y = clamp(clientY, half, window.innerHeight - half);

  magnifier.style.left = `${x}px`;
  magnifier.style.top = `${y}px`;

  // Ensure screenshot matches viewport size (captureVisibleTab returns viewport image)
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

  const tx = -(clientX * ZOOM - half);
  const ty = -(clientY * ZOOM - half);
  viewportClone.style.transformOrigin = "top left";
  viewportClone.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
}

function startCaptureLoop() {
  stopCaptureLoop();
  captureTimer = setInterval(() => requestCaptureOnce(), CAPTURE_MS);
}

function stopCaptureLoop() {
  if (captureTimer) clearInterval(captureTimer);
  captureTimer = null;
}

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Allow programmatic toggling when injected via chrome.scripting.executeScript.
globalThis.__magnifierToggle = () => {
  magnifierEnabled = !magnifierEnabled;
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
};