# Magnifier Toggle (MV3)

A minimal Manifest V3 browser extension that overlays a circular “magnifying glass” on the current page and lets you toggle it on/off from the extension’s toolbar icon.

It works by rendering a scaled “snapshot clone” of the page content inside a fixed, circular overlay and translating that clone so the area under your cursor appears magnified.

---

## Features

- **Toggle on/off** by clicking the extension **action (toolbar) icon**
- **Magnified circular lens** that follows the mouse
- **Adjustable zoom** (mouse wheel over lens, or keyboard)
- **Adjustable lens size** (keyboard)
- **Clamped to viewport** (lens won’t go off-screen)
- **Escape key** disables the magnifier
- Designed to **silently fail on restricted pages** (e.g. `chrome://`)

---

## How it works

When enabled, the content script creates:

- `#magnifier`: a fixed-position circular container (the “lens”)
- `#magnifier__clone`: a container holding a deep clone of the page’s `<body>`

The clone is then:

1. **Scaled up** (zoom factor, currently `2x`)
2. **Translated** (via negative margins) so the point under the cursor is centered in the lens

So instead of zooming the real page, it zooms a copied DOM view inside the overlay.

---

## File-by-file explanation

### `manifest.json`

- Declares **MV3**
- Registers:
  - a **service worker** background script (`background.js`)
  - a **content script** (`content.js`) + **CSS** (`magnify.css`) on `<all_urls>`

Key points:
- Uses `"permissions": ["activeTab", "scripting"]` so the background can inject a small function into the active tab when you click the icon.
- Content script runs at `"document_idle"`.

---

### `background.js` (service worker)

Listens for toolbar icon clicks:

- `chrome.action.onClicked.addListener(...)`

When clicked, it runs `chrome.scripting.executeScript()` in the current tab and calls:

- `globalThis.__magnifierToggle?.();`

That function is defined by the content script (see below). The optional chaining (`?.`) means:
- If the content script function exists → toggle
- If it doesn’t (or the page blocks injection) → do nothing

Errors are caught and ignored to avoid noisy failures on restricted/internal pages.

---

### `content.js` (page logic)

This file controls the lifecycle of the magnifier: create, update, destroy.

**State**
- `magnifierEnabled`: whether it’s supposed to be on
- `magnifier`: the overlay element (`#magnifier`)
- `viewportClone`: the cloned content container (`#magnifier__clone`)
- `lastMouseEvent`: used to position immediately after enabling

**Enable flow (`enableMagnifier`)**
- Creates `#magnifier`
- Creates `#magnifier__clone`
- Clones the page:
  - `document.body.cloneNode(true)` (preferred)
  - falls back to cloning `document.documentElement` if needed
- Appends the overlay to the page
- Registers listeners:
  - `mousemove` → `moveMagnifier`
  - `scroll`/`resize` → `syncMagnifier`
  - `keydown` → `onKeyDown` (Escape to close)
- Calls `syncMagnifier()` and positions if `lastMouseEvent` exists

**Disable flow (`disableMagnifier`)**
- Removes the overlay
- Clears refs
- Removes event listeners

**Magnification math (`moveMagnifier`)**
- Computes the lens center based on mouse `clientX/clientY`
- Clamps lens so it stays fully inside the viewport
- Converts cursor position to page coordinates:
  - `pageX = clientX + scrollX`
  - `pageY = clientY + scrollY`
- Offsets the clone using negative margins:
  - `offsetX = -(pageX * zoom - halfW)`
  - `offsetY = -(pageY * zoom - halfH)`
This makes the zoomed clone appear to “track” the pointer.

**Zoom**
- `getZoom()` currently returns `2`

**Toggle entry point**
At the end of the file:

- `globalThis.__magnifierToggle = () => { ... }`

This is what `background.js` calls via `executeScript()` on icon click. It avoids needing a popup or message passing to perform the toggle.

> Note: there’s also an `onMessage` listener for `toggleMagnifier`, but the current implementation primarily toggles via `globalThis.__magnifierToggle`.

---

### `magnify.css` (lens styling)

Defines the circular overlay:

- `#magnifier`
  - `position: fixed`
  - `width/height: 150px`
  - `border-radius: 50%` (circle)
  - `pointer-events: none` (doesn’t block clicks on the page)
  - very high `z-index`

And the clone container:

- `#magnifier__clone`
  - positioned at top-left inside the lens
  - uses `will-change` hints for smoother updates

---

### `popup.js`

Not used (“Popup disabled”). There is no popup UI; toggling happens via toolbar click.

---

## Usage

1. Load the extension as an unpacked extension:
   - Browser extensions page → **Developer mode** → **Load unpacked**
   - Select the folder: `magnifier-toggle`
2. Navigate to any normal webpage.
3. Click the extension’s toolbar icon to toggle the lens.
4. Press **Escape** to disable.

### Controls (while enabled)

- **Mouse wheel over the lens**: zoom in/out  
  - Hold **Shift** to adjust faster
- **Keyboard**:
  - `+` / `-`: zoom in/out
  - `[` / `]`: decrease/increase lens size
  - `R`: refresh the cloned snapshot (helps on dynamic pages)
  - `Esc`: disable

---

## Limitations / Notes

- Some pages **block content scripts and/or injection** (internal browser pages, extension stores). On those pages, clicking the icon will do nothing (by design).
- The magnifier shows a **cloned snapshot of the DOM**, not a true optical zoom:
  - dynamic content may not perfectly match after it changes
  - embedded video/canvas/etc. may not render as expected inside the clone
- Zoom is **adjustable** while enabled (wheel or `+`/`-`).

---

## Customization

- **Lens size**: change `#magnifier { width/height: 150px; }` in `magnify.css`
- **Zoom**: change `getZoom()` in `content.js`
- **Border/background**: adjust `#magnifier` styles (border color, thickness, background)

---

## Troubleshooting

- If it doesn’t work on a page:
  - Try a normal site (not `chrome://...`)
  - Ensure the extension is enabled
  - Check the Extensions page for errors (service worker logging)