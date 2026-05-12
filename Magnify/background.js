const DEFAULT_SETTINGS = {
  zoom: 2,
  lensSize: 180
};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await toggleMagnifierOnTab(tab.id);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "magnifier:capture") {
    if (!sender?.tab?.windowId) return false;

    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      (dataUrl) => {
        sendResponse({ ok: Boolean(dataUrl), dataUrl: dataUrl || null });
      }
    );

    return true;
  }

  if (msg?.action === "magnifier:getSettings") {
    getSettings().then((settings) => sendResponse({ settings }));
    return true;
  }

  if (msg?.action === "magnifier:updateSettings") {
    saveSettings(msg.settings)
      .then(async (settings) => {
        const tabId = await getActiveTabId();
        if (tabId) {
          await ensureContentScript(tabId);
          await sendTabMessage(tabId, {
            action: "updateMagnifierSettings",
            settings
          });
        }

        sendResponse({ ok: true, settings });
      })
      .catch(() => sendResponse({ ok: false }));

    return true;
  }

  if (msg?.action === "magnifier:toggleActiveTab") {
    getActiveTabId()
      .then(async (tabId) => {
        if (!tabId) {
          sendResponse({ ok: false });
          return;
        }

        await toggleMagnifierOnTab(tabId);
        sendResponse({ ok: true });
      })
      .catch(() => sendResponse({ ok: false }));

    return true;
  }

  return false;
});

async function toggleMagnifierOnTab(tabId) {
  const settings = await getSettings();

  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "toggleMagnifier",
      settings
    });
    return;
  } catch {
    // Fall through to injection.
  }

  try {
    await ensureContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, {
      action: "toggleMagnifier",
      settings
    });
  } catch {
    // Ignore failures on restricted pages.
  }
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "magnifier:ping" });
    return;
  } catch {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["magnify.css"]
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id || null;
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

async function saveSettings(partialSettings = {}) {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    ...partialSettings
  });

  await chrome.storage.sync.set(next);
  return next;
}

function normalizeSettings(settings = {}) {
  const zoom = clampNumber(settings.zoom, 2, 1.25, 4);
  const lensSize = clampNumber(settings.lensSize, 180, 120, 280);

  return { zoom, lensSize };
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

async function sendTabMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Ignore tabs where the content script is not active.
  }
}
