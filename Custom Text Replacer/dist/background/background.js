"use strict";
// MV3 service worker – initialises storage on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get("snippets", ({ snippets }) => {
        if (!snippets) {
            chrome.storage.sync.set({ snippets: {} });
        }
    });
});
//# sourceMappingURL=background.js.map