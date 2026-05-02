const zoomRange = document.getElementById("zoomRange");
const sizeRange = document.getElementById("sizeRange");
const zoomValue = document.getElementById("zoomValue");
const sizeValue = document.getElementById("sizeValue");
const toggleBtn = document.getElementById("toggleBtn");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setZoomLabel(v) {
  zoomValue.textContent = `${v.toFixed(1)}×`;
}

function setSizeLabel(v) {
  sizeValue.textContent = `${Math.round(v)}px`;
}

async function loadSettings() {
  const { magnifierZoom = 2.0, magnifierSize = 220, magnifierEnabled = false } =
    await chrome.storage.sync.get(["magnifierZoom", "magnifierSize", "magnifierEnabled"]);

  zoomRange.value = magnifierZoom;
  sizeRange.value = magnifierSize;
  setZoomLabel(magnifierZoom);
  setSizeLabel(magnifierSize);

  toggleBtn.classList.toggle("off", !magnifierEnabled);
  toggleBtn.textContent = magnifierEnabled ? "Turn off magnifier" : "Turn on magnifier";
}

zoomRange.addEventListener("input", async () => {
  const zoom = parseFloat(zoomRange.value);
  setZoomLabel(zoom);
  await chrome.storage.sync.set({ magnifierZoom: zoom });

  const tab = await getActiveTab();
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "UPDATE_SETTINGS", zoom });
  }
});

sizeRange.addEventListener("input", async () => {
  const size = parseFloat(sizeRange.value);
  setSizeLabel(size);
  await chrome.storage.sync.set({ magnifierSize: size });

  const tab = await getActiveTab();
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "UPDATE_SETTINGS", size });
  }
});

toggleBtn.addEventListener("click", async () => {
  const { magnifierEnabled = false } = await chrome.storage.sync.get("magnifierEnabled");
  const newState = !magnifierEnabled;
  await chrome.storage.sync.set({ magnifierEnabled: newState });

  const tab = await getActiveTab();
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MAGNIFIER", enabled: newState });
  }

  toggleBtn.classList.toggle("off", !newState);
  toggleBtn.textContent = newState ? "Turn off magnifier" : "Turn on magnifier";
});

loadSettings();
