chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // If content script ran, use its toggle; otherwise, do nothing.
        // (Content scripts may be blocked on some internal/restricted pages.)
        globalThis.__magnifierToggle?.();
      }
    });
  } catch {
    // Ignore failures on restricted pages (e.g., chrome://, opera://, extension gallery).
  }
});
