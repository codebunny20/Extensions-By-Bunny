const btn = document.getElementById("toggleBtn");

chrome.storage.sync.get("enabled", ({ enabled }) => {
  btn.textContent = enabled ? "Disable WideScroll" : "Enable WideScroll";
});

btn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.storage.sync.get("enabled", ({ enabled }) => {
    const newState = !enabled;

    chrome.storage.sync.set({ enabled: newState });

    chrome.tabs.sendMessage(tab.id, newState ? "enable" : "disable");

    btn.textContent = newState ? "Disable WideScroll" : "Enable WideScroll";
  });
});
