// Communicates with the content script via window.postMessage.
// The extension's content script bridges these messages to chrome.storage.

const loadBtn = document.getElementById("load") as HTMLButtonElement | null;
const saveBtn = document.getElementById("save") as HTMLButtonElement | null;
const exportBtn = document.getElementById("export") as HTMLButtonElement | null;
const jsonArea = document.getElementById("json") as HTMLTextAreaElement | null;

window.addEventListener("message", (ev: MessageEvent) => {
  if (!ev.data || ev.data.type !== "SNIPPETS") return;
  if (jsonArea) {
    jsonArea.value = JSON.stringify(ev.data.payload ?? {}, null, 2);
  }
});

loadBtn?.addEventListener("click", () => {
  window.postMessage({ type: "GET_SNIPPETS" }, "*");
});

saveBtn?.addEventListener("click", () => {
  try {
    const data = JSON.parse(jsonArea?.value ?? "{}");
    window.postMessage({ type: "SET_SNIPPETS", payload: data }, "*");
  } catch {
    alert("Invalid JSON – please fix the editor before saving.");
  }
});

exportBtn?.addEventListener("click", () => {
  const content = jsonArea?.value ?? "{}";
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "snippets.json";
  a.click();
  URL.revokeObjectURL(url);
});
