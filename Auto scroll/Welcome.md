# Auto Scroll

Auto Scroll is a lightweight browser extension that automatically scrolls the current page at a speed and direction you choose.

It is built for long-form reading, documentation review, research, and any browsing session where repetitive manual scrolling gets in the way.

## Why Use It

- Reduce repetitive mouse wheel and trackpad input.
- Keep a steady reading rhythm on long pages.
- Pause, resume, or stop instantly when you need manual control.
- Keep your preferred settings saved between sessions.

## Features

- Adjustable scroll speed (1-20).
- Direction controls: up, down, left, and right.
- Pause and resume support.
- Stop control with optional hard reset behavior.
- Optional loop-at-end mode.
- Global enable/disable toggle.
- Keyboard shortcuts for quick control.

## Keyboard Shortcuts

Default shortcuts from the extension manifest:

- Start or stop auto-scroll: `Ctrl+Shift+S`
- Pause or resume auto-scroll: `Ctrl+Shift+X`
- Enable or disable extension globally: `Ctrl+Shift+E`

Note: Shortcut behavior can vary by browser and OS shortcut conflicts.

## Quick Start

1. Open any webpage.
2. Click the Auto Scroll extension icon.
3. Choose direction and speed.
4. Click a direction button to start scrolling.
5. Use Pause/Resume or Stop as needed.

## Settings

From the popup settings panel, you can configure:

- Loop at end: continue scrolling by looping when the page edge is reached.
- Hard reset on stop: reset scroll state more aggressively when stopping.
- Extension enabled: global on/off switch for all controls.

Settings are saved with browser local storage so your preferences persist.

## Permissions Explained

Auto Scroll requests only the permissions needed for core behavior:

- `activeTab`: target the tab you are currently using.
- `scripting`: inject scrolling logic when needed.
- `storage`: save your preferences (speed, direction, toggles).

## Privacy

Auto Scroll does not require an account to function.

A local privacy policy page is included at:

- `Privacy policy/privacy-policy.html`

## Known Limitations

- Auto-scroll is not available on some browser-restricted pages (for example internal `chrome://` pages).
- Some sites with custom scroll containers may behave differently than standard pages.
- Global or browser-level shortcut conflicts can prevent shortcuts from firing.

## Development

### Requirements

- Node.js (recommended current LTS)

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Type Check

```bash
npm run typecheck
```

## Load in Browser (Chromium)

1. Build the project (`npm run build`).
2. Open your browser extension page (for Chrome: `chrome://extensions`).
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this project folder.

## Project Structure

- `src/popup.ts`: popup UI logic and settings persistence.
- `src/scroll.ts`: content script that performs scrolling.
- `src/background.ts`: service worker for command handling and coordination.
- `popup.html`, `popup.css`: popup markup and styling.
- `manifest.json`: extension metadata, permissions, and commands.
- `dist/`: build output.

## Summary

Auto Scroll is designed to do one job: move pages at your pace with simple controls and reliable behavior.
