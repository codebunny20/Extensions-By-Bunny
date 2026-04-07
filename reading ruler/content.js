const readingRuler = document.createElement('div');
readingRuler.style.position = 'fixed';
readingRuler.style.left = '0';
readingRuler.style.width = '100%';
readingRuler.style.height = '2em';
readingRuler.style.backgroundColor = 'rgba(15, 208, 195, 0.3)';
readingRuler.style.pointerEvents = 'none';
readingRuler.style.zIndex = '9999';
document.body.appendChild(readingRuler);

let rulerEnabled = false;

document.addEventListener('mousemove', (e) => {
  if (!rulerEnabled) return;
  readingRuler.style.top = `${e.clientY - readingRuler.offsetHeight / 2}px`;
});

// Toggle with Ctrl+Shift+R
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    rulerEnabled = !rulerEnabled;
    readingRuler.style.display = rulerEnabled ? 'block' : 'none';
  }
});