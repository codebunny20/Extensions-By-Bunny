# Extensions-By-Bunny

This repository is my personal workspace for building and experimenting with **Web Extensions** (primarily Chromium-based: Chrome/Edge). Each folder contains a small extension focused on a single feature so I can iterate quickly while learning extension APIs, manifests, content scripts, and popups.

## Latest Update (Fixes, Patches, and Features)

- Root documentation refreshed to match what is currently implemented.
- **Bunny Book**: speech-to-text note input, centralized storage error handling, and safer editor/list state handling.
- **Bunny Mathbox**: expanded to a multi-tool popup (calculator, unit converter, ratio, Ohm's Law, resistor helper).
- **Magnify**: updated popup controls for live lens size/zoom tuning, sync-backed settings, and on-demand script injection flow.
- **Reading Ruler**: v1.1-style control popup, synced settings, smoother rendering, and quick keyboard adjustments.

## What this repo is for

- A place where I **work on Web Extensions** and keep prototypes/mini-tools organized
- Small, focused extensions with minimal UI
- Quick toggles and simple behavior you can test on real webpages

## Included Extensions

### Bunny Book

A cozy multi-note notepad extension for creating, editing, searching, exporting, and dictating notes.

**Features**
- Multi-note list with search and timestamped updates
- Autosave while typing + manual save shortcut (`Ctrl+S` / `Cmd+S`)
- Export note body as `.txt`
- Delete confirmation flow
- Built-in microphone button for voice-to-text dictation (when supported)

**Recent fixes/patches**
- Removed duplicate/overlapping editor logic to avoid event-listener conflicts
- Centralized `chrome.storage.local` access with Promise wrappers for cleaner runtime error handling
- Improved editor lifecycle so voice recognition stops cleanly when leaving the note editor

---

### Bunny Mathbox

All-in-one utility popup with practical calculation and conversion tools.

**Features**
- Standard calculator with operator precedence and decimal guardrails
- Unit converter with multiple categories (length, mass, temperature, time, data, speed, area, volume, pressure, energy, power)
- Ratio calculator (simplified ratio + equivalent value solving)
- Ohm's Law helper (solve missing values from known inputs)
- Resistor helper (drop resistor + power/rating guidance)

**Recent fixes/patches**
- Added structured validation/error messages for invalid or incomplete inputs
- Improved result formatting and practical output guidance in advanced tools

---

### Magnify

Adds a circular magnifying lens overlay to webpages. When enabled, the lens follows your cursor and zooms the area underneath it.

**Features**
- Toggle lens on the active tab
- Cursor-follow magnification with smooth tracking
- Adjustable zoom and lens size from popup sliders
- `Esc` closes the lens quickly

**Recent fixes/patches**
- Moved to on-demand content-script injection for cleaner startup behavior
- Added sync-backed settings with normalization/clamping for safer values
- Improved restricted-page handling to fail gracefully when injection is blocked

**How to use**
- Click the extension icon to enable/disable the magnifier on the current page
- Adjust zoom/lens size in the popup as needed
- Move your mouse to reposition the lens
- Press `Esc` to disable

**Notes**
- Some pages (browser internal pages / extension pages) block injection for security reasons.

---

### Reading Ruler

A reading aid that overlays a horizontal “reading window” on webpages. The page is dimmed while a highlighted band follows your cursor to help you keep your place.

**Features**
- Dims the page while highlighting a horizontal band
- Band follows the cursor with smoother rendering updates
- Popup controls for enable/disable, ruler height, and dim strength
- Sync-backed settings applied live across tabs
- Keyboard shortcuts for toggling and quick adjustments

**Recent fixes/patches**
- Added duplicate-injection guard for safer content script behavior
- Added clamped settings ranges to prevent invalid values
- Improved live update behavior when settings change

**How to use**
- Toggle via popup or `Ctrl + Shift + R`
- Move the mouse to reposition the band
- Use `Ctrl + Shift + ↑/↓` for ruler height and `Ctrl + Shift + ←/→` for dim strength

**Notes**
- Keyboard shortcuts may conflict with site/browser shortcuts depending on environment.

---

## Planned / Experimental

- BunnyPad
- misc
- WideScroll


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