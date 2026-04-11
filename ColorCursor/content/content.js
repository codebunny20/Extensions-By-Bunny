const STYLE_ID = "mpce-cursor-style";

function svgCursorDataUrl(hexColor) {
  // Simple pointer-ish shape; hotspot near tip (x=2,y=2) works reasonably.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <path d="M6 3 L26 16 L18 18 L22 28 L18 30 L14 20 L6 24 Z"
            fill="${hexColor}" stroke="#000000" stroke-opacity="0.25" stroke-width="1"/>
    </svg>
  `.trim();

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `url("data:image/svg+xml,${encoded}") 2 2, auto`;
}

function setCursorEnabled(enabled, color) {
  let style = document.getElementById(STYLE_ID);

  if (!enabled) {
    if (style) style.remove();
    return;
  }

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }

  const cursorValue = svgCursorDataUrl(color || "#ff0000");
  style.textContent = `
    html, body, * { cursor: ${cursorValue} !important; }
  `;
}

function loadAndApply() {
  chrome.storage.sync.get({ enabled: true, color: "#ff0000" }, (cfg) => {
    setCursorEnabled(!!cfg.enabled, cfg.color);
  });
}

loadAndApply();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (changes.enabled || changes.color) loadAndApply();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "MPCE_APPLY") loadAndApply();
});
