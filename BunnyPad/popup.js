const noteEl = document.getElementById("note");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

const STORAGE_KEY = "transfem_notepad_note";
let saveTimeout = null;

function showStatus(message) {
  statusEl.textContent = message;
  if (message) {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
      }
    }, 1500);
  }
}

function loadNote() {
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    if (chrome.runtime.lastError) {
      showStatus("Could not load note.");
      return;
    }
    noteEl.value = data[STORAGE_KEY] || "";
  });
}

function saveNote() {
  const value = noteEl.value;
  chrome.storage.sync.set({ [STORAGE_KEY]: value }, () => {
    if (chrome.runtime.lastError) {
      showStatus("Save failed.");
      return;
    }
    showStatus("Saved.");
  });
}

noteEl.addEventListener("input", () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNote, 400);
});

clearBtn.addEventListener("click", () => {
  if (!noteEl.value) {
    showStatus("Already empty.");
    return;
  }
  const confirmed = confirm("Clear your note?");
  if (!confirmed) return;

  noteEl.value = "";
  saveNote();
  showStatus("Cleared.");
});

document.addEventListener("DOMContentLoaded", loadNote);
