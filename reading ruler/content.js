if (window.__readingRulerInjected) {
  // Avoid duplicate injection on same page lifecycle.
} else {
  window.__readingRulerInjected = true;

  const SETTINGS_KEY = 'readingRulerSettings';
  const DEFAULTS = {
    enabled: false,
    rulerHeight: 32,
    dimStrength: 0.4,
  };

  const MIN_RULER_HEIGHT = 8;
  const MAX_RULER_HEIGHT = 240;
  const MIN_DIM_STRENGTH = 0.05;
  const MAX_DIM_STRENGTH = 0.95;

  let rulerEnabled = DEFAULTS.enabled;
  let rulerHeight = DEFAULTS.rulerHeight;
  let dimStrength = DEFAULTS.dimStrength;
  let lastYCenter = Math.round(window.innerHeight / 2);
  let animationFrameId = 0;

  const readingOverlay = document.createElement('div');
  readingOverlay.style.transition = 'background-color 0.15s ease';
  readingOverlay.style.position = 'fixed';
  readingOverlay.style.top = '0';
  readingOverlay.style.left = '0';
  readingOverlay.style.width = '100%';
  readingOverlay.style.height = '100%';
  readingOverlay.style.pointerEvents = 'none';
  readingOverlay.style.zIndex = '9998';
  readingOverlay.style.display = 'none';
  document.body.appendChild(readingOverlay);

  const readingRuler = document.createElement('div');
  readingRuler.style.position = 'fixed';
  readingRuler.style.left = '0';
  readingRuler.style.width = '100%';
  readingRuler.style.pointerEvents = 'none';
  readingRuler.style.zIndex = '9999';
  readingRuler.style.display = 'none';
  readingRuler.style.backgroundColor = 'rgba(228, 239, 238, 0.15)';
  document.body.appendChild(readingRuler);

  const brightenLayer = document.createElement('div');
  brightenLayer.style.position = 'absolute';
  brightenLayer.style.top = '0';
  brightenLayer.style.left = '0';
  brightenLayer.style.width = '100%';
  brightenLayer.style.height = '100%';
  brightenLayer.style.pointerEvents = 'none';

  const supportsBackdropFilter =
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'brightness(1.5)') ||
      CSS.supports('-webkit-backdrop-filter', 'brightness(1.5)'));

  if (supportsBackdropFilter) {
    brightenLayer.style.backdropFilter = 'brightness(1.5)';
    brightenLayer.style.webkitBackdropFilter = 'brightness(1.5)';
  } else {
    brightenLayer.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
  }

  readingRuler.appendChild(brightenLayer);

  const hintPopup = document.createElement('div');
  hintPopup.style.position = 'fixed';
  hintPopup.style.bottom = '20px';
  hintPopup.style.left = '20px';
  hintPopup.style.padding = '8px 12px';
  hintPopup.style.background = 'rgba(0,0,0,0.75)';
  hintPopup.style.color = 'white';
  hintPopup.style.fontSize = '12px';
  hintPopup.style.borderRadius = '6px';
  hintPopup.style.zIndex = '10000';
  hintPopup.style.opacity = '0';
  hintPopup.style.transition = 'opacity 0.25s ease';
  hintPopup.style.pointerEvents = 'none';
  document.body.appendChild(hintPopup);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function showHint(text) {
    hintPopup.textContent = text;
    hintPopup.style.opacity = '1';

    clearTimeout(showHint._timer);
    showHint._timer = setTimeout(() => {
      hintPopup.style.opacity = '0';
    }, 2000);
  }

  function updateOverlayClip(yCenter) {
    const top = yCenter - rulerHeight / 2;
    const bottom = yCenter + rulerHeight / 2;
    const vh = window.innerHeight;

    readingOverlay.style.clipPath = `polygon(
      0px 0px,
      100% 0px,
      100% ${top}px,
      0px ${top}px,
      0px ${bottom}px,
      100% ${bottom}px,
      100% ${vh}px,
      0px ${vh}px
    )`;
  }

  function renderOverlayStyle() {
    readingOverlay.style.backgroundColor = `rgba(0, 0, 0, ${dimStrength})`;
    readingRuler.style.height = rulerHeight + 'px';
  }

  function renderRulerPosition() {
    animationFrameId = 0;
    readingRuler.style.top = `${lastYCenter - rulerHeight / 2}px`;
    updateOverlayClip(lastYCenter);
  }

  function scheduleRulerRender() {
    if (animationFrameId !== 0) return;
    animationFrameId = requestAnimationFrame(renderRulerPosition);
  }

  function setEnabled(on) {
    rulerEnabled = !!on;
    readingRuler.style.display = rulerEnabled ? 'block' : 'none';
    readingOverlay.style.display = rulerEnabled ? 'block' : 'none';

    if (rulerEnabled) {
      scheduleRulerRender();
    }
  }

  function applySettings(nextSettings) {
    const safe = {
      enabled:
        typeof nextSettings.enabled === 'boolean' ? nextSettings.enabled : DEFAULTS.enabled,
      rulerHeight:
        typeof nextSettings.rulerHeight === 'number'
          ? clamp(nextSettings.rulerHeight, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT)
          : DEFAULTS.rulerHeight,
      dimStrength:
        typeof nextSettings.dimStrength === 'number'
          ? clamp(nextSettings.dimStrength, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH)
          : DEFAULTS.dimStrength,
    };

    rulerHeight = safe.rulerHeight;
    dimStrength = safe.dimStrength;
    renderOverlayStyle();
    setEnabled(safe.enabled);
  }

  function loadInitialSettings() {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      applySettings(result[SETTINGS_KEY] || DEFAULTS);
    });
  }

  function persistCurrentSettings() {
    chrome.storage.sync.set({
      [SETTINGS_KEY]: {
        enabled: rulerEnabled,
        rulerHeight,
        dimStrength,
      },
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[SETTINGS_KEY]) return;
    const next = changes[SETTINGS_KEY].newValue || DEFAULTS;
    applySettings(next);
  });

  document.addEventListener('mousemove', (e) => {
    if (!rulerEnabled) return;
    lastYCenter = e.clientY;
    scheduleRulerRender();
  });

  window.addEventListener('resize', () => {
    if (!rulerEnabled) return;
    scheduleRulerRender();
  });

  // Keep keyboard controls as a quick-access alternative.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey)) return;

    const key = e.key.toLowerCase();

    if (key === 'r') {
      setEnabled(!rulerEnabled);
      persistCurrentSettings();
      showHint(rulerEnabled ? 'Reading Ruler on' : 'Reading Ruler off');
      return;
    }

    if (!rulerEnabled) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      rulerHeight = clamp(rulerHeight + 4, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT);
      renderOverlayStyle();
      scheduleRulerRender();
      persistCurrentSettings();
      showHint('Height: ' + rulerHeight + 'px');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      rulerHeight = clamp(rulerHeight - 4, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT);
      renderOverlayStyle();
      scheduleRulerRender();
      persistCurrentSettings();
      showHint('Height: ' + rulerHeight + 'px');
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      dimStrength = clamp(dimStrength + 0.05, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH);
      renderOverlayStyle();
      persistCurrentSettings();
      showHint('Dim: ' + Math.round(dimStrength * 100) + '%');
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      dimStrength = clamp(dimStrength - 0.05, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH);
      renderOverlayStyle();
      persistCurrentSettings();
      showHint('Dim: ' + Math.round(dimStrength * 100) + '%');
    }
  });

  renderOverlayStyle();
  loadInitialSettings();
}