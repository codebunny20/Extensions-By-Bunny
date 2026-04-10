# Extensions-By-Bunny

A small collection of lightweight browser extensions I built while learning Web Extension development. Each extension focuses on one core feature, keeps UI minimal, and aims to be easy to toggle on/off per page.

## Included Extensions

### Magnifier Toggle

A lightweight extension that adds an on-page magnifying lens you can toggle on/off from the toolbar. When enabled, a circular magnifier follows your cursor and zooms the area underneath it for easier reading and close inspection.

**Features**
- Toggleable circular magnifier overlay
- Cursor-follow magnification for quick inspection
- Quick exit via `Esc`

**How to use**
- Click the extension icon to enable/disable the magnifier on the current page
- Move the mouse to reposition the lens
- Press `Esc` to disable immediately

**Notes**
- Some pages (e.g., internal browser pages / extension pages) may block injection for security reasons.

### Mouse Pointer Color

An extension that lets you change the mouse cursor color on websites by applying a custom (colored) SVG cursor. Use the popup to enable/disable the cursor, pick a color, and apply it to the current tab. Settings are saved with Chrome Sync storage so they persist across pages and sessions.

**Features**
- Custom colored cursor via SVG
- Popup UI to enable/disable and pick a color
- Persists settings via Sync storage (where supported)

**How to use**
- Open the extension popup
- Enable the custom cursor
- Pick a color and apply to the active tab
- Disable from the popup to return to the default cursor

**Notes**
- Some sites may override cursor styles; results can vary depending on site CSS.
- Sync availability depends on the browser/profile (and sign-in state).

### Reading Ruler

A simple reading aid that overlays a horizontal “reading window” on any webpage to help you keep your place. It dims the page and highlights a single band that follows your cursor.

**Features**
- Dims the page while highlighting a horizontal reading band
- Band follows the cursor to guide line-by-line reading
- Keyboard toggle for quick use

**How to use**
- Toggle on/off with `Ctrl + Shift + R`
- Move the mouse to reposition the highlighted band

**Notes**
- Keyboard shortcuts may conflict with existing site/browser shortcuts depending on environment.

### TTS Tool

A simple text-to-speech popup that speaks the **currently selected text** on the active page. Includes basic voice selection and rate control.

**Features**
- Speaks selected text from the active tab
- Voice dropdown (uses available system/browser voices)
- Rate control slider
- Stop/cancel button

**How to use**
- Select text on a webpage
- Open the extension popup
- Choose a voice and rate (optional)
- Click **Speak Selection**
- Click **Stop** to cancel speech

**Notes**
- Voice availability and names depend on your OS/browser; the voice list may populate a moment after opening the popup.
- If nothing is selected, **Speak Selection** won’t do anything.

## Installation (Load Unpacked)

1. Clone or download this repository.
2. Open your browser’s extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extension’s folder (each extension typically has its own directory).
5. Pin the extension (optional) for easier access.

## Development Notes

- These are standard WebExtensions-style projects (manifest-driven).
- If you make changes to content scripts or popup code, reload the extension from the extensions page and refresh the target tab.

## Permissions / Privacy

- Each extension requests only the permissions needed for its feature set (e.g., to inject UI into pages, store settings, or run on the active tab).
- No intentional data collection is included.

## Compatibility

- Designed for Chromium-based browsers (Chrome/Edge).
- Firefox may work depending on manifest version and APIs used.