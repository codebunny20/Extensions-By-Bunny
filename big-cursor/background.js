chrome.action.onClicked.addListener(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleCursor" });
  });
  
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!sender.tab) return;
  
    if (msg.action === "injectCSS") {
      chrome.scripting.insertCSS({
        target: { tabId: sender.tab.id },
        files: ["cursor.css"]
      });
    }
  
    if (msg.action === "removeCSS") {
      chrome.scripting.removeCSS({
        target: { tabId: sender.tab.id },
        files: ["cursor.css"]
      });
    }
  });