const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
}

addBtn?.addEventListener("click", () => {
  setStatus("");
  sendToContent({ action: "create-note" });
});

clearBtn?.addEventListener("click", () => {
  setStatus("");
  sendToContent({ action: "clear-notes" });
});

function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) {
      setStatus("No active tab.");
      return;
    }

    chrome.tabs.sendMessage(tabId, message, () => {
      const err = chrome.runtime.lastError;
      if (err?.message) {
        setStatus(err.message);
      }
    });
  });
}