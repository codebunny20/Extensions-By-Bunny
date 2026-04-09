// this is where i will test the line reader functionality, which is a feature that allows users to read one line of text at a time by dimming the rest of the page and highlighting a single line as they move their mouse.
// This can help improve focus and reduce distractions while reading long articles or documents.
//  The code will create an overlay that darkens the page and a ruler that follows the mouse cursor, creating a "window" effect that highlights only the line of text under the cursor.
//  The feature can be toggled on and off with a keyboard shortcut (Ctrl+Shift+R).


// Create the overlay that darkens the page
const readingOverlay = document.createElement('div');
readingOverlay.style.position = 'fixed';
readingOverlay.style.top = '0';
readingOverlay.style.left = '0';
readingOverlay.style.width = '100%';
readingOverlay.style.height = '100%';
readingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'; // dim rest of page
readingOverlay.style.pointerEvents = 'none';
readingOverlay.style.zIndex = '9998';
readingOverlay.style.display = 'none';
document.body.appendChild(readingOverlay);

// Create the ruler area (for clip path calculations)
const readingRuler = document.createElement('div');
const rulerHeight = 32; // px height of reading window; tweak for preference
readingRuler.style.position = 'fixed';
readingRuler.style.left = '0';
readingRuler.style.width = '100%';
readingRuler.style.height = rulerHeight + 'px';
readingRuler.style.backgroundColor = 'rgba(15, 208, 195, 0.15)'; // subtle highlight
readingRuler.style.pointerEvents = 'none';
readingRuler.style.zIndex = '9999';
readingRuler.style.display = 'none';
document.body.appendChild(readingRuler);

let rulerEnabled = false;

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

document.addEventListener('mousemove', (e) => {
  if (!rulerEnabled) return;

  const y = e.clientY;
  readingRuler.style.top = `${y - rulerHeight / 2}px`;
  updateOverlayClip(y);
});

// Also adjust on scroll/resize so the "window" stays aligned
window.addEventListener('scroll', () => {
  // Do nothing special here; clientY is relative to viewport,
  // so alignment is handled on the next mousemove.
});

window.addEventListener('resize', () => {
  // Recalculate clip when window size changes
  if (!rulerEnabled) return;
  // Force a small update using last known top
  const top = parseFloat(readingRuler.style.top || '0') + rulerHeight / 2;
  updateOverlayClip(top);
});

// Toggle with Ctrl+Shift+R
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    rulerEnabled = !rulerEnabled;
    readingRuler.style.display = rulerEnabled ? 'block' : 'none';
    readingOverlay.style.display = rulerEnabled ? 'block' : 'none';
  }
});
