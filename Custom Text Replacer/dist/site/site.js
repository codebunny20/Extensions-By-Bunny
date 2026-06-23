"use strict";
// Communicates with the content script via window.postMessage.
// The extension's content script bridges these messages to chrome.storage.
const loadBtn = document.getElementById("load");
const saveBtn = document.getElementById("save");
const exportBtn = document.getElementById("export");
const jsonArea = document.getElementById("json");
window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.type !== "SNIPPETS")
        return;
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
    }
    catch {
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
//# sourceMappingURL=site.js.map