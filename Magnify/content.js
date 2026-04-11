let magnifierEnabled = false;
let magnifier = null;
let viewportClone = null; // will be a <div> that contains a cloned subtree
let lastMouse = null;

const ZOOM = 2;
const LENS_SIZE = 180;

const ext = chrome;

// rAF positioning (keep it simple + smooth)
let rafId = 0;
let targetClientX = 0,
  targetClientY = 0;
let curClientX = 0,
  curClientY = 0;
const FOLLOW = 0.25;

function setMagnifierEnabled(next) {
  magnifierEnabled = Boolean(next);
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
}

// Guard in case this script ever runs outside extension context
if (ext?.runtime?.onMessage) {
  ext.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggleMagnifier") setMagnifierEnabled(!magnifierEnabled);
  });
}

function enableMagnifier() {
  if (magnifier) return;

  magnifier = document.createElement("div");
  magnifier.id = "magnifier";
  magnifier.setAttribute("aria-hidden", "true");
  magnifier.tabIndex = -1;

  viewportClone = document.createElement("div");
  viewportClone.id = "magnifier__clone";
  viewportClone.setAttribute("aria-hidden", "true");

  magnifier.style.width = `${LENS_SIZE}px`;
  magnifier.style.height = `${LENS_SIZE}px`;

  magnifier.appendChild(viewportClone);
  (document.body || document.documentElement).appendChild(magnifier);

  // Build initial clone
  syncClone();

  // Initial position
  const initX = lastMouse?.clientX ?? window.innerWidth / 2;
  const initY = lastMouse?.clientY ?? window.innerHeight / 2;
  targetClientX = curClientX = initX;
  targetClientY = curClientY = initY;

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  startRenderLoop();
}

function disableMagnifier() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("scroll", onScrollOrResize);
  window.removeEventListener("resize", onScrollOrResize);

  stopRenderLoop();

  if (magnifier) magnifier.remove();
  magnifier = null;
  viewportClone = null;
}

function onKeyDown(e) {
  if (e.key === "Escape" && magnifierEnabled) setMagnifierEnabled(false);
}

function onMouseMove(e) {
  lastMouse = e;
  targetClientX = e.clientX;
  targetClientY = e.clientY;
}

function onScrollOrResize() {
  // Re-clone occasionally to reflect layout changes; cheap and reliable.
  syncClone();
}

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

  curClientX = lerp(curClientX, targetClientX, FOLLOW);
  curClientY = lerp(curClientY, targetClientY, FOLLOW);

  const half = LENS_SIZE / 2;
  const x = clamp(curClientX, half, window.innerWidth - half);
  const y = clamp(curClientY, half, window.innerHeight - half);

  magnifier.style.left = `${x}px`;
  magnifier.style.top = `${y}px`;

  // Translate by PAGE coords (client + scroll) because clone is document-sized.
  const pageX = curClientX + window.scrollX;
  const pageY = curClientY + window.scrollY;

  const tx = -(pageX * ZOOM - half);
  const ty = -(pageY * ZOOM - half);

  viewportClone.style.transformOrigin = "top left";
  viewportClone.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;

  rafId = requestAnimationFrame(renderTick);
}

function syncClone() {
  if (!viewportClone) return;

  // Clear old clone
  viewportClone.textContent = "";

  // Clone the whole documentElement so layout/positioning matches page coordinates.
  const root = document.documentElement.cloneNode(true);

  // Strip the magnifier itself if it got cloned (avoid recursion).
  root.querySelector?.("#magnifier")?.remove();

  viewportClone.appendChild(root);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Allow programmatic toggling when injected via chrome.scripting.executeScript.
globalThis.__magnifierToggle = () => {
  setMagnifierEnabled(!magnifierEnabled);
};