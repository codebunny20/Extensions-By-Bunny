// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "show-page-text",
    title: "Show page text",
    contexts: ["page", "selection"]
  });
});

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function extractTextFromTab(tabId, options = {}) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content_script_extract.js"]
    });
    const res = await chrome.tabs.sendMessage(tabId, { action: "extractPageText", options });
    return normalizePayload(res?.payload || res?.text || "");
  } catch (e) {
    console.error("extractTextFromTab failed", e);
    return normalizePayload("");
  }
}

function normalizeFormat(format) {
  const allowed = new Set(["txt", "md", "json", "csv", "html"]);
  return allowed.has(format) ? format : "txt";
}

function normalizePayload(payload) {
  if (typeof payload === "string") {
    return {
      meta: {
        title: "Extracted Page Text",
        url: "",
        extractedAt: new Date().toISOString()
      },
      text: payload,
      blocks: [],
      tables: []
    };
  }

  const meta = payload?.meta || {};
  const text = String(payload?.text || "");
  const blocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
  const tables = Array.isArray(payload?.tables) ? payload.tables : [];

  return {
    meta: {
      title: String(meta.title || "Extracted Page Text"),
      url: String(meta.url || ""),
      extractedAt: String(meta.extractedAt || new Date().toISOString())
    },
    text,
    blocks,
    tables
  };
}

function escapeMarkdown(value) {
  return String(value || "").replace(/[\\`*_{}[\]()#+\-.!|]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeCsv(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function renderMarkdown(payload) {
  const { meta, blocks, tables, text } = payload;
  const output = [];

  output.push("---");
  output.push(`title: ${meta.title}`);
  output.push(`url: ${meta.url}`);
  output.push(`extracted_at: ${meta.extractedAt}`);
  output.push("---\n");
  output.push(`# ${escapeMarkdown(meta.title)}\n`);
  if (meta.url) {
    output.push(`Source: ${meta.url}\n`);
  }

  if (!blocks.length) {
    output.push(text);
    return output.join("\n");
  }

  for (const block of blocks) {
    if (block.type === "heading") {
      const level = Math.min(Math.max(Number(block.level || 2), 1), 6);
      output.push(`${"#".repeat(level)} ${escapeMarkdown(block.text)}`);
      output.push("");
      continue;
    }
    if (block.type === "paragraph") {
      output.push(block.text);
      output.push("");
      continue;
    }
    if (block.type === "list") {
      block.items.forEach((item, index) => {
        output.push(block.ordered ? `${index + 1}. ${item}` : `- ${item}`);
      });
      output.push("");
      continue;
    }
    if (block.type === "quote") {
      output.push(`> ${block.text}`);
      output.push("");
      continue;
    }
    if (block.type === "code") {
      output.push("```");
      output.push(block.text);
      output.push("```");
      output.push("");
      continue;
    }
    if (block.type === "table") {
      const table = tables[block.tableIndex];
      if (!table) continue;

      const headers = table.headers.length ? table.headers : (table.rows[0] || []).map((_, i) => `col_${i + 1}`);
      if (!headers.length) continue;

      output.push(`| ${headers.map((h) => escapeMarkdown(h)).join(" | ")} |`);
      output.push(`| ${headers.map(() => "---").join(" | ")} |`);
      table.rows.forEach((row) => {
        const normalized = headers.map((_, i) => escapeMarkdown(row[i] || ""));
        output.push(`| ${normalized.join(" | ")} |`);
      });
      output.push("");
    }
  }

  return output.join("\n").trim();
}

function renderCsv(payload) {
  const table = payload.tables.find((t) => Array.isArray(t.rows) && t.rows.length > 0);

  if (table) {
    const width = Math.max(
      table.headers?.length || 0,
      ...table.rows.map((r) => r.length),
      1
    );
    const headers = table.headers?.length
      ? [...table.headers, ...Array(Math.max(0, width - table.headers.length)).fill("")]
      : Array.from({ length: width }, (_, i) => `col_${i + 1}`);
    const lines = [headers.map(escapeCsv).join(",")];
    table.rows.forEach((row) => {
      const normalized = Array.from({ length: width }, (_, i) => row[i] || "");
      lines.push(normalized.map(escapeCsv).join(","));
    });
    return lines.join("\n");
  }

  const lines = ["section,text"];
  payload.blocks.forEach((block) => {
    if (block.type === "heading") {
      lines.push(`${escapeCsv("heading")},${escapeCsv(block.text)}`);
    } else if (block.type === "paragraph") {
      lines.push(`${escapeCsv("paragraph")},${escapeCsv(block.text)}`);
    } else if (block.type === "quote") {
      lines.push(`${escapeCsv("quote")},${escapeCsv(block.text)}`);
    } else if (block.type === "list") {
      block.items.forEach((item) => lines.push(`${escapeCsv("list_item")},${escapeCsv(item)}`));
    }
  });

  if (lines.length === 1) {
    lines.push(`${escapeCsv("text")},${escapeCsv(payload.text)}`);
  }
  return lines.join("\n");
}

function renderHtml(payload) {
  const { meta, blocks, tables, text } = payload;
  const parts = [];

  parts.push("<!doctype html><html><head><meta charset=\"utf-8\">");
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  parts.push("<style>body{font:16px/1.5 Segoe UI,Arial,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}header{border-bottom:1px solid #ddd;margin-bottom:20px;padding-bottom:12px}pre,code{background:#f4f4f4}pre{padding:10px;overflow:auto}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style>");
  parts.push("</head><body>");
  parts.push("<header>");
  parts.push(`<h1>${escapeHtml(meta.title)}</h1>`);
  parts.push(`<p><strong>Source:</strong> <a href=\"${escapeHtml(meta.url)}\">${escapeHtml(meta.url)}</a></p>`);
  parts.push(`<p><strong>Extracted:</strong> ${escapeHtml(meta.extractedAt)}</p>`);
  parts.push("</header>");

  if (!blocks.length) {
    parts.push(`<pre>${escapeHtml(text)}</pre>`);
  } else {
    blocks.forEach((block) => {
      if (block.type === "heading") {
        const level = Math.min(Math.max(Number(block.level || 2), 1), 6);
        parts.push(`<h${level}>${escapeHtml(block.text)}</h${level}>`);
      } else if (block.type === "paragraph") {
        parts.push(`<p>${escapeHtml(block.text)}</p>`);
      } else if (block.type === "quote") {
        parts.push(`<blockquote>${escapeHtml(block.text)}</blockquote>`);
      } else if (block.type === "code") {
        parts.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`);
      } else if (block.type === "list") {
        parts.push(block.ordered ? "<ol>" : "<ul>");
        block.items.forEach((item) => parts.push(`<li>${escapeHtml(item)}</li>`));
        parts.push(block.ordered ? "</ol>" : "</ul>");
      } else if (block.type === "table") {
        const table = tables[block.tableIndex];
        if (!table) return;
        const headers = table.headers.length ? table.headers : (table.rows[0] || []).map((_, i) => `col_${i + 1}`);
        if (!headers.length) return;
        parts.push("<table><thead><tr>");
        headers.forEach((h) => parts.push(`<th>${escapeHtml(h)}</th>`));
        parts.push("</tr></thead><tbody>");
        table.rows.forEach((row) => {
          parts.push("<tr>");
          headers.forEach((_, i) => parts.push(`<td>${escapeHtml(row[i] || "")}</td>`));
          parts.push("</tr>");
        });
        parts.push("</tbody></table>");
      }
    });
  }

  parts.push("</body></html>");
  return parts.join("");
}

function serializeForFormat(payload, format) {
  const safePayload = normalizePayload(payload);

  switch (format) {
    case "md":
      return { content: renderMarkdown(safePayload), mime: "text/markdown;charset=utf-8" };
    case "json": {
      return {
        content: JSON.stringify(safePayload, null, 2),
        mime: "application/json;charset=utf-8"
      };
    }
    case "csv":
      return { content: renderCsv(safePayload), mime: "text/csv;charset=utf-8" };
    case "html":
      return { content: renderHtml(safePayload), mime: "text/html;charset=utf-8" };
    case "txt":
    default:
      return { content: safePayload.text, mime: "text/plain;charset=utf-8" };
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "show-page-text") return;
  const payload = await extractTextFromTab(tab.id, { visibleOnly: false });
  const result = await chrome.storage.local.get("settings");
  const format = normalizeFormat(result?.settings?.format);
  openViewerWithText(payload, { format });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== "runReadingZoneText") return;

  (async () => {
    const tabId = sender.tab?.id || (await getActiveTabId());
    if (!tabId) {
      sendResponse({ ok: false, error: "No active tab found." });
      return;
    }

    const format = normalizeFormat(msg?.settings?.format);
    const payload = await extractTextFromTab(tabId, { visibleOnly: false });
    await openViewerWithText(payload, { format });
    sendResponse({ ok: true });
  })().catch((error) => {
    console.error("runReadingZoneText failed", error);
    sendResponse({ ok: false, error: error?.message || "Unknown error" });
  });

  return true;
});

async function openViewerWithText(payload, options = {}) {
  const id = `viewer_text_${Date.now()}`;
  const format = normalizeFormat(options?.format);
  const safePayload = normalizePayload(payload);
  try {
    await chrome.storage.local.set({ [id]: { payload: safePayload, format } });
    const url = chrome.runtime.getURL(`viewer/viewer.html?id=${encodeURIComponent(id)}`);
    chrome.tabs.create({ url });
  } catch (e) {
    console.error("Storage or open viewer failed, falling back to download", e);
    const serialized = serializeForFormat(safePayload, format);
    const blob = new Blob([serialized.content], { type: serialized.mime });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: `page-text.${format}`, conflictAction: "uniquify", saveAs: true }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
}
