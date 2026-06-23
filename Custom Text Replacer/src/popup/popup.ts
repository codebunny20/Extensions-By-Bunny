import { SnippetMap } from "../types/snippets";

const shortcutInput = document.getElementById("shortcut") as HTMLInputElement | null;
const textInput = document.getElementById("text") as HTMLTextAreaElement | null;
const saveBtn = document.getElementById("save") as HTMLButtonElement | null;
const exportBtn = document.getElementById("export") as HTMLButtonElement | null;
const importBtn = document.getElementById("importBtn") as HTMLButtonElement | null;
const importFile = document.getElementById("importFile") as HTMLInputElement | null;
const list = document.getElementById("list") as HTMLUListElement | null;

let snippets: SnippetMap = {};

function renderList(): void {
  if (!list) return;
  list.innerHTML = "";
  for (const [key, val] of Object.entries(snippets)) {
    const li = document.createElement("li");

    const shortcut = document.createElement("span");
    shortcut.className = "shortcut";
    shortcut.textContent = key;

    const preview = document.createElement("span");
    preview.textContent = val.length > 60 ? val.slice(0, 60) + "…" : val;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      delete snippets[key];
      chrome.storage.sync.set({ snippets });
      renderList();
    });

    li.append(shortcut, preview, del);
    list.appendChild(li);
  }
}

chrome.storage.sync.get("snippets", ({ snippets: s }) => {
  snippets = s && typeof s === "object" ? (s as SnippetMap) : {};
  renderList();
});

saveBtn?.addEventListener("click", () => {
  const key = shortcutInput?.value.trim() ?? "";
  const val = textInput?.value ?? "";
  if (!key || !val) return;
  snippets[key] = val;
  chrome.storage.sync.set({ snippets });
  if (shortcutInput) shortcutInput.value = "";
  if (textInput) textInput.value = "";
  renderList();
});

exportBtn?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "snippets.json";
  a.click();
  URL.revokeObjectURL(url);
});

importBtn?.addEventListener("click", () => {
  importFile?.click();
});

importFile?.addEventListener("change", () => {
  const file = importFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        snippets = { ...snippets, ...(data as SnippetMap) };
        chrome.storage.sync.set({ snippets });
        renderList();
      } else {
        alert("Import failed: expected a JSON object.");
      }
    } catch {
      alert("Import failed: invalid JSON file.");
    }
  };
  reader.readAsText(file);
  importFile.value = "";
});
