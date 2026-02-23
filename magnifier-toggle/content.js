let magnifierEnabled = false;
let magnifier, viewportClone, lastMouseEvent;

let zoom = 2;
let lensSize = 150;

// New: HUD + rAF mouse throttling
let hudEl = null;
let rafPending = false;

// New: refresh control
let refreshTimer = null;
let lastRefreshAt = 0;

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

  // New: a11y + don't get focused/clicked
  magnifier.setAttribute("aria-hidden", "true");
  magnifier.tabIndex = -1;

  // New: HUD (zoom/size/help)
  hudEl = document.createElement("div");
  hudEl.id = "magnifier__hud";
  hudEl.setAttribute("aria-hidden", "true");
  magnifier.appendChild(hudEl);

  // CHANGED: no more DOM cloning; keep variable but don't create/append clone nodes
  viewportClone = null;

  (document.body || document.documentElement).appendChild(magnifier);

  setLensSize(lensSize);
  updateHud();
  syncMagnifier();

  // New: throttle mousemove work to animation frames
  document.addEventListener("mousemove", onMouseMove, { passive: true });

  // New: wheel to zoom
  document.addEventListener("wheel", onWheel, { passive: false });

  window.addEventListener("scroll", syncMagnifier, { passive: true });
  window.addEventListener("resize", syncMagnifier, { passive: true });

  // CHANGED: disable clone refresh hooks (not needed for backdrop-filter lens)
  window.removeEventListener("hashchange", refreshClone);
  window.removeEventListener("popstate", refreshClone);

  document.addEventListener("keydown", onKeyDown);

  // New: disable periodic cloning by default (manual R still works)
  stopAutoRefresh();

  if (lastMouseEvent) moveMagnifier(lastMouseEvent);
}

function disableMagnifier() {
  if (magnifier) magnifier.remove();
  magnifier = null;
  viewportClone = null;
  hudEl = null;

  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("wheel", onWheel);
  window.removeEventListener("scroll", syncMagnifier);
  window.removeEventListener("resize", syncMagnifier);
  window.removeEventListener("hashchange", refreshClone);
  window.removeEventListener("popstate", refreshClone);
  document.removeEventListener("keydown", onKeyDown);

  stopAutoRefresh();
}

// New: rAF mouse handler
function onMouseMove(e) {
  lastMouseEvent = e;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (lastMouseEvent) moveMagnifier(lastMouseEvent);
  });
}

function onKeyDown(e) {
  if (e.key === "Escape" && magnifierEnabled) {
    magnifierEnabled = false;
    disableMagnifier();
    return;
  }

  if (!magnifierEnabled) return;

  const fast = e.shiftKey ? 2 : 1;

  // Zoom hotkeys
  if (e.key === "=" || e.key === "+") {
    setZoom(zoom + 0.25 * fast);
    return;
  }
  if (e.key === "-" || e.key === "_") {
    setZoom(zoom - 0.25 * fast);
    return;
  }

  // Lens size hotkeys
  if (e.key === "]") {
    setLensSize(lensSize + 20 * fast);
    return;
  }
  if (e.key === "[") {
    setLensSize(lensSize - 20 * fast);
    return;
  }

  // Manual refresh
  if (e.key.toLowerCase() === "r") {
    refreshClone();
  }
}

// Replaces fixed getZoom()
function getZoom() {
  return zoom;
}

function setZoom(next) {
  zoom = clamp(next, 1, 6);
  syncMagnifier();
  updateHud();
  if (lastMouseEvent) moveMagnifier(lastMouseEvent);
}

function setLensSize(nextPx) {
  lensSize = clamp(nextPx, 80, 400);
  if (!magnifier) return;
  magnifier.style.width = lensSize + "px";
  magnifier.style.height = lensSize + "px";
  updateHud();
  if (lastMouseEvent) moveMagnifier(lastMouseEvent);
}

function updateHud() {
  if (!hudEl) return;
  hudEl.textContent = `Zoom: ${zoom.toFixed(2)}x  Size: ${Math.round(lensSize)}  (Wheel/+/- , [ ] , R refresh , Esc)`;
}

function onWheel(e) {
  if (!magnifierEnabled) return;

  // Ctrl/Meta wheel commonly maps to page zoom; don't fight it.
  if (e.ctrlKey || e.metaKey) return;

  // Only engage zooming when pointer is within the lens area
  // (prevents surprising page scroll behavior everywhere).
  if (!magnifier) return;
  const rect = magnifier.getBoundingClientRect();
  const inLens =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;

  if (!inLens) return;

  e.preventDefault();

  const fast = e.shiftKey ? 2 : 1;
  const direction = e.deltaY < 0 ? 1 : -1;
  setZoom(zoom + direction * 0.15 * fast);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function syncMagnifier() {
  // CHANGED: apply magnification to the lens itself
  if (!magnifier) return;

  const z = getZoom();
  magnifier.style.webkitBackdropFilter = `magnify(${z})`;
  magnifier.style.backdropFilter = `magnify(${z})`;
}

function moveMagnifier(e) {
  if (!magnifier) return;

  const halfW = magnifier.offsetWidth / 2;
  const halfH = magnifier.offsetHeight / 2;

  const x = clamp(e.clientX, halfW, window.innerWidth - halfW);
  const y = clamp(e.clientY, halfH, window.innerHeight - halfH);

  magnifier.style.left = x + "px";
  magnifier.style.top = y + "px";

  // CHANGED: drive backdrop translation so the point under cursor is centered in lens
  // translate values are in CSS pixels; magnify() scales what's behind the element.
  const z = getZoom();
  const pageX = e.clientX + window.scrollX;
  const pageY = e.clientY + window.scrollY;

  const tx = -(pageX - halfW);
  const ty = -(pageY - halfH);

  const filter = `magnify(${z}) translate(${tx}px, ${ty}px)`;
  magnifier.style.webkitBackdropFilter = filter;
  magnifier.style.backdropFilter = filter;
}

function refreshClone() {
  // CHANGED: no-op (clone removed). Keep hotkey without breaking.
  syncMagnifier();
  if (lastMouseEvent) moveMagnifier(lastMouseEvent);
}

function startAutoRefresh() {
  stopAutoRefresh();
  // Keep available for users who want it later; disabled by default in enableMagnifier().
  refreshTimer = setInterval(() => {
    refreshClone();
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
  lastRefreshAt = 0;
}

// Allow programmatic toggling when injected via chrome.scripting.executeScript.
// (Used by background.js; avoids popup + avoids sendMessage dependency.)
globalThis.__magnifierToggle = () => {
  magnifierEnabled = !magnifierEnabled;
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
};