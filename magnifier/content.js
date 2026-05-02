let magnifierEnabled = false;
let zoom = 2.0;
let size = 220;

let overlay = null;
let inner = null;

async function initSettings() {
  const stored = await chrome.storage.sync.get(["magnifierZoom", "magnifierSize", "magnifierEnabled"]);
  zoom = stored.magnifierZoom ?? zoom;
  size = stored.magnifierSize ?? size;
  magnifierEnabled = stored.magnifierEnabled ?? false;

  if (magnifierEnabled) {
    createMagnifier();
  }
}

function createMagnifier() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "mg-magnifier-overlay";
  overlay.style.width = `${size}px`;
  overlay.style.height = `${size}px`;

  inner = document.createElement("div");
  inner.id = "mg-magnifier-inner";

  overlay.appendChild(inner);
  document.documentElement.appendChild(overlay);

  updateInnerSnapshot();
  document.addEventListener("mousemove", handleMouseMove, { passive: true });
  window.addEventListener("scroll", updateInnerSnapshot, { passive: true });
  window.addEventListener("resize", updateInnerSnapshot);
}

function destroyMagnifier() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  inner = null;
  document.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("scroll", updateInnerSnapshot);
  window.removeEventListener("resize", updateInnerSnapshot);
}

function handleMouseMove(e) {
  if (!overlay || !inner) return;

  const x = e.clientX;
  const y = e.clientY;

  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const originX = (x + scrollX) - size / (2 * zoom);
  const originY = (y + scrollY) - size / (2 * zoom);

  inner.style.transform = `translate(${-originX}px, ${-originY}px) scale(${zoom})`;
}

function updateInnerSnapshot() {
  if (!inner) return;

  // Use the full page as the "source" by cloning the body into the inner container.
  // This is a simple approach; for heavy pages it may be more expensive.
  inner.innerHTML = "";
  const clone = document.body.cloneNode(true);
  // Avoid nested overlays if any
  const oldOverlay = clone.querySelector("#mg-magnifier-overlay");
  if (oldOverlay) oldOverlay.remove();

  inner.appendChild(clone);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_MAGNIFIER") {
    magnifierEnabled = typeof msg.enabled === "boolean" ? msg.enabled : !magnifierEnabled;
    if (magnifierEnabled) {
      createMagnifier();
    } else {
      destroyMagnifier();
    }
  }

  if (msg.type === "UPDATE_SETTINGS") {
    if (typeof msg.zoom === "number") zoom = msg.zoom;
    if (typeof msg.size === "number") {
      size = msg.size;
      if (overlay) {
        overlay.style.width = `${size}px`;
        overlay.style.height = `${size}px`;
      }
    }
  }
});

initSettings();
