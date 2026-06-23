// content_script_extract.js
function getPageText(options = {}) {
  // Use innerText to get only visible text content (like the bookmarklet)
  return document.body.innerText || "";
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "extractPageText") {
    const text = getPageText(msg.options || {});
    sendResponse({ text });
  }
  return true;
});
