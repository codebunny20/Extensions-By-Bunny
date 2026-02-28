const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");

addBtn?.addEventListener("click", () => {
  sendToContent({ action: "create-note" });
});

clearBtn?.addEventListener("click", () => {
  sendToContent({ action: "clear-notes" });
});

function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, message);
  });
}