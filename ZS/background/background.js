// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "show-page-text",
    title: "Show page text",
    contexts: ["page", "selection"]
  });
});

async function extractTextFromTab(tabId, options = {}) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content_script_extract.js"]
    });
    const res = await chrome.tabs.sendMessage(tabId, { action: "extractPageText", options });
    return res?.text || "";
  } catch (e) {
    console.error("extractTextFromTab failed", e);
    return "";
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "show-page-text") return;
  const text = await extractTextFromTab(tab.id, { visibleOnly: false });
  openViewerWithText(text);
});

chrome.action.onClicked.addListener(async (tab) => {
  const text = await extractTextFromTab(tab.id, { visibleOnly: false });
  openViewerWithText(text);
});

async function openViewerWithText(text) {
  const id = `viewer_text_${Date.now()}`;
  try {
    await chrome.storage.local.set({ [id]: text });
    const url = chrome.runtime.getURL(`viewer/viewer.html?id=${encodeURIComponent(id)}`);
    chrome.tabs.create({ url });
  } catch (e) {
    console.error("Storage or open viewer failed, falling back to download", e);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "page-text.txt", conflictAction: "uniquify", saveAs: true }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
}
