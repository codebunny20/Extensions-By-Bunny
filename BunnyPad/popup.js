const STORAGE_KEY = "saved_notes";

const noteList = document.getElementById("noteList");
const editor = document.getElementById("editor");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const statusEl = document.getElementById("status");

const newNoteBtn = document.getElementById("newNoteBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const backBtn = document.getElementById("backBtn");
const exportOneBtn = document.getElementById("exportOneBtn");
const exportAllBtn = document.getElementById("exportAllBtn");

let currentNoteId = null;

function showStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = "";
  }, 1500);
}

function loadAllNotes(callback) {
  chrome.storage.local.get(STORAGE_KEY, data => {
    const notes = data[STORAGE_KEY] || [];
    callback(notes);
  });
}

function saveAllNotes(notes, cb) {
  chrome.storage.local.set({ [STORAGE_KEY]: notes }, () => {
    if (cb) cb();
  });
}

function renderList() {
  editor.classList.add("hidden");
  noteList.innerHTML = "";

  loadAllNotes(notes => {
    if (!notes.length) {
      const empty = document.createElement("div");
      empty.textContent = "No notes yet.";
      empty.style.fontSize = "0.85rem";
      noteList.appendChild(empty);
      return;
    }

    notes.forEach(n => {
      const div = document.createElement("div");
      div.className = "noteItem";
      div.textContent = n.title || "(Untitled)";
      div.onclick = () => openEditor(n.id);
      noteList.appendChild(div);
    });
  });
}

function openEditor(id) {
  loadAllNotes(notes => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = id;
    noteTitle.value = note.title;
    noteContent.value = note.content;
    editor.classList.remove("hidden");
  });
}

newNoteBtn.addEventListener("click", () => {
  currentNoteId = crypto.randomUUID();
  noteTitle.value = "";
  noteContent.value = "";
  editor.classList.remove("hidden");
});

saveBtn.addEventListener("click", () => {
  loadAllNotes(notes => {
    let note = notes.find(n => n.id === currentNoteId);

    if (!note) {
      note = { id: currentNoteId };
      notes.push(note);
    }

    note.title = noteTitle.value.trim() || "Untitled";
    note.content = noteContent.value;
    note.updated = Date.now();

    saveAllNotes(notes, () => {
      showStatus("Saved");
      renderList();
    });
  });
});

deleteBtn.addEventListener("click", () => {
  if (!currentNoteId) return;

  loadAllNotes(notes => {
    const filtered = notes.filter(n => n.id !== currentNoteId);
    saveAllNotes(filtered, () => {
      showStatus("Deleted");
      renderList();
    });
  });
});

backBtn.addEventListener("click", () => {
  renderList();
});

exportOneBtn.addEventListener("click", () => {
  if (!currentNoteId) return;

  loadAllNotes(notes => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;

    const blob = new Blob([note.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title || "note"}.txt`;
    a.click();

    URL.revokeObjectURL(url);
    showStatus("Exported note");
  });
});

exportAllBtn.addEventListener("click", () => {
  loadAllNotes(notes => {
    if (!notes.length) {
      showStatus("No notes to export");
      return;
    }

    const text = notes
      .map(n => `# ${n.title || "Untitled"}\n\n${n.content || ""}\n\n---\n`)
      .join("");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // default “file” name: saved_notes.txt
    a.download = "saved_notes.txt";
    a.click();

    URL.revokeObjectURL(url);
    showStatus("Exported all");
  });
});

renderList();
