# Magnifier Toggle (MV3)

A minimal Manifest V3 browser extension that overlays a circular “magnifying lens” on the current page and lets you toggle it on/off from the extension’s toolbar icon.

It works by rendering a **scaled clone of the page DOM** inside a fixed, circular overlay and translating that clone so the area under your cursor appears magnified.

---

## Features

- **Toggle on/off** by clicking the extension **action (toolbar) icon**
- **Magnified circular lens** that follows the mouse
- **Clamped to viewport** (lens won’t go off-screen)
- **Escape key** disables the magnifier
- Smooth motion via `requestAnimationFrame` + interpolation
- Designed to **silently fail on restricted pages** (e.g. `chrome://`, Web Store)

---

## How it works

When enabled, the content script creates:

- `#magnifier`: a fixed-position circular container (the “lens”)
- `#magnifier__clone`: a container holding a deep clone of the page’s document (`document.documentElement`)

The clone is then:

1. **Scaled up** (fixed zoom factor)
2. **Translated** so the point under the cursor is centered in the lens

So instead of zooming the real page, it zooms a copied DOM view inside the overlay.

**Important limitation:** this is a DOM clone, not a true optical zoom. Some dynamic/interactive content (video/canvas, constantly updating UI) may not match perfectly.

---

## File-by-file explanation

### `manifest.json`

- Declares **MV3**
- Registers:
  - a **service worker** background script (`background.js`)
  - a **content script** (`content.js`) + **CSS** (`magnify.css`) on `<all_urls>`

Permissions used:
- `"activeTab"`: operate on the current tab when clicked
- `"scripting"`: inject CSS/JS as a fallback if the content script isn’t reachable
- `"tabs"`: used by background features (e.g. messaging/capture flow)
- `"host_permissions": ["<all_urls>"]`: allows running on normal pages (restricted pages still block by browser rules)

---

### `background.js` (service worker)

Listens for toolbar icon clicks:

- `chrome.action.onClicked.addListener(...)`

Toggle flow (important):
1. **Try `chrome.tabs.sendMessage` first** (`{ action: "toggleMagnifier" }`)
   - This works when the content script is already present.
2. If messaging fails, **inject `magnify.css` + `content.js`**, then send the toggle message again.
3. Any failures are **caught and ignored** so restricted/internal pages fail silently.

Also includes a message handler for:
- `action: "magnifier:capture"` → uses `chrome.tabs.captureVisibleTab`
  - This would allow “real pixels” snapshots (video/canvas/etc), but the current `content.js` does **not** request captures yet.

---

### `content.js` (page logic)

Controls the lifecycle of the magnifier: create, update, destroy.

**State**
- `magnifierEnabled`: whether it’s on
- `magnifier`: the overlay element (`#magnifier`)
- `viewportClone`: the cloned content container (`#magnifier__clone`)
- `lastMouse`: used for initial positioning

**Enable flow (`enableMagnifier`)**
- Creates `#magnifier`
- Creates `#magnifier__clone`
- Appends them to the page
- Builds the initial clone via `syncClone()` (clones `document.documentElement`)
- Registers listeners:
  - `mousemove` → updates target position
  - `scroll`/`resize` → rebuilds the clone (`syncClone()`)
  - `keydown` → Escape to close
- Starts a `requestAnimationFrame` loop to render smoothly

**Disable flow (`disableMagnifier`)**
- Removes event listeners
- Stops the rAF render loop
- Removes the overlay and clears references

**Magnification math (`renderTick`)**
- Smoothly interpolates cursor movement (`FOLLOW`)
- Clamps the lens center inside the viewport
- Converts cursor position to page coordinates:
  - `pageX = clientX + scrollX`
  - `pageY = clientY + scrollY`
- Transforms the clone:
  - `translate(-(pageX * ZOOM - half), -(pageY * ZOOM - half)) scale(ZOOM)`

This makes the zoomed clone appear to “track” the pointer.

**Toggle entry point**
- The page listens for runtime messages: `{ action: "toggleMagnifier" }`
- Additionally, `globalThis.__magnifierToggle` exists, but the current background script primarily toggles via messaging.

---

### `magnify.css` (lens styling)

Defines the circular overlay:

- `#magnifier`
  - `position: fixed`
  - default `width/height: 180px`
  - `border-radius: 50%` (circle)
  - `pointer-events: none` (doesn’t block interaction with the page)
  - very high `z-index`
  - `transform: translate(-50%, -50%)` so left/top represent the lens center

And the clone container:

- `#magnifier__clone`
  - positioned at top-left inside the lens
  - uses transform hints for smoother updates
  - pointer events disabled for it and its subtree

---

## Usage

1. Load the extension as an unpacked extension:
   - Browser extensions page → **Developer mode** → **Load unpacked**
   - Select the folder: `magnifier-toggle`
2. Navigate to any normal webpage.
3. Click the extension’s toolbar icon to toggle the lens.
4. Press **Escape** to disable.

### Controls (while enabled)

- **Mouse**: move to reposition the lens
- **Keyboard**:
  - `Esc`: disable

---

## Customization

In `content.js`:
- **Zoom**: `const ZOOM = 2;`
- **Lens size**: `const LENS_SIZE = 180;`

In `magnify.css`:
- **Border/background**: adjust `#magnifier` styles

Note: `magnify.css` also sets a default `width/height`, but the content script overrides it at runtime using `LENS_SIZE`.

---

## Troubleshooting

- If it doesn’t work on a page:
  - Try a normal site (not `chrome://...`)
  - Some pages block extensions by design (internal pages / stores)
  - Check the Extensions page for service worker errors

---

## Please Note

I’m still learning and I’m going to keep fixing bugs as I find them.