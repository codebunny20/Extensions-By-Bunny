import type { Note } from "./types/Note";
import { getNotes, withStorageSet } from "./types/Storage";
import { VoiceController } from "./voice/VoiceController";

let currentId: number | null = null;
let autosaveTimer = 0;
let lastLoadedSnapshot = { title: "", body: "" };

const listView = document.getElementById("listView") as HTMLDivElement | null;
const editorView = document.getElementById("editorView") as HTMLDivElement | null;
const noteList = document.getElementById("noteList") as HTMLUListElement | null;
const emptyState = document.getElementById("emptyState") as HTMLDivElement | null;
const saveStatus = document.getElementById("saveStatus") as HTMLSpanElement | null;

const newNoteBtn = document.getElementById("newNote") as HTMLButtonElement | null;
const newNoteEmptyBtn = document.getElementById("newNoteEmpty") as HTMLButtonElement | null;
const saveBtn = document.getElementById("saveNote") as HTMLButtonElement | null;
const deleteBtn = document.getElementById("deleteNote") as HTMLButtonElement | null;
const exportBtn = document.getElementById("exportNote") as HTMLButtonElement | null;
const backBtn = document.getElementById("backToList") as HTMLButtonElement | null;
const micBtn = document.getElementById("micBtn") as HTMLButtonElement | null;

const titleInput = document.getElementById("titleInput") as HTMLInputElement | null;
const bodyInput = document.getElementById("bodyInput") as HTMLTextAreaElement | null;
const searchInput = document.getElementById("searchInput") as HTMLInputElement | null;

const voice = new VoiceController({
  onStatus: (message) => {
    if (isEditorVisible() || !message) {
      setStatus(message);
    }
  },
  onTranscript: (text) => {
    insertAtCursor(bodyInput, text);
    scheduleAutosave();
  },
  onListeningChange: (isListening) => {
    if (micBtn) {
      micBtn.textContent = isListening ? "Stop" : "Mic";
    }
  }
});

function isEditorVisible(): boolean {
  return !editorView?.classList.contains("hidden");
}

function setStatus(text: string): void {
  if (saveStatus) {
    saveStatus.textContent = text || "";
  }
}

function normalize(text: string): string {
  return String(text || "").toLowerCase();
}

function fmtTime(ts: number): string {
  if (!ts) {
    return "";
  }

  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function snapshotCurrent(): { title: string; body: string } {
  return {
    title: titleInput?.value.trim() || "",
    body: bodyInput?.value || ""
  };
}

function isDirty(): boolean {
  const snap = snapshotCurrent();
  return snap.title !== lastLoadedSnapshot.title || snap.body !== lastLoadedSnapshot.body;
}

async function loadNotes(): Promise<void> {
  if (!noteList || !emptyState) {
    return;
  }

  try {
    const notes = await getNotes();
    const q = normalize(searchInput?.value || "");

    const filtered = q
      ? notes.filter((n) => normalize(n.title).includes(q) || normalize(n.body).includes(q))
      : notes;

    noteList.innerHTML = "";
    emptyState.classList.toggle("hidden", notes.length !== 0);

    if (notes.length === 0) {
      return;
    }

    filtered
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((note) => {
        const li = document.createElement("li");
        li.className = "noteItem";
        li.setAttribute("role", "listitem");

        const top = document.createElement("div");
        top.className = "noteRowTop";

        const title = document.createElement("div");
        title.className = "noteTitle";
        title.textContent = note.title || "(untitled)";

        const meta = document.createElement("div");
        meta.className = "noteMeta";
        meta.textContent = fmtTime(note.updatedAt || note.createdAt);

        const preview = document.createElement("div");
        preview.className = "notePreview";
        preview.textContent = (note.body || "").replace(/\s+/g, " ").trim() || "No content";

        top.appendChild(title);
        top.appendChild(meta);
        li.appendChild(top);
        li.appendChild(preview);

        li.addEventListener("click", () => {
          void openNote(note.id);
        });

        noteList.appendChild(li);
      });

    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "noteItem";

      const title = document.createElement("div");
      title.className = "noteTitle";
      title.textContent = "No matches";

      const preview = document.createElement("div");
      preview.className = "notePreview";
      preview.textContent = "Try a different search.";

      li.appendChild(title);
      li.appendChild(preview);
      noteList.appendChild(li);
    }
  } catch (err) {
    setStatus("Storage error");
    console.error("loadNotes failed:", err);
  }
}

function showEditor(): void {
  listView?.classList.add("hidden");
  editorView?.classList.remove("hidden");
}

function showList(): void {
  editorView?.classList.add("hidden");
  listView?.classList.remove("hidden");
}

async function openNote(id: number): Promise<void> {
  voice.stop();

  if (!titleInput || !bodyInput) {
    return;
  }

  try {
    const notes = await getNotes();
    const note = notes.find((n) => n.id === id);

    if (!note) {
      setStatus("Note not found");
      return;
    }

    currentId = id;
    titleInput.value = note.title || "";
    bodyInput.value = note.body || "";
    lastLoadedSnapshot = snapshotCurrent();

    setStatus("");
    showEditor();
    bodyInput.focus();
  } catch (err) {
    setStatus("Storage error");
    console.error("openNote failed:", err);
  }
}

function newNote(): void {
  voice.stop();

  if (!titleInput || !bodyInput) {
    return;
  }

  currentId = Date.now();
  titleInput.value = "";
  bodyInput.value = "";
  lastLoadedSnapshot = snapshotCurrent();

  setStatus("");
  showEditor();
  titleInput.focus();
}

function backToList(): void {
  voice.stop();
  clearTimeout(autosaveTimer);
  autosaveTimer = 0;

  currentId = null;
  setStatus("");
  showList();

  void loadNotes();
}

async function saveNote(options: { stayInEditor?: boolean; silent?: boolean } = {}): Promise<void> {
  const stayInEditor = Boolean(options.stayInEditor);
  const silent = Boolean(options.silent);

  if (!titleInput || !bodyInput) {
    return;
  }

  const title = titleInput.value.trim();
  const body = bodyInput.value || "";

  try {
    const notes = await getNotes();
    const now = Date.now();
    const id = currentId || now;

    const existing = notes.find((n) => n.id === id);
    if (existing) {
      existing.title = title;
      existing.body = body;
      existing.updatedAt = now;
    } else {
      const note: Note = {
        id,
        title,
        body,
        createdAt: now,
        updatedAt: now
      };
      notes.push(note);
    }

    await withStorageSet({ notes });

    currentId = id;
    lastLoadedSnapshot = snapshotCurrent();
    setStatus(silent ? "" : "Saved");

    if (!stayInEditor) {
      backToList();
    }
  } catch (err) {
    setStatus("Save failed");
    console.error("saveNote failed:", err);
  }
}

function scheduleAutosave(): void {
  clearTimeout(autosaveTimer);

  if (!currentId) {
    return;
  }

  if (!isDirty()) {
    setStatus("");
    return;
  }

  setStatus("Saving...");
  autosaveTimer = window.setTimeout(() => {
    void saveNote({ stayInEditor: true, silent: true });
  }, 600);
}

async function deleteCurrentNote(): Promise<void> {
  if (currentId == null) {
    backToList();
    return;
  }

  if (!titleInput) {
    return;
  }

  const title = titleInput.value.trim() || "(untitled)";
  const ok = window.confirm(`Delete "${title}"?\nThis cannot be undone.`);
  if (!ok) {
    return;
  }

  try {
    const notes = await getNotes();
    const next = notes.filter((n) => n.id !== currentId);
    await withStorageSet({ notes: next });
    backToList();
  } catch (err) {
    setStatus("Delete failed");
    console.error("deleteCurrentNote failed:", err);
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = String(name || "note")
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return cleaned || "note";
}

function exportCurrentNote(): void {
  if (!titleInput || !bodyInput) {
    return;
  }

  const title = sanitizeFilename(titleInput.value.trim());
  const body = bodyInput.value || "";

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function insertAtCursor(textarea: HTMLTextAreaElement | null, text: string): void {
  if (!textarea) {
    return;
  }

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);

  const needsSpace = before.length > 0 && !/\s$/.test(before) && text.length > 0 && !/^\s/.test(text);
  const toInsert = `${needsSpace ? " " : ""}${text}`;

  textarea.value = before + toInsert + after;

  const pos = (before + toInsert).length;
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos;
  textarea.focus();
}

function wireEvents(): void {
  newNoteBtn?.addEventListener("click", newNote);
  newNoteEmptyBtn?.addEventListener("click", newNote);

  saveBtn?.addEventListener("click", () => {
    void saveNote({ stayInEditor: false, silent: false });
  });

  deleteBtn?.addEventListener("click", () => {
    void deleteCurrentNote();
  });

  exportBtn?.addEventListener("click", exportCurrentNote);
  backBtn?.addEventListener("click", backToList);

  searchInput?.addEventListener("input", () => {
    void loadNotes();
  });
  titleInput?.addEventListener("input", scheduleAutosave);
  bodyInput?.addEventListener("input", scheduleAutosave);

  micBtn?.addEventListener("click", () => {
    void voice.toggle();
  });

  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? event.metaKey : event.ctrlKey;

    if (mod && event.key.toLowerCase() === "s" && isEditorVisible()) {
      event.preventDefault();
      void saveNote({ stayInEditor: true, silent: false });
    }

    if (event.key === "Escape" && isEditorVisible()) {
      event.preventDefault();
      backToList();
    }
  });
}

wireEvents();
setStatus("");
void loadNotes();
