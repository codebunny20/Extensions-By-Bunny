let magnifierEnabled = false;
let magnifier = null;
let viewportClone = null;

const ZOOM = 2;
const LENS_SIZE = 180;

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

  viewportClone = document.createElement("div");
  viewportClone.id = "magnifier__clone";
  viewportClone.setAttribute("aria-hidden", "true");

  // Prefer cloning BODY to avoid re-applying HEAD/CSS that can distort the view.
  // Fallback to documentElement only if body isn't available.
  const sourceRoot = document.body || document.documentElement;
  const root = sourceRoot.cloneNode(true);

  // Remove our own overlay from the clone (prevents recursive/duplicated lens content)
  // and reduces side effects.
  removeFromClone(root, "#magnifier");
  removeFromClone(root, "#magnifier__clone");

  // Reduce side-effects: avoid duplicate IDs + inline handler execution surfaces.
  sanitizeClone(root);

  viewportClone.appendChild(root);
  magnifier.appendChild(viewportClone);

  // Attach to body when possible.
  (document.body || document.documentElement).appendChild(magnifier);

  magnifier.style.width = `${LENS_SIZE}px`;
  magnifier.style.height = `${LENS_SIZE}px`;

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
}

function disableMagnifier() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("keydown", onKeyDown);

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
  moveMagnifier(e);
}

function moveMagnifier(e) {
  if (!magnifier || !viewportClone) return;

  const half = LENS_SIZE / 2;
  const x = clamp(e.clientX, half, window.innerWidth - half);
  const y = clamp(e.clientY, half, window.innerHeight - half);

  magnifier.style.left = `${x}px`;
  magnifier.style.top = `${y}px`;

  const pageX = e.clientX + window.scrollX;
  const pageY = e.clientY + window.scrollY;

  const tx = -(pageX * ZOOM - half);
  const ty = -(pageY * ZOOM - half);

  viewportClone.style.transformOrigin = "top left";
  viewportClone.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeClone(rootEl) {
  if (!rootEl?.querySelectorAll) return;

  // Remove ids to avoid duplicates. Remove inline on* handlers to prevent surprises.
  const all = rootEl.querySelectorAll("*");
  for (const el of all) {
    if (el.id) el.removeAttribute("id");

    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }
}

function removeFromClone(rootEl, selector) {
  if (!rootEl?.querySelectorAll) return;
  for (const el of rootEl.querySelectorAll(selector)) el.remove();
}

// Allow programmatic toggling when injected via chrome.scripting.executeScript.
globalThis.__magnifierToggle = () => {
  magnifierEnabled = !magnifierEnabled;
  magnifierEnabled ? enableMagnifier() : disableMagnifier();
};