# Opera Magnifying Glass Extension

A simple Opera browser extension that overlays a magnifying glass on the current page, allowing users to zoom in on specific areas by following the mouse cursor.

## Features

- **Toggle on/off** by clicking the extension icon.
- **Magnified circular lens** that follows the mouse.
- **Clamped to viewport** (lens won’t go off-screen).
- **Escape key** disables the magnifier.

## How it Works

When enabled, the content script creates a circular overlay that follows the mouse cursor and displays a zoomed-in view of the area under the cursor.

## File Structure

```
opera-magnifying-glass
├── src
│   ├── background.js        # Background script for handling icon clicks
│   ├── content.js          # Logic for the magnifying glass functionality
│   └── magnifier.css       # Styles for the magnifier overlay
├── manifest.json           # Configuration file for the Opera extension
└── README.md               # Documentation for the project
```

## Installation

1. Download or clone the repository.
2. Open the Opera browser and navigate to the extensions page (opera://extensions).
3. Enable "Developer mode" (toggle in the top right).
4. Click on "Load unpacked" and select the `opera-magnifying-glass` directory.

## Usage

1. Navigate to any webpage.
2. Click the extension’s icon to toggle the magnifier on or off.
3. Move your mouse to reposition the lens.
4. Press **Escape** to disable the magnifier.

## Limitations

- Some pages may block content scripts and/or injection (e.g., internal browser pages). On those pages, clicking the icon will do nothing.

## Customization

- You can adjust the lens size and zoom level by modifying the values in `src/content.js`.
- Change the appearance of the magnifier by editing the styles in `src/magnifier.css`.

## Troubleshooting

- If the extension does not work on a page, ensure that it is enabled and check for any errors in the extensions page.