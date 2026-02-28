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
    note.contentEditable = true;
    note.innerText = text;
  
    note.style.left = x + "px";
    note.style.top = y + "px";
  
    document.body.appendChild(note);
  
    makeDraggable(note);
    saveNotes();
  }
  
  // Make a note draggable
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
  
    // Save when user types
    el.addEventListener("input", saveNotes);
  }
  
  // Save all notes to chrome.storage.local
  function saveNotes() {
    const allNotes = [...document.querySelectorAll(".sticky-note")].map((n) => ({
      text: n.innerText,
      x: parseInt(n.style.left),
      y: parseInt(n.style.top)
    }));
  
    chrome.storage.local.set({ notes: allNotes });
  }
  
  // Load notes from storage
  function loadNotes() {
    chrome.storage.local.get("notes", (data) => {
      if (!data.notes) return;
      data.notes.forEach((n) => createNote(n.text, n.x, n.y));
    });
  }
  
  // Remove all notes from the page and storage
  function clearNotes() {
    document.querySelectorAll(".sticky-note").forEach((n) => n.remove());
    chrome.storage.local.set({ notes: [] });
  }
  
  // Load notes when the content script runs
  loadNotes();