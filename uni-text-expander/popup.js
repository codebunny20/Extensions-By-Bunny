const els = {
  toggleBtn: document.getElementById("toggle-extension"),
  switchEl: document.querySelector("#toggle-extension .switch"),
  toggleText: document.querySelector("#toggle-extension > span"),

  tbody: document.getElementById("shortcuts-body"),
  emptyState: document.getElementById("empty-state"),

  addRow: document.getElementById("add-row"),
  shortcutInput: document.getElementById("shortcut-input"),
  expansionInput: document.getElementById("expansion-input"),
  modeSelect: document.getElementById("mode-select"),
  saveBtn: document.getElementById("save-shortcut"),

  statusPill: document.getElementById("status-pill"),
  statusLabel: document.getElementById("status-label"),
  statusDetail: document.getElementById("status-detail")
};

const STORAGE_DEFAULTS = {
  enabled: true,
  shortcuts: {
    // shortcutKey: { text: "...", mode: "inline"|"block"|"smart" }
    tyvm: { text: "Thank you very much for your message! I’ll get back to you shortly.", mode: "inline" }
  }
};

function setStatus(state, label, detail) {
  els.statusPill.dataset.state = state; // clean|dirty|error
  els.statusLabel.textContent = label;
  els.statusDetail.textContent = detail;
}

function setToggleUI(enabled) {
  els.toggleBtn.setAttribute("aria-pressed", String(enabled));
  els.switchEl?.setAttribute("data-on", String(enabled));
  els.toggleText.textContent = enabled ? "On" : "Off";
}

function normalizeKey(key) {
  return (key || "").trim();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getCfg() {
  return await chrome.storage.sync.get(STORAGE_DEFAULTS);
}

async function setCfg(patch) {
  await chrome.storage.sync.set(patch);
}

function renderShortcuts(shortcuts) {
  // Clear
  els.tbody.textContent = "";

  const entries = Object.entries(shortcuts || {});
  if (entries.length === 0) {
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  for (const [key, val] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-shortcut-row", "");

    const modeLabel = (val.mode || "inline").toLowerCase();
    const tagClass = modeLabel === "inline" ? "green" : (modeLabel === "block" ? "red" : "green");

    tr.innerHTML = `
      <td>
        <span class="shortcut-key">
          <span>Key</span>
          <span data-shortcut-key>${escapeHtml(key)}</span>
        </span>
      </td>
      <td>
        <div class="shortcut-preview" data-shortcut-preview>
          <strong>${escapeHtml(val.text || "").slice(0, 40) || "—"}</strong>
        </div>
      </td>
      <td>
        <span class="tag">
          <span class="tag-dot ${tagClass}"></span>
          ${escapeHtml(modeLabel.charAt(0).toUpperCase() + modeLabel.slice(1))}
        </span>
      </td>
      <td>
        <button class="icon-button" type="button" data-edit-shortcut title="Edit">Edit</button>
        <button class="icon-button danger" type="button" data-delete-shortcut title="Delete">Delete</button>
      </td>
    `;

    tr.querySelector("[data-edit-shortcut]").addEventListener("click", () => {
      els.shortcutInput.value = key;
      els.expansionInput.value = val.text || "";
      els.modeSelect.value = val.mode || "inline";
      validate();
      setStatus("dirty", "Editing", "Update fields then Save");
    });

    tr.querySelector("[data-delete-shortcut]").addEventListener("click", async () => {
      const cfg = await getCfg();
      const next = { ...(cfg.shortcuts || {}) };
      delete next[key];
      await setCfg({ shortcuts: next });
      renderShortcuts(next);
      setStatus("clean", "Synced", "Deleted");
    });

    els.tbody.appendChild(tr);
  }
}

function validate() {
  const key = normalizeKey(els.shortcutInput.value);
  const text = (els.expansionInput.value || "").trim();
  els.saveBtn.disabled = !(key && text);
}

async function init() {
  const cfg = await getCfg();
  setToggleUI(!!cfg.enabled);
  renderShortcuts(cfg.shortcuts);
  validate();
  setStatus("clean", "Synced", "All changes saved");
}

els.toggleBtn.addEventListener("click", async () => {
  const cfg = await getCfg();
  const enabled = !cfg.enabled;
  await setCfg({ enabled });
  setToggleUI(enabled);
  setStatus("clean", "Synced", enabled ? "Enabled" : "Disabled");
});

els.addRow.addEventListener("click", () => {
  els.shortcutInput.value = "";
  els.expansionInput.value = "";
  els.modeSelect.value = "inline";
  validate();
  setStatus("dirty", "Editing", "Creating new shortcut");
});

[els.shortcutInput, els.expansionInput, els.modeSelect].forEach((el) => {
  el.addEventListener("input", () => {
    validate();
    setStatus("dirty", "Unsaved", "Press Save to sync changes");
  });
});

els.saveBtn.addEventListener("click", async () => {
  const key = normalizeKey(els.shortcutInput.value);
  const text = (els.expansionInput.value || "").trim();
  const mode = els.modeSelect.value || "inline";

  if (!key || !text) return;

  const cfg = await getCfg();
  const next = { ...(cfg.shortcuts || {}) };
  next[key] = { text, mode };

  await setCfg({ shortcuts: next });
  renderShortcuts(next);
  setStatus("clean", "Synced", "Saved");
});

init().catch(() => setStatus("error", "Error", "Failed to load settings"));