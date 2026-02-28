chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Try toggling via message first (fast path).
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggleMagnifier" });
    return;
  } catch {
    // Fall through to injection.
  }

  // If the content script isn't present (or messaging failed), inject and toggle.
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/magnifier.css"]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/content.js"]
    });

    await chrome.tabs.sendMessage(tab.id, { action: "toggleMagnifier" });
  } catch {
    // Ignore failures on restricted pages.
  }
});

// Provide live screenshots to the content script via captureVisibleTab.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action !== "magnifier:capture") return;
  if (!sender?.tab?.windowId) return;

  chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
    sendResponse({ ok: Boolean(dataUrl), dataUrl: dataUrl || null });
  });

  return true; // async response
});