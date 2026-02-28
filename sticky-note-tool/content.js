let notes = [];

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "create-note") {
    createNote("New note...");
  }
});

function createNote(text, x = 100, y = 100) {
  const note = document.createElement("div");
  note.className = "sticky-note";
  note.contentEditable = true;
  note.innerText = text;

  note.style.left = x + "px";
  note.style.top = y + "px";

  document.body.appendChild(note);

  makeDraggable(note);
  saveNotes();
}

function makeDraggable(el) {
  let offsetX, offsetY;

  el.addEventListener("mousedown", (e) => {
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    function move(e) {
      el.style.left = e.clientX - offsetX + "px";
      el.style.top = e.clientY - offsetY + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveNotes();
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });

  el.addEventListener("input", saveNotes);
}

function saveNotes() {
  const all = [...document.querySelectorAll(".sticky-note")].map((n) => ({
    text: n.innerText,
    x: parseInt(n.style.left),
    y: parseInt(n.style.top)
  }));

  chrome.storage.local.set({ notes: all });
}

function loadNotes() {
  chrome.storage.local.get("notes", (data) => {
    if (!data.notes) return;
    data.notes.forEach((n) => createNote(n.text, n.x, n.y));
  });
}

loadNotes();