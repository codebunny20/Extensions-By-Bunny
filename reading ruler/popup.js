const SETTINGS_KEY = 'readingRulerSettings';
const DEFAULTS = {
  enabled: false,
  rulerHeight: 32,
  dimStrength: 0.4,
};

const MIN_RULER_HEIGHT = 8;
const MAX_RULER_HEIGHT = 240;

const enabledInput = document.getElementById('enabled');
const heightInput = document.getElementById('height');
const dimInput = document.getElementById('dim');
const heightValue = document.getElementById('heightValue');
const dimValue = document.getElementById('dimValue');
const resetButton = document.getElementById('resetBtn');
const closeButton = document.getElementById('closeBtn');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      const saved = result[SETTINGS_KEY] || {};
      resolve({
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : DEFAULTS.enabled,
        rulerHeight:
          typeof saved.rulerHeight === 'number'
            ? clamp(saved.rulerHeight, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT)
            : DEFAULTS.rulerHeight,
        dimStrength:
          typeof saved.dimStrength === 'number'
            ? clamp(saved.dimStrength, 0.05, 0.95)
            : DEFAULTS.dimStrength,
      });
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
  heightValue.textContent = settings.rulerHeight + 'px';
  dimValue.textContent = Math.round(settings.dimStrength * 100) + '%';
}

function currentSettingsFromUI() {
  return {
    enabled: enabledInput.checked,
    rulerHeight: clamp(Number(heightInput.value), MIN_RULER_HEIGHT, MAX_RULER_HEIGHT),
    dimStrength: clamp(Number(dimInput.value) / 100, 0.05, 0.95),
  };
}

function persistFromUI() {
  const settings = currentSettingsFromUI();
  render(settings);
  writeSettings(settings);
}

enabledInput.addEventListener('change', persistFromUI);
heightInput.addEventListener('input', persistFromUI);
dimInput.addEventListener('input', persistFromUI);

resetButton.addEventListener('click', () => {
  render(DEFAULTS);
  writeSettings(DEFAULTS);
});

closeButton.addEventListener('click', () => {
  window.close();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    window.close();
  }
});

(async () => {
  const settings = await readSettings();
  render(settings);
})();
