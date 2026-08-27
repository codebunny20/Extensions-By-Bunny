// background.js
async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function findMediaInTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content_script_extract.js"]
    });

    const response = await chrome.tabs.sendMessage(tabId, { action: "findMedia" });
    return Array.isArray(response?.media) ? response.media : [];
  } catch (error) {
    console.error("findMediaInTab failed", error);
    return [];
  }
}

async function ripMediaFromActiveTab(tabId) {
  const media = await findMediaInTab(tabId);
  if (!media.length) {
    return { ok: false, error: "No MP4 or MP3 media was found on this page.", count: 0 };
  }

  const downloads = [];
  for (const item of media) {
    try {
      const downloadId = await chrome.downloads.download({
        url: item.url,
        filename: item.filename,
        conflictAction: "uniquify",
        saveAs: false
      });

      downloads.push({
        id: downloadId,
        url: item.url,
        filename: item.filename,
        type: item.type
      });
    } catch (error) {
      console.warn("Skipping media item due to download error", item, error);
    }
  }

  if (!downloads.length) {
    return { ok: false, error: "MP4/MP3 files were found, but none could be downloaded.", count: 0 };
  }

  return { ok: true, count: downloads.length, media: downloads };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== "ripMediaFromPage") return;

  (async () => {
    const tabId = sender.tab?.id || (await getActiveTabId());
    if (!tabId) {
      sendResponse({ ok: false, error: "No active tab found." });
      return;
    }

    const result = await ripMediaFromActiveTab(tabId);
    sendResponse(result);
  })().catch((error) => {
    console.error("ripMediaFromPage failed", error);
    sendResponse({ ok: false, error: error?.message || "Unknown error" });
  });

  return true;
});
