document.getElementById("read").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  }, (res) => {
    const text = res[0].result || "";
    chrome.runtime.sendMessage({ type: "READ_TEXT", text });
  });
};

document.getElementById("stop").onclick = () => {
  chrome.runtime.sendMessage({ type: "STOP_READING" });
};

document.getElementById("start-voice").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "START_VOICE_TYPING" });
};

document.getElementById("stop-voice").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "STOP_VOICE_TYPING" });
};
