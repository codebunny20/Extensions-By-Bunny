# Extensions-By-Bunny

This repository is my personal workspace for building and experimenting with **Web Extensions** (primarily Chromium-based: Chrome/Edge). Each folder contains a small extension focused on a single feature so I can iterate quickly while learning extension APIs, manifests, content scripts, and popups.

## What this repo is for

- A place where I **work on Web Extensions** and keep prototypes/mini-tools organized
- Small, focused extensions with minimal UI
- Quick toggles and simple behavior you can test on real webpages

## Included Extensions

### Magnifier Toggle

Adds a circular magnifying lens overlay to webpages. When enabled, the lens follows your cursor and zooms the area underneath it.

**Features**
- Toggleable magnifier overlay
- Cursor-follow magnification
- Quick exit via `Esc`

**How to use**
- Click the extension icon to enable/disable the magnifier on the current page
- Move your mouse to reposition the lens
- Press `Esc` to disable

**Notes**
- Some pages (browser internal pages / extension pages) block injection for security reasons.

---



### Reading Ruler

A reading aid that overlays a horizontal “reading window” on webpages. The page is dimmed while a highlighted band follows your cursor to help you keep your place.

**Features**
- Dims the page while highlighting a horizontal band
- Band follows the cursor for line-by-line reading
- Keyboard toggle for quick use

**How to use**
- Toggle on/off with `Ctrl + Shift + R`
- Move the mouse to reposition the band

**Notes**
- Keyboard shortcuts may conflict with site/browser shortcuts depending on environment.

### BunnyPad

### calculator

### misc

### reading ruler

### WideScroll


## Install (Load Unpacked)

1. Download or clone this repository.
2. Open your browser’s extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select an extension’s folder (each extension lives in its own directory).
6. Reload the extension after changes, and refresh the target tab.





## Development Notes

- These are manifest-based WebExtensions projects.
- Changes to content scripts/popup code require:
  - **Reload extension** (extensions page)
  - **Refresh the webpage** you’re testing on

## Permissions / Privacy

- Each extension only requests permissions needed for its functionality.
- No intentional data collection is included.

## Compatibility

- Target: Chromium browsers (Chrome/Edge).
- Firefox may work depending on manifest version and APIs used.