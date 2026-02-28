document.getElementById("add").addEventListener("click", () => {
    sendToContent({ action: "create-note" });
  });
  
  document.getElementById("clear").addEventListener("click", () => {
    sendToContent({ action: "clear-notes" });
  });
  
  function sendToContent(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }