let currentId = null;
let autosaveTimer = 0;
let lastLoadedSnapshot = { title: "", body: "" };
let recognition = null;
let recognizing = false;

const listView = document.getElementById("listView");
const editorView = document.getElementById("editorView");
const noteList = document.getElementById("noteList");
const emptyState = document.getElementById("emptyState");
const saveStatus = document.getElementById("saveStatus");

const newNoteBtn = document.getElementById("newNote");
const newNoteEmptyBtn = document.getElementById("newNoteEmpty");
const saveBtn = document.getElementById("saveNote");
const deleteBtn = document.getElementById("deleteNote");
const exportBtn = document.getElementById("exportNote");
const backBtn = document.getElementById("backToList");
const micBtn = document.getElementById("micBtn");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");
const searchInput = document.getElementById("searchInput");

function setStatus(text) {
  if (saveStatus) {
    saveStatus.textContent = text || "";
  }
}

function normalize(text) {
  return String(text || "").toLowerCase();
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function snapshotCurrent() {
  return {
    title: titleInput.value.trim(),
    body: bodyInput.value || ""
  };
}

function isDirty() {
  const snap = snapshotCurrent();
  return snap.title !== lastLoadedSnapshot.title || snap.body !== lastLoadedSnapshot.body;
}

function withStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(data || {});
    });
  });
}

function withStorageSet(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function loadNotes() {
  try {
    const data = await withStorageGet(["notes"]);
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const q = normalize(searchInput?.value);

    const filtered = q
      ? notes.filter(
          (n) => normalize(n.title).includes(q) || normalize(n.body).includes(q)
        )
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
        preview.textContent = ((note.body || "").replace(/\s+/g, " ").trim() || "No content");

        top.appendChild(title);
        top.appendChild(meta);
        li.appendChild(top);
        li.appendChild(preview);

        li.addEventListener("click", () => openNote(note.id));
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

function showEditor() {
  listView.classList.add("hidden");
  editorView.classList.remove("hidden");
}

function showList() {
  editorView.classList.add("hidden");
  listView.classList.remove("hidden");
}

async function openNote(id) {
  stopVoice();

  try {
    const data = await withStorageGet(["notes"]);
    const notes = Array.isArray(data.notes) ? data.notes : [];
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

function newNote() {
  stopVoice();
  currentId = Date.now();
  titleInput.value = "";
  bodyInput.value = "";
  lastLoadedSnapshot = snapshotCurrent();

  setStatus("");
  showEditor();
  titleInput.focus();
}

function backToList() {
  stopVoice();
  clearTimeout(autosaveTimer);
  autosaveTimer = 0;

  currentId = null;
  setStatus("");
  showList();

  loadNotes();
}

async function saveNote({ stayInEditor = false, silent = false } = {}) {
  const title = titleInput.value.trim();
  const body = bodyInput.value || "";

  try {
    const data = await withStorageGet(["notes"]);
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const now = Date.now();
    const id = currentId || now;

    const existing = notes.find((n) => n.id === id);
    if (existing) {
      existing.title = title;
      existing.body = body;
      existing.updatedAt = now;
    } else {
      notes.push({
        id,
        title,
        body,
        createdAt: now,
        updatedAt: now
      });
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

function scheduleAutosave() {
  clearTimeout(autosaveTimer);

  if (!currentId) {
    return;
  }

  if (!isDirty()) {
    setStatus("");
    return;
  }

  setStatus("Saving...");
  autosaveTimer = setTimeout(() => {
    saveNote({ stayInEditor: true, silent: true });
  }, 600);
}

async function deleteCurrentNote() {
  if (currentId == null) {
    backToList();
    return;
  }

  const title = titleInput.value.trim() || "(untitled)";
  const ok = confirm(`Delete "${title}"?\nThis cannot be undone.`);
  if (!ok) {
    return;
  }

  try {
    const data = await withStorageGet(["notes"]);
    let notes = Array.isArray(data.notes) ? data.notes : [];
    notes = notes.filter((n) => n.id !== currentId);
    await withStorageSet({ notes });
    backToList();
  } catch (err) {
    setStatus("Delete failed");
    console.error("deleteCurrentNote failed:", err);
  }
}

function sanitizeFilename(name) {
  const cleaned = String(name || "note")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return cleaned || "note";
}

function exportCurrentNote() {
  const title = sanitizeFilename(titleInput.value.trim());
  const body = bodyInput.value || "";

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function isSpeechSupported() {
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);

  const needsSpace = before.length > 0 && !/\s$/.test(before) && text.length > 0 && !/^\s/.test(text);
  const toInsert = (needsSpace ? " " : "") + text;

  textarea.value = before + toInsert + after;

  const pos = (before + toInsert).length;
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos;
  textarea.focus();
}

function ensureRecognition() {
  if (recognition) return recognition;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = navigator.language || "en-US";

  let finalBuffer = "";

  r.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const res = event.results[i];
      const text = res[0]?.transcript || "";
      if (res.isFinal) {
        finalBuffer += text;
      } else {
        interim += text;
      }
    }

    setStatus(interim ? `Listening: ${interim}` : "Listening...");

    if (finalBuffer.trim()) {
      insertAtCursor(bodyInput, finalBuffer);
      finalBuffer = "";
      scheduleAutosave();
    }
  };

  r.onerror = (e) => {
    setStatus(`Mic error: ${e.error || "unknown"}`);
    stopVoice();
  };

  r.onend = () => {
    recognizing = false;
    if (micBtn) micBtn.textContent = "Mic";

    if (editorView.classList.contains("hidden")) {
      setStatus("");
    }
  };

  recognition = r;
  return r;
}

async function requestMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

async function startVoice() {
  const r = ensureRecognition();
  if (!r) {
    setStatus("Voice typing is not supported in this browser.");
    return;
  }

  if (recognizing) {
    return;
  }

  try {
    await requestMicPermission();
    recognizing = true;

    if (micBtn) micBtn.textContent = "Stop";
    setStatus("Listening...");

    r.start();
  } catch (err) {
    recognizing = false;
    if (micBtn) micBtn.textContent = "Mic";

    const detail = err?.name || err?.message || String(err);
    setStatus(`Mic blocked/unavailable: ${detail}`);
  }
}

function stopVoice() {
  if (!recognition) {
    return;
  }

  try {
    recognition.stop();
  } catch (err) {
    console.error("stopVoice failed:", err);
  }

  recognizing = false;
  if (micBtn) micBtn.textContent = "Mic";
}

function wireEvents() {
  newNoteBtn?.addEventListener("click", newNote);
  newNoteEmptyBtn?.addEventListener("click", newNote);
  saveBtn?.addEventListener("click", () => saveNote({ stayInEditor: false, silent: false }));
  deleteBtn?.addEventListener("click", deleteCurrentNote);
  exportBtn?.addEventListener("click", exportCurrentNote);
  backBtn?.addEventListener("click", backToList);

  searchInput?.addEventListener("input", loadNotes);
  titleInput?.addEventListener("input", scheduleAutosave);
  bodyInput?.addEventListener("input", scheduleAutosave);

  micBtn?.addEventListener("click", () => {
    if (!isSpeechSupported()) {
      setStatus("Voice typing is not supported in this browser.");
      return;
    }

    if (recognizing) {
      stopVoice();
    } else {
      startVoice();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === "s" && !editorView.classList.contains("hidden")) {
      e.preventDefault();
      saveNote({ stayInEditor: true, silent: false });
    }

    if (e.key === "Escape" && !editorView.classList.contains("hidden")) {
      e.preventDefault();
      backToList();
    }
  });
}

wireEvents();
setStatus("");
loadNotes();
