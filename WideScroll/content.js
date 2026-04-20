let styleEl;

chrome.storage.sync.get("enabled", ({ enabled }) => {
  if (enabled) inject();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg === "enable") inject();
  if (msg === "disable") remove();
});

function inject() {
  if (styleEl) return;
  styleEl = document.createElement("link");
  styleEl.rel = "stylesheet";
  styleEl.href = chrome.runtime.getURL("style.css");
  document.documentElement.appendChild(styleEl);
}

function remove() {
  if (!styleEl) return;
  styleEl.remove();
  styleEl = null;
}
