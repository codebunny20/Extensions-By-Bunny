# Sticky Notes Anywhere (MV3)

A minimal Manifest V3 browser extension that lets you place **draggable sticky notes** on any webpage and keeps them persisted via `chrome.storage.local`.

## Features

- Add a note from the popup
- Drag notes around (via the note header)
- Edit note text in-place
- Delete individual notes
- Clear all notes
- Notes persist across reloads for the same browser profile

## Files

- `sticky-note-tool/pop.html` + `sticky-note-tool/popup.js`: extension popup UI
- `sticky-note-tool/content.js`: creates/loads/saves notes on pages
- `sticky-note-tool/notes.css`: note styling
- `sticky-note-tool/manifest.json`: MV3 manifest

## Usage

1. Load the `sticky-note-tool` folder as an unpacked extension.
2. Open any normal webpage.
3. Click the extension icon to open the popup.
4. Use **Add Note** / **Clear All Notes**.

## Notes

- Notes are injected by a content script (`matches: <all_urls>`). Restricted pages (e.g. `chrome://`) won’t allow injection by browser rules.