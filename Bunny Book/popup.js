let currentId = null;
let autosaveTimer = 0;
let lastLoadedSnapshot = { title: "", body: "" };
let recognition = null;
let recognizing = false;

const listView = document.getElementById("listView");
const editorView = document.getElementById("editorView");
const micBtn = document.getElementById("micBtn");

const noteList = document.getElementById("noteList");
const newNoteBtn = document.getElementById("newNote");
const saveBtn = document.getElementById("saveNote");
const deleteBtn = document.getElementById("deleteNote");
const exportBtn = document.getElementById("exportNote");
const backBtn = document.getElementById("backToList");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const newNoteEmpty = document.getElementById("newNoteEmpty");
const saveStatus = document.getElementById("saveStatus");

function isSpeechSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

function ensureRecognition() {
  if (recognition) return recognition;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.continuous = true;      // keep listening
  r.interimResults = true;  // show partials
  r.lang = navigator.language || "en-US";

  let finalBuffer = "";

  r.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0]?.transcript || "";
      if (res.isFinal) finalBuffer += text;
      else interim += text;
    }

    // Show interim in status; only commit finals into the textarea
    setStatus(interim ? `Listening… ${interim}` : "Listening…");

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
    // Chrome may stop automatically after a pause
    recognizing = false;
    if (micBtn) micBtn.textContent = "Mic";
    setStatus("");
  };

  recognition = r;
  return r;
}

function insertAtCursor(textarea, text) {
  const el = textarea;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;

  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  // Add a space if needed
  const needsSpace =
    before.length && !/\s$/.test(before) && text.length && !/^\s/.test(text);

  const toInsert = (needsSpace ? " " : "") + text;

  el.value = before + toInsert + after;

  const pos = (before + toInsert).length;
  el.selectionStart = el.selectionEnd = pos;
  el.focus();
}

function startVoice() {
  const r = ensureRecognition();
  if (!r) {
    setStatus("Voice typing not supported in this browser.");
    return;
  }
  if (recognizing) return;

  try {
    recognizing = true;
    micBtn.textContent = "Stop";
    setStatus("Listening…");
    r.start();
  } catch {
    // start() can throw if called twice quickly
  }
}

function stopVoice() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {}
  recognizing = false;
  if (micBtn) micBtn.textContent = "Mic";
}

micBtn?.addEventListener("click", () => {
  if (!isSpeechSupported()) {
    setStatus("Voice typing not supported in this browser.");
    return;
  }
  recognizing ? stopVoice() : startVoice();
});
/////////////////////////////////

// ...existing code...

async function requestMicPermission() {
  // Triggers the browser permission prompt (or throws if blocked)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // We only need permission; stop immediately
  stream.getTracks().forEach(t => t.stop());
}

function startVoice() {
  const r = ensureRecognition();
  if (!r) {
    setStatus("Voice typing not supported in this browser.");
    return;
  }
  if (recognizing) return;

  (async () => {
    try {
      // Make permission issues obvious
      if (navigator.mediaDevices?.getUserMedia) {
        await requestMicPermission();
      }

      recognizing = true;
      micBtn.textContent = "Stop";
      setStatus("Listening…");
      r.start();
    } catch (err) {
      const msg = err?.name || err?.message || String(err);
      setStatus(`Mic blocked/unavailable: ${msg}`);
      recognizing = false;
      micBtn.textContent = "Mic";
    }
  })();
}

// Improve error detail
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
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0]?.transcript || "";
      if (res.isFinal) finalBuffer += text;
      else interim += text;
    }

    setStatus(interim ? `Listening… ${interim}` : "Listening…");

    if (finalBuffer.trim()) {
      insertAtCursor(bodyInput, finalBuffer);
      finalBuffer = "";
      scheduleAutosave();
    }
  };

  r.onerror = (e) => {
    // e.error is the key: "not-allowed", "service-not-allowed", "no-speech", "audio-capture", etc.
    setStatus(`Mic error: ${e.error || "unknown"}`);
    stopVoice();
  };

  r.onend = () => {
    recognizing = false;
    if (micBtn) micBtn.textContent = "Mic";
    setStatus("");
  };

  recognition = r;
  return r;
}

// ...existing code...

/////////////////////////////////////////
function setStatus(text) {
  if (!saveStatus) return;
  saveStatus.textContent = text || "";
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  // Keep it compact for the popup
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }) + " " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function normalize(s) {
  return String(s || "").toLowerCase();
}

function snapshotCurrent() {
  return { title: titleInput.value.trim(), body: bodyInput.value || "" };
}

function isDirty() {
  const s = snapshotCurrent();
  return s.title !== lastLoadedSnapshot.title || s.body !== lastLoadedSnapshot.body;
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  if (!currentId) return;

  // Only autosave if something actually changed
  if (!isDirty()) {
    setStatus("");
    return;
  }

  setStatus("Saving…");
  autosaveTimer = setTimeout(() => {
    saveNote({ stayInEditor: true, silent: true });
  }, 600);
}

function loadNotes() {
  chrome.storage.local.get(["notes"], data => {
    const notes = data.notes || [];
    const q = normalize(searchInput?.value);

    const filtered = q
      ? notes.filter(n => normalize(n.title).includes(q) || normalize(n.body).includes(q))
      : notes;

    noteList.innerHTML = "";

    emptyState.classList.toggle("hidden", (notes.length !== 0));
    if (notes.length === 0) return;

    filtered
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach(n => {
        const li = document.createElement("li");
        li.className = "noteItem";
        li.setAttribute("role", "listitem");

        const top = document.createElement("div");
        top.className = "noteRowTop";

        const title = document.createElement("div");
        title.className = "noteTitle";
        title.textContent = n.title || "(untitled)";

        const meta = document.createElement("div");
        meta.className = "noteMeta";
        meta.textContent = fmtTime(n.updatedAt || n.createdAt);

        const preview = document.createElement("div");
        preview.className = "notePreview";
        const previewText = (n.body || "").replace(/\s+/g, " ").trim();
        preview.textContent = previewText || "No content";

        top.appendChild(title);
        top.appendChild(meta);

        li.appendChild(top);
        li.appendChild(preview);

        li.onclick = () => openNote(n.id);
        noteList.appendChild(li);
      });

    // If search filters everything out, show a gentle empty message inline
    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "noteItem";
      li.innerHTML = `<div class="noteTitle">No matches</div><div class="notePreview">Try a different search.</div>`;
      noteList.appendChild(li);
    }
  });
}

function openNote(id) {
  chrome.storage.local.get(["notes"], data => {
    const notes = data.notes || [];
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentId = id;
    titleInput.value = note.title || "";
    bodyInput.value = note.body || "";
    let recognition = null;
    let recognizing = false;

    lastLoadedSnapshot = snapshotCurrent();
    setStatus("");

    listView.classList.add("hidden");
    editorView.classList.remove("hidden");

    // Put cursor into body for quick typing
    bodyInput.focus();
  });
}

function newNote() {
  currentId = Date.now();
  titleInput.value = "";
  bodyInput.value = "";

  lastLoadedSnapshot = snapshotCurrent();
  setStatus("");

    function isSpeechSupported() {
      return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
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
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) finalBuffer += text;
          else interim += text;
        }
        setStatus(interim ? `Listening… ${interim}` : "Listening…");
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
        if (micBtn) micBtn.textContent = "🎤";
        setStatus("");
      };

      recognition = r;
      return r;
    }

    function insertAtCursor(textarea, text) {
      const el = textarea;
      if (!el) return;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const needsSpace = before.length && !/\s$/.test(before) && text.length && !/^\s/.test(text);
      const toInsert = (needsSpace ? " " : "") + text;
      el.value = before + toInsert + after;
      const pos = (before + toInsert).length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    }

    function startVoice() {
      const r = ensureRecognition();
      if (!r) {
        setStatus("Voice typing not supported in this browser.");
        return;
      }
      if (recognizing) return;
      try {
        recognizing = true;
        micBtn.textContent = "⏹️";
        setStatus("Listening…");
        r.start();
      } catch {
        // start() can throw if called twice quickly
      }
    }

    function stopVoice() {
      if (!recognition) return;
      try {
        recognition.stop();
      } catch {}
      recognizing = false;
      if (micBtn) micBtn.textContent = "🎤";
    }

    micBtn?.addEventListener("click", () => {
      if (!isSpeechSupported()) {
        setStatus("Voice typing not supported in this browser.");
        return;
      }
      recognizing ? stopVoice() : startVoice();
    });

    // --- End Voice to Text ---
  listView.classList.add("hidden");
  editorView.classList.remove("hidden");

  titleInput.focus();
}

function backToList() {
  clearTimeout(autosaveTimer);
  autosaveTimer = 0;

  editorView.classList.add("hidden");
  listView.classList.remove("hidden");

  setStatus("");
  currentId = null;
}

function saveNote({ stayInEditor = false, silent = false } = {}) {
  const title = titleInput.value.trim();
  const body = bodyInput.value || "";

  chrome.storage.local.get(["notes"], data => {
    const notes = data.notes || [];
    const now = Date.now();

    const id = currentId || now;
    let existing = notes.find(n => n.id === id);

    if (existing) {
      existing.title = title;
      existing.body = body;
      existing.updatedAt = now;
    } else {
      existing = {
        id,
        title,
        body,
        createdAt: now,
        updatedAt: now
      };
      notes.push(existing);
    }

    chrome.storage.local.set({ notes }, () => {
      currentId = id;
      lastLoadedSnapshot = snapshotCurrent();

      if (!silent) setStatus("Saved");
      else setStatus("");

      if (!stayInEditor) {
        backToList();
        loadNotes();
      }
    });
  });
}

function sanitizeFilename(name) {
  const cleaned = String(name || "note")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned || "note";
}

newNoteBtn.onclick = newNote;
newNoteEmpty?.addEventListener("click", newNote);

saveBtn.onclick = () => saveNote({ stayInEditor: false, silent: false });

deleteBtn.onclick = () => {
  if (currentId == null) {
    backToList();
    return;
  }

  const title = titleInput.value.trim() || "(untitled)";
  const ok = confirm(`Delete "${title}"?\nThis cannot be undone.`);
  if (!ok) return;

  chrome.storage.local.get(["notes"], data => {
    let notes = data.notes || [];
    notes = notes.filter(n => n.id !== currentId);
    chrome.storage.local.set({ notes }, () => {
      backToList();
      loadNotes();
    });
  });
};

exportBtn.onclick = () => {
  const title = sanitizeFilename(titleInput.value.trim());
  const body = bodyInput.value || "";

  const blob = new Blob([body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

backBtn.onclick = backToList;

// Search as you type
searchInput?.addEventListener("input", () => loadNotes());

// Autosave on typing
titleInput.addEventListener("input", scheduleAutosave);
bodyInput.addEventListener("input", scheduleAutosave);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveNote({ stayInEditor: true, silent: false });
  }

  if (e.key === "Escape") {
    // If in editor, go back
    if (!editorView.classList.contains("hidden")) backToList();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setStatus("");
  loadNotes();
});
// ...existing code...