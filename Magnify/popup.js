const zoomRange = document.getElementById("zoomRange");
const sizeRange = document.getElementById("sizeRange");
const zoomValue = document.getElementById("zoomValue");
const sizeValue = document.getElementById("sizeValue");
const toggleButton = document.getElementById("toggleButton");

init().catch(() => {
  toggleButton.disabled = true;
  toggleButton.textContent = "Unavailable on this page";
});

async function init() {
  const { settings } = await chrome.runtime.sendMessage({
    action: "magnifier:getSettings"
  });

  applySettingsToUI(settings);

  zoomRange.addEventListener("input", onSettingsInput);
  sizeRange.addEventListener("input", onSettingsInput);
  toggleButton.addEventListener("click", onToggleClick);
}

async function onSettingsInput() {
  const settings = {
    zoom: Number(zoomRange.value),
    lensSize: Number(sizeRange.value)
  };

  applySettingsToUI(settings);
  await chrome.runtime.sendMessage({
    action: "magnifier:updateSettings",
    settings
  });
}

async function onToggleClick() {
  toggleButton.disabled = true;

  try {
    await chrome.runtime.sendMessage({ action: "magnifier:toggleActiveTab" });
  } finally {
    toggleButton.disabled = false;
  }
}

function applySettingsToUI(settings) {
  zoomRange.value = String(settings.zoom);
  sizeRange.value = String(settings.lensSize);
  zoomValue.textContent = `${Number(settings.zoom).toFixed(2)}x`;
  sizeValue.textContent = `${Math.round(Number(settings.lensSize))}px`;
}
