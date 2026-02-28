chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        globalThis.__magnifierToggle?.();
      }
    });
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
