let isRestoring = false;

// Listen for messages from popup (add note, clear notes)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "create-note") {
    createNote("New note...");
  }

  if (msg.action === "clear-notes") {
    clearNotes();
  }
});

// Create a new sticky note
function createNote(text, x = 100, y = 100) {
  const note = document.createElement("div");
  note.className = "sticky-note";

  // Header/handle
  const header = document.createElement("div");
  header.className = "sticky-note__header";
  header.title = "Drag";

  const close = document.createElement("button");
  close.className = "sticky-note__close";
  close.type = "button";
  close.textContent = "×";
  close.title = "Delete note";
  close.addEventListener("click", () => {
    note.remove();
    saveNotes();
  });

  const body = document.createElement("div");
  body.className = "sticky-note__body";
  body.contentEditable = true;
  body.spellcheck = true;
  body.innerText = text;

  header.appendChild(close);
  note.appendChild(header);
  note.appendChild(body);

  note.style.left = x + "px";
  note.style.top = y + "px";

  document.body.appendChild(note);

  makeDraggable(note, header);
  makeEditable(body);

  if (!isRestoring) saveNotes();
}

function makeEditable(bodyEl) {
  // Save when user finishes editing (less noisy than every input)
  bodyEl.addEventListener("blur", saveNotes, { passive: true });
  bodyEl.addEventListener("input", () => {
    // lightweight debounce via rAF-ish micro batching
    queueSave();
  });
}

let saveQueued = false;
function queueSave() {
  if (isRestoring || saveQueued) return;
  saveQueued = true;
  setTimeout(() => {
    saveQueued = false;
    saveNotes();
  }, 150);
}

// Make a note draggable (via header only)
function makeDraggable(noteEl, handleEl) {
  let offsetX = 0,
    offsetY = 0;
  let dragging = false;

  handleEl.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - noteEl.offsetLeft;
    offsetY = e.clientY - noteEl.offsetTop;

    function move(ev) {
      if (!dragging) return;
      noteEl.style.left = ev.clientX - offsetX + "px";
      noteEl.style.top = ev.clientY - offsetY + "px";
    }

    function stop() {
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveNotes();
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

// Save all notes to chrome.storage.local
function saveNotes() {
  if (isRestoring) return;

  const allNotes = [...document.querySelectorAll(".sticky-note")].map((n) => {
    const body = n.querySelector(".sticky-note__body");
    const left = Number.parseInt(n.style.left || "0", 10);
    const top = Number.parseInt(n.style.top || "0", 10);

    return {
      text: body ? body.innerText : "",
      x: Number.isFinite(left) ? left : 0,
      y: Number.isFinite(top) ? top : 0
    };
  });

  chrome.storage.local.set({ notes: allNotes });
}

// Load notes from storage
function loadNotes() {
  isRestoring = true;
  chrome.storage.local.get("notes", (data) => {
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    notes.forEach((n) => createNote(n.text ?? "", n.x ?? 100, n.y ?? 100));
    isRestoring = false;
  });
}

// Remove all notes from the page and storage
function clearNotes() {
  document.querySelectorAll(".sticky-note").forEach((n) => n.remove());
  chrome.storage.local.set({ notes: [] });
}

// Load notes when the content script runs
loadNotes();