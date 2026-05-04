let currentId = null;

const listView = document.getElementById("listView");
const editorView = document.getElementById("editorView");

const noteList = document.getElementById("noteList");
const newNoteBtn = document.getElementById("newNote");
const saveBtn = document.getElementById("saveNote");
const deleteBtn = document.getElementById("deleteNote");
const exportBtn = document.getElementById("exportNote");
const backBtn = document.getElementById("backToList");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

function loadNotes() {
  chrome.storage.local.get(["notes"], data => {
    const notes = data.notes || [];
    noteList.innerHTML = "";

    notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach(n => {
        const li = document.createElement("li");

        const titleSpan = document.createElement("span");
        titleSpan.className = "title";
        titleSpan.textContent = n.title || "(untitled)";

        const previewSpan = document.createElement("span");
        previewSpan.className = "preview";
        const previewText = (n.body || "").replace(/\s+/g, " ").slice(0, 20);
        previewSpan.textContent = previewText ? `· ${previewText}` : "";

        li.appendChild(titleSpan);
        li.appendChild(previewSpan);

        li.onclick = () => openNote(n.id);
        noteList.appendChild(li);
      });
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

    listView.classList.add("hidden");
    editorView.classList.remove("hidden");
  });
}

newNoteBtn.onclick = () => {
  currentId = Date.now();
  titleInput.value = "";
  bodyInput.value = "";

  listView.classList.add("hidden");
  editorView.classList.remove("hidden");
};

saveBtn.onclick = () => {
  const title = titleInput.value.trim();
  const body = bodyInput.value;

  chrome.storage.local.get(["notes"], data => {
    const notes = data.notes || [];
    const now = Date.now();

    const existing = notes.find(n => n.id === currentId);
    if (existing) {
      existing.title = title;
      existing.body = body;
      existing.updatedAt = now;
    } else {
      notes.push({
        id: currentId || now,
        title,
        body,
        createdAt: now,
        updatedAt: now
      });
    }

    chrome.storage.local.set({ notes }, () => {
      backToList();
      loadNotes();
    });
  });
};

deleteBtn.onclick = () => {
  if (currentId == null) {
    backToList();
    return;
  }

  chrome.storage.local.get(["notes"], data => {
    let notes = data.notes || [];
    notes = notes.filter(n => n.id !== currentId);
    chrome.storage.local.set({ notes }, () => {
      currentId = null;
      backToList();
      loadNotes();
    });
  });
};

exportBtn.onclick = () => {
  const title = titleInput.value.trim() || "note";
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

function backToList() {
  editorView.classList.add("hidden");
  listView.classList.remove("hidden");
}

backBtn.onclick = backToList;

document.addEventListener("DOMContentLoaded", loadNotes);
