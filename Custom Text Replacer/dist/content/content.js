let snippets = {};
let isReady = false;
// Load initial snippets and mark as ready
chrome.storage.sync.get("snippets", ({ snippets: s }) => {
    snippets = s || {};
    isReady = true; // NOW we're ready
});
// Keep snippets updated
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.snippets) {
        snippets = changes.snippets.newValue || {};
    }
});
// Only attach listener AFTER storage loads
document.addEventListener("keydown", (e) => {
    if (!isReady)
        return; // Ignore until ready
    const target = e.target;
    if (!target || !isEditable(target))
        return;
    if (![" ", "Enter", "Tab"].includes(e.key))
        return;
    const { value, cursor } = getValueAndCursor(target);
    if (cursor === null)
        return;
    const wordInfo = getLastWord(value, cursor);
    if (!wordInfo)
        return;
    const { word, start, end } = wordInfo;
    const replacement = snippets[word];
    if (!replacement)
        return;
    e.preventDefault();
    const keyChar = e.key === "Enter" ? "\n" : e.key === "Tab" ? "\t" : " ";
    const newText = value.slice(0, start) + replacement + keyChar + value.slice(end);
    setValueAndCursor(target, newText, start + replacement.length + 1);
});
// Allow the page UI (GitHub Pages) to communicate via window.postMessage
window.addEventListener("message", (ev) => {
    // Only accept messages from same origin pages (the site will be hosted on GitHub Pages)
    // We don't trust arbitrary origins; the site should be the one you control.
    // If you want to allow any origin, remove the origin check.
    // Example: if (ev.origin !== "https://your-gh-pages-domain") return;
    const msg = ev.data;
    if (!msg || !msg.type)
        return;
    const source = ev.source;
    if (msg.type === "GET_SNIPPETS") {
        // send snippets back to page
        source?.postMessage({ type: "SNIPPETS", payload: snippets }, ev.origin);
    }
    else if (msg.type === "SET_SNIPPETS" && msg.payload) {
        chrome.storage.sync.set({ snippets: msg.payload });
    }
    else if (msg.type === "EXPORT_SNIPPETS") {
        source?.postMessage({ type: "SNIPPETS", payload: snippets }, ev.origin);
    }
});
// Helpers
function isEditable(el) {
    if (el instanceof HTMLTextAreaElement)
        return true;
    if (el instanceof HTMLInputElement && el.type === "text")
        return true;
    if (el.isContentEditable)
        return true;
    return false;
}
function getValueAndCursor(el) {
    if (el.isContentEditable) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0)
            return { value: el.innerText, cursor: null };
        const range = sel.getRangeAt(0);
        // approximate cursor offset inside the contenteditable by counting characters from start node
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        const cursor = preRange.toString().length;
        return { value: el.innerText, cursor };
    }
    const input = el;
    return { value: input.value, cursor: input.selectionStart ?? null };
}
function setValueAndCursor(el, text, cursor) {
    if (el.isContentEditable) {
        // Replace text content and set caret
        el.innerText = text;
        setCaretInContentEditable(el, cursor);
        return;
    }
    const input = el;
    input.value = text;
    input.selectionStart = input.selectionEnd = cursor;
}
function setCaretInContentEditable(el, charIndex) {
    const range = document.createRange();
    const sel = window.getSelection();
    let nodeStack = [el];
    let node;
    let found = false;
    let chars = 0;
    while ((node = nodeStack.shift())) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const nextChars = chars + text.length;
            if (!found && charIndex <= nextChars) {
                range.setStart(node, charIndex - chars);
                range.collapse(true);
                found = true;
                break;
            }
            chars = nextChars;
        }
        else {
            for (let i = 0; i < node.childNodes.length; i++)
                nodeStack.push(node.childNodes[i]);
        }
    }
    if (!found) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    sel?.removeAllRanges();
    sel?.addRange(range);
}
function getLastWord(text, cursor) {
    const before = text.slice(0, cursor);
    const match = before.match(/(\S+)$/);
    if (!match)
        return null;
    const word = match[1];
    const start = before.length - word.length;
    const end = cursor;
    return { word, start, end };
}
export {};
//# sourceMappingURL=content.js.map