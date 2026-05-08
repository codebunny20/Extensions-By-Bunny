# Reading Ruler (Chrome Extension)

Reading Ruler adds a horizontal “reading window” that follows your mouse cursor. Everything outside the ruler is dimmed, helping you focus on the line you’re reading. The ruler area is subtly highlighted and slightly brightens the content underneath.

## What it does

- **Follows your mouse** vertically with a fixed horizontal band (“ruler”).
- **Dims the rest of the page** using a full-screen overlay with a cut-out where the ruler is.
- **Lets you adjust**:
  - Ruler height (thicker/thinner reading band)
  - Dim strength (darker/lighter surrounding area)
- Shows a small on-screen hint when enabled with the available shortcuts.

## How to use

## you can also find this extension on the crome web store just click the link here 👉 https://chromewebstore.google.com/detail/reading-ruler/pagchebmocafbblcgkoloijoagjmpagm

### 1) Install (Load unpacked)
1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select this folder:
   `c:\Users\Admin\OneDrive\Desktop\Extensions-By-Bunny\reading ruler`

### 2) Enable/Disable the ruler
- **Toggle on/off:** `Ctrl + Shift + R`

When enabled, move your mouse up/down to move the ruler.

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
- `content.js` — Creates the overlay + ruler, tracks mouse movement, and handles shortcuts
- `icons/16.png` — Extension icon