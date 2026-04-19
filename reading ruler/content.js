let dimStrength = 0.4; // overlay dim strength (0.05..0.95)
let rulerHeight = 32;  // px height of reading window
let rulerEnabled = false;
let lastYCenter = Math.round(window.innerHeight / 2);

// Create the overlay that darkens the page
const readingOverlay = document.createElement('div');
readingOverlay.style.transition = 'background-color 0.15s ease';
readingOverlay.style.position = 'fixed';
readingOverlay.style.top = '0';
readingOverlay.style.left = '0';
readingOverlay.style.width = '100%';
readingOverlay.style.height = '100%';
readingOverlay.style.backgroundColor = `rgba(0, 0, 0, ${dimStrength})`;
readingOverlay.style.pointerEvents = 'none';
readingOverlay.style.zIndex = '9998';
readingOverlay.style.display = 'none';
document.body.appendChild(readingOverlay);

// Create the ruler area (for clip path calculations)
const readingRuler = document.createElement('div');
readingRuler.style.position = 'fixed';
readingRuler.style.left = '0';
readingRuler.style.width = '100%';
readingRuler.style.height = rulerHeight + 'px';
readingRuler.style.backgroundColor = 'rgba(228, 239, 238, 0.15)'; // subtle highlight
readingRuler.style.pointerEvents = 'none';
readingRuler.style.zIndex = '9999';
readingRuler.style.display = 'none';
document.body.appendChild(readingRuler);

// Lighten text under the ruler
const brightenLayer = document.createElement('div');
brightenLayer.style.position = 'absolute';
brightenLayer.style.top = '0';
brightenLayer.style.left = '0';
brightenLayer.style.width = '100%';
brightenLayer.style.height = '100%';
brightenLayer.style.backdropFilter = 'brightness(1.5)';
brightenLayer.style.pointerEvents = 'none';
readingRuler.appendChild(brightenLayer);

// Small floating hint popup
const hintPopup = document.createElement('div');
hintPopup.style.position = 'fixed';
hintPopup.style.bottom = '20px';
hintPopup.style.right = '20px';
hintPopup.style.padding = '8px 12px';
hintPopup.style.background = 'rgba(0,0,0,0.75)';
hintPopup.style.color = 'white';
hintPopup.style.fontSize = '12px';
hintPopup.style.borderRadius = '6px';
hintPopup.style.zIndex = '10000';
hintPopup.style.opacity = '0';
hintPopup.style.transition = 'opacity 0.3s ease';
hintPopup.style.pointerEvents = 'none';
document.body.appendChild(hintPopup);

function showHint(text) {
  hintPopup.textContent = text;
  hintPopup.style.opacity = '1';

  clearTimeout(showHint._timer);
  showHint._timer = setTimeout(() => {
    hintPopup.style.opacity = '0';
  }, 10000);
}

function updateOverlayClip(yCenter) {
  const top = yCenter - rulerHeight / 2;
  const bottom = yCenter + rulerHeight / 2;
  const vh = window.innerHeight;

  // Create a rectangle "hole" where the ruler is
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

function updateRulerHeight(newHeight) {
  rulerHeight = newHeight;
  readingRuler.style.height = newHeight + 'px';
  readingRuler.style.top = `${lastYCenter - rulerHeight / 2}px`;
  updateOverlayClip(lastYCenter);
}

function updateDimStrength(newStrength) {
  dimStrength = Math.min(0.95, Math.max(0.05, newStrength)); // clamp between 5% and 95%
  readingOverlay.style.backgroundColor = `rgba(0, 0, 0, ${dimStrength})`;
}

function setEnabled(on) {
  rulerEnabled = on;
  readingRuler.style.display = rulerEnabled ? 'block' : 'none';
  readingOverlay.style.display = rulerEnabled ? 'block' : 'none';

  if (rulerEnabled) {
    readingRuler.style.top = `${lastYCenter - rulerHeight / 2}px`;
    updateOverlayClip(lastYCenter);
    showHint(
      'Height: Ctrl+Shift+Up/Down   •   Dim: Ctrl+Shift+Left/Right'
    );    
  }
}

document.addEventListener('mousemove', (e) => {
  if (!rulerEnabled) return;

  lastYCenter = e.clientY;
  readingRuler.style.top = `${lastYCenter - rulerHeight / 2}px`;
  updateOverlayClip(lastYCenter);
});

window.addEventListener('resize', () => {
  if (!rulerEnabled) return;
  updateOverlayClip(lastYCenter);
});

// Toggle with Ctrl+Shift+R
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    setEnabled(!rulerEnabled);
  }
});

// Adjustable ruler height: Ctrl+Shift+Up / Ctrl+Shift+Down
document.addEventListener('keydown', (e) => {
  if (!rulerEnabled) return;

  if (e.ctrlKey && e.shiftKey && e.key === 'ArrowUp') {
    const newHeight = rulerHeight + 4;
    updateRulerHeight(newHeight);
    showHint('Ruler height: ' + newHeight + 'px');
  }

  if (e.ctrlKey && e.shiftKey && e.key === 'ArrowDown') {
    const newHeight = Math.max(8, rulerHeight - 4);
    updateRulerHeight(newHeight);
    showHint('Ruler height: ' + newHeight + 'px');
  }
});

// Adjustable dim strength: Ctrl+Shift+Left (darker) / Ctrl+Shift+Right (lighter)
document.addEventListener('keydown', (e) => {
  if (!rulerEnabled) return;

  if (e.ctrlKey && e.shiftKey && e.key === 'ArrowLeft') {
    updateDimStrength(dimStrength + 0.05);
    showHint('Dim: ' + Math.round(dimStrength * 100) + '%');
  }

  if (e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
    updateDimStrength(dimStrength - 0.05);
    showHint('Dim: ' + Math.round(dimStrength * 100) + '%');
  }
});