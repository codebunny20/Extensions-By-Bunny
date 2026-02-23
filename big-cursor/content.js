let bigCursorOn = false;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggleCursor") {
    bigCursorOn = !bigCursorOn;

    if (bigCursorOn) {
      enableBigCursor();
    } else {
      disableBigCursor();
    }
  }
});

function enableBigCursor() {
  chrome.runtime.sendMessage({ action: "injectCSS" });
}

function disableBigCursor() {
  chrome.runtime.sendMessage({ action: "removeCSS" });
}