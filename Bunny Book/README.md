# Bunny Book

**Bunny Book** is a cozy, lightweight browser extension that acts like a small multi-note notepad inside your toolbar. It lets you create, search, edit, delete, and export notes. Notes are saved to your browser using extension storage (no accounts, no syncing logic in this project).

## What it does

- Creates and stores multiple notes (title + body)
- Shows a searchable list of notes
- Opens any note for editing
- Autosaves edits shortly after you type
- Manually saves with a **Save** button or keyboard shortcut
- Deletes notes (with confirmation)
- Exports the current note as a `.txt` file

Notes are stored locally via the browser extension storage API (`chrome.storage.local`) and persist between browser restarts.

## How to use

1. **Install / Load unpacked**
   - Go to your browser’s extensions page (Chrome: `chrome://extensions`, Edge: `edge://extensions`)
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `Bunny Book/` folder (the folder containing `manifest.json`)

2. **Open Bunny Book**
   - Click the Bunny Book extension icon to open the popup.

3. **Create a note**
   - Click **New** (top right), or **Create a note** on the empty state.

4. **Edit**
   - Type a **Title** and **Body**
   - Bunny Book **autosaves** after a short pause while typing.
   - Click **Save** to save immediately.

5. **Search**
   - In the list view, type in the **Search notes…** box to filter notes by title or body text.

6. **Export**
   - Open a note, then click **Export** to download a `.txt` file of the note body.

7. **Delete**
   - Open a note and click **Delete**. You’ll be asked to confirm.

## Keyboard shortcuts

- **Ctrl + S** (Windows/Linux) / **Cmd + S** (macOS): Save the current note
- **Esc**: Return to the notes list (when editing)

## Notes / behavior details

- Autosave only runs for an existing note (after you create one with **New**).  
- Timestamps shown in the list reflect the note’s last update time.
- Export uses a safe filename derived from the note title (invalid filename characters are replaced).

## Files

- UI: [popup.html](popup.html), [popup.css](popup.css)
- Logic / storage: [popup.js](popup.js)
- Extension metadata: [manifest.json](manifest.json)