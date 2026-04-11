const enabledEl = document.getElementById("enabled");
const colorEl = document.getElementById("color");
const applyBtn = document.getElementById("apply");

function save(partial) {
  return new Promise((resolve) => chrome.storage.sync.set(partial, resolve));
}

function load() {
  chrome.storage.sync.get({ enabled: true, color: "#ff0000" }, (cfg) => {
    enabledEl.checked = !!cfg.enabled;
    colorEl.value = cfg.color || "#ff0000";
  });
}

async function notifyActiveTabToApply() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "MPCE_APPLY" });
}

enabledEl.addEventListener("change", async () => {
  await save({ enabled: enabledEl.checked });
  await notifyActiveTabToApply();
});

colorEl.addEventListener("change", async () => {
  await save({ color: colorEl.value });
  await notifyActiveTabToApply();
});

applyBtn.addEventListener("click", notifyActiveTabToApply);

load();
