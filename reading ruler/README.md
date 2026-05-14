# Reading Ruler (Chrome Extension)

Reading Ruler adds a horizontal “reading window” that follows your mouse cursor. Everything outside the ruler is dimmed, helping you focus on the line you’re reading. The ruler area is subtly highlighted and slightly brightens the content underneath.

This is the **v1.1 UI rework** with a simple extension popup for controls.

## What it does

- **Follows your mouse** vertically with a fixed horizontal band (“ruler”).
- **Dims the rest of the page** using a full-screen overlay with a cut-out where the ruler is.
- **Lets you adjust**:
  - Ruler height (thicker/thinner reading band)
  - Dim strength (darker/lighter surrounding area)
- **Popup UI controls** from the extension button.
- **Remembers your settings** (ruler height and dim strength) between reloads.
- Applies changes live across open tabs via synced settings.

## How to use

You can also find this extension on the Chrome Web Store:
https://chromewebstore.google.com/detail/reading-ruler/pagchebmocafbblcgkoloijoagjmpagm

### 1) 
https://github.com/codebunny20/Extensions-By-Bunny

### 2) Enable/Disable the ruler
- Click the extension icon to open the popup.
- Use **Enable ruler** to turn it on/off.

When enabled, move your mouse up/down to move the ruler.

### 3) Adjust settings in popup
- Use **Ruler height** slider.
- Use **Dim strength** slider.
- Click **Reset** to go back to defaults.
- Press **Esc** (or **Close**) to close popup.

## Keyboard shortcuts

When the ruler is enabled:

### Adjust ruler height
- **Increase height:** `Ctrl + Shift + ↑`
- **Decrease height:** `Ctrl + Shift + ↓`

### Adjust dim strength
- **Darker background (more dim):** `Ctrl + Shift + ←`
- **Lighter background (less dim):** `Ctrl + Shift + →`

## Notes / behavior
- Works on all sites (`<all_urls>`) as a content script.
- The overlay doesn’t block clicks because it uses `pointer-events: none`.
- Default settings:
  - Dim strength: `0.4` (40%)
  - Ruler height: `32px`
  - Starts **disabled** until you toggle it on.

## Files
- `manifest.json` — Chrome extension manifest (MV3)
- `content.js` — Overlay + ruler logic, storage sync, and shortcuts
- `popup.html` — Popup UI layout
- `popup.css` — Popup styling
- `popup.js` — Popup logic (save/reset/close)
- `icons/16.png` — Extension icon