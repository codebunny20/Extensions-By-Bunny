chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Try toggling via message first (content script already present).
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggleMagnifier" });
    return;
  } catch {
    // Fall through to injection.
  }

  // Inject (CSS + content script) then toggle.
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["magnify.css"]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    await chrome.tabs.sendMessage(tab.id, { action: "toggleMagnifier" });
  } catch {
    // Ignore failures on restricted pages.
  }
});

// Provide live screenshots to the content script.
// Uses captureVisibleTab => captures what is actually painted (video/canvas/etc).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action !== "magnifier:capture") return;
  if (!sender?.tab?.windowId) return;

  chrome.tabs.captureVisibleTab(
    sender.tab.windowId,
    { format: "png" },
    (dataUrl) => {
      sendResponse({ ok: Boolean(dataUrl), dataUrl: dataUrl || null });
    }
  );

  // Keep the message channel open for async response
  return true;
});
