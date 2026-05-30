"use strict";
(() => {
  // src/types/Storage.ts
  function withStorageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (data) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(data || {});
      });
    });
  }
  function withStorageSet(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }
  function parseNotes(input) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.map((raw) => {
      if (!raw || typeof raw !== "object") {
        return null;
      }
      const record = raw;
      const id = Number(record.id);
      const createdAt = Number(record.createdAt);
      const updatedAt = Number(record.updatedAt);
      if (!Number.isFinite(id)) {
        return null;
      }
      return {
        id,
        title: String(record.title || ""),
        body: String(record.body || ""),
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now()
      };
    }).filter((n) => Boolean(n));
  }
  async function getNotes() {
    const data = await withStorageGet(["notes"]);
    return parseNotes(data.notes);
  }

  // src/voice/VoiceController.ts
  var VoiceController = class {
    constructor(callbacks) {
      this.callbacks = callbacks;
      this.recognition = null;
      this.state = "idle";
      this.startToken = 0;
      this.permissionGranted = false;
    }
    isSupported() {
      return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
    isListening() {
      return this.state === "listening";
    }
    async toggle() {
      if (this.isListening() || this.state === "starting") {
        this.stop();
        return;
      }
      await this.start();
    }
    async start() {
      if (!this.isSupported()) {
        this.callbacks.onStatus("Voice typing is not supported in this browser.");
        return;
      }
      if (this.state !== "idle") {
        return;
      }
      this.state = "starting";
      this.callbacks.onListeningChange(true);
      this.callbacks.onStatus("Listening...");
      const token = ++this.startToken;
      try {
        await this.requestMicPermission();
        if (token !== this.startToken || this.state !== "starting") {
          this.setIdle("");
          return;
        }
        const r = this.ensureRecognition();
        if (!r) {
          this.setIdle("Voice typing is not supported in this browser.");
          return;
        }
        r.start();
        this.state = "listening";
        this.callbacks.onListeningChange(true);
        this.callbacks.onStatus("Listening...");
      } catch (err) {
        const message = this.getErrorMessage(err);
        this.setIdle(`Mic blocked/unavailable: ${message}`);
      }
    }
    stop() {
      if (this.state === "idle") {
        return;
      }
      this.startToken += 1;
      if (this.state === "starting") {
        this.setIdle("");
        return;
      }
      this.setIdle("");
      try {
        this.recognition?.stop();
      } catch {
      }
    }
    ensureRecognition() {
      if (this.recognition) {
        return this.recognition;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        return null;
      }
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (!result) {
            continue;
          }
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }
        if (interimText.trim()) {
          this.callbacks.onStatus(`Listening: ${interimText}`);
        } else if (this.state !== "idle") {
          this.callbacks.onStatus("Listening...");
        }
        if (finalText.trim()) {
          this.callbacks.onTranscript(finalText);
        }
      };
      recognition.onerror = (event) => {
        this.setIdle(`Mic error: ${event.error || "unknown"}`);
      };
      recognition.onend = () => {
        if (this.state === "listening") {
          try {
            recognition.start();
          } catch {
            this.setIdle("");
          }
        } else if (this.state !== "idle") {
          this.setIdle("");
        }
      };
      this.recognition = recognition;
      return recognition;
    }
    async requestMicPermission() {
      if (this.permissionGranted) {
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.permissionGranted = true;
    }
    setIdle(statusMessage) {
      this.state = "idle";
      this.callbacks.onListeningChange(false);
      this.callbacks.onStatus(statusMessage);
    }
    getErrorMessage(err) {
      if (!err) {
        return "unknown";
      }
      if (typeof err === "string") {
        return err;
      }
      if (err && typeof err === "object") {
        const maybeName = err.name;
        const maybeMessage = err.message;
        if (typeof maybeName === "string" && maybeName.trim()) {
          return maybeName;
        }
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
          return maybeMessage;
        }
      }
      return "unknown";
    }
  };

  // src/popup.ts
  var currentId = null;
  var autosaveTimer = 0;
  var lastLoadedSnapshot = { title: "", body: "" };
  var listView = document.getElementById("listView");
  var editorView = document.getElementById("editorView");
  var noteList = document.getElementById("noteList");
  var emptyState = document.getElementById("emptyState");
  var saveStatus = document.getElementById("saveStatus");
  var newNoteBtn = document.getElementById("newNote");
  var newNoteEmptyBtn = document.getElementById("newNoteEmpty");
  var saveBtn = document.getElementById("saveNote");
  var deleteBtn = document.getElementById("deleteNote");
  var exportBtn = document.getElementById("exportNote");
  var backBtn = document.getElementById("backToList");
  var micBtn = document.getElementById("micBtn");
  var titleInput = document.getElementById("titleInput");
  var bodyInput = document.getElementById("bodyInput");
  var searchInput = document.getElementById("searchInput");
  var voice = new VoiceController({
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
  function isEditorVisible() {
    return !editorView?.classList.contains("hidden");
  }
  function setStatus(text) {
    if (saveStatus) {
      saveStatus.textContent = text || "";
    }
  }
  function normalize(text) {
    return String(text || "").toLowerCase();
  }
  function fmtTime(ts) {
    if (!ts) {
      return "";
    }
    const d = new Date(ts);
    return d.toLocaleDateString(void 0, { month: "short", day: "2-digit" }) + " " + d.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  }
  function snapshotCurrent() {
    return {
      title: titleInput?.value.trim() || "",
      body: bodyInput?.value || ""
    };
  }
  function isDirty() {
    const snap = snapshotCurrent();
    return snap.title !== lastLoadedSnapshot.title || snap.body !== lastLoadedSnapshot.body;
  }
  async function loadNotes() {
    if (!noteList || !emptyState) {
      return;
    }
    try {
      const notes = await getNotes();
      const q = normalize(searchInput?.value || "");
      const filtered = q ? notes.filter((n) => normalize(n.title).includes(q) || normalize(n.body).includes(q)) : notes;
      noteList.innerHTML = "";
      emptyState.classList.toggle("hidden", notes.length !== 0);
      if (notes.length === 0) {
        return;
      }
      filtered.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).forEach((note) => {
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
  function showEditor() {
    listView?.classList.add("hidden");
    editorView?.classList.remove("hidden");
  }
  function showList() {
    editorView?.classList.add("hidden");
    listView?.classList.remove("hidden");
  }
  async function openNote(id) {
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
  function newNote() {
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
  function backToList() {
    voice.stop();
    clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    currentId = null;
    setStatus("");
    showList();
    void loadNotes();
  }
  async function saveNote(options = {}) {
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
        const note = {
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
    autosaveTimer = window.setTimeout(() => {
      void saveNote({ stayInEditor: true, silent: true });
    }, 600);
  }
  async function deleteCurrentNote() {
    if (currentId == null) {
      backToList();
      return;
    }
    if (!titleInput) {
      return;
    }
    const title = titleInput.value.trim() || "(untitled)";
    const ok = window.confirm(`Delete "${title}"?
This cannot be undone.`);
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
  function sanitizeFilename(name) {
    const cleaned = String(name || "note").trim().replace(/[<>:\"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").slice(0, 80);
    return cleaned || "note";
  }
  function exportCurrentNote() {
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
  function insertAtCursor(textarea, text) {
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
  function wireEvents() {
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
})();
