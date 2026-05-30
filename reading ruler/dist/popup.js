"use strict";
const SETTINGS_KEY = "readingRulerSettings";
const DEFAULTS = {
    enabled: false,
    rulerHeight: 32,
    dimStrength: 0.4,
};
const MIN_RULER_HEIGHT = 8;
const MAX_RULER_HEIGHT = 240;
const MIN_DIM_STRENGTH = 0.05;
const MAX_DIM_STRENGTH = 0.95;
function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required popup element: #${id}`);
    }
    return element;
}
const enabledInput = getRequiredElement("enabled");
const heightInput = getRequiredElement("height");
const dimInput = getRequiredElement("dim");
const heightValue = getRequiredElement("heightValue");
const dimValue = getRequiredElement("dimValue");
const resetButton = getRequiredElement("resetBtn");
const closeButton = getRequiredElement("closeBtn");
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function normalizeSettings(raw) {
    const candidate = (raw ?? {});
    return {
        enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULTS.enabled,
        rulerHeight: typeof candidate.rulerHeight === "number"
            ? clamp(candidate.rulerHeight, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT)
            : DEFAULTS.rulerHeight,
        dimStrength: typeof candidate.dimStrength === "number"
            ? clamp(candidate.dimStrength, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH)
            : DEFAULTS.dimStrength,
    };
}
function readSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([SETTINGS_KEY], (result) => {
            resolve(normalizeSettings(result[SETTINGS_KEY]));
        });
    });
}
function writeSettings(settings) {
    chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}
function render(settings) {
    enabledInput.checked = settings.enabled;
    heightInput.value = String(settings.rulerHeight);
    dimInput.value = String(Math.round(settings.dimStrength * 100));
    heightValue.textContent = `${settings.rulerHeight}px`;
    dimValue.textContent = `${Math.round(settings.dimStrength * 100)}%`;
}
function currentSettingsFromUI() {
    return {
        enabled: enabledInput.checked,
        rulerHeight: clamp(Number(heightInput.value), MIN_RULER_HEIGHT, MAX_RULER_HEIGHT),
        dimStrength: clamp(Number(dimInput.value) / 100, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH),
    };
}
function persistFromUI() {
    const settings = currentSettingsFromUI();
    render(settings);
    writeSettings(settings);
}
enabledInput.addEventListener("change", persistFromUI);
heightInput.addEventListener("input", persistFromUI);
dimInput.addEventListener("input", persistFromUI);
resetButton.addEventListener("click", () => {
    render(DEFAULTS);
    writeSettings(DEFAULTS);
});
closeButton.addEventListener("click", () => {
    window.close();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        event.preventDefault();
        window.close();
    }
});
void (async () => {
    const settings = await readSettings();
    render(settings);
})();
//# sourceMappingURL=popup.js.map