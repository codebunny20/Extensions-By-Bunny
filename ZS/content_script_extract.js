// content_script_extract.js
function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function scoreCandidate(element) {
  if (!element) return 0;
  const text = cleanText(element.innerText || "");
  if (text.length < 120) return 0;

  let score = text.length;
  const tag = element.tagName;
  if (tag === "ARTICLE" || tag === "MAIN") score += 1200;
  if (tag === "SECTION") score += 250;

  const idClass = `${element.id || ""} ${(element.className || "")}`.toLowerCase();
  if (/(article|content|post|entry|main|body)/.test(idClass)) score += 700;
  if (/(comment|nav|footer|header|menu|sidebar|related|advert)/.test(idClass)) score -= 500;

  return score;
}

function findBestRoot() {
  const preferred = document.querySelector("article, main, [role='main']");
  if (preferred && cleanText(preferred.innerText).length > 200) {
    return preferred;
  }

  let best = null;
  let bestScore = 0;
  const candidates = document.querySelectorAll("article, main, section, div");
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best || document.body;
}

function pickTextFromElement(element) {
  return cleanText(element.innerText || element.textContent || "");
}

function extractTable(tableEl) {
  const headerCells = tableEl.querySelectorAll("thead th");
  let headers = Array.from(headerCells).map((cell) => cleanText(cell.innerText));

  const bodyRows = tableEl.querySelectorAll("tbody tr");
  const allRows = bodyRows.length ? bodyRows : tableEl.querySelectorAll("tr");
  const rows = [];

  for (const rowEl of allRows) {
    const cells = rowEl.querySelectorAll("th, td");
    const row = Array.from(cells).map((cell) => cleanText(cell.innerText));
    if (row.some(Boolean)) rows.push(row);
  }

  if (!headers.length && rows.length) {
    const first = rows[0];
    headers = first.map((_, i) => `col_${i + 1}`);
  }

  return {
    headers,
    rows
  };
}

function collectBlocks(root) {
  const blocks = [];
  const tables = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const acceptedTags = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "BLOCKQUOTE", "PRE", "TABLE"]);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!acceptedTags.has(node.tagName)) continue;

    if (node.closest("nav, footer, aside, script, style, noscript")) continue;

    if (node.tagName === "TABLE") {
      const table = extractTable(node);
      if (table.rows.length) {
        tables.push(table);
        blocks.push({ type: "table", tableIndex: tables.length - 1 });
      }
      continue;
    }

    if (/^H[1-6]$/.test(node.tagName)) {
      const text = pickTextFromElement(node);
      if (text) {
        blocks.push({ type: "heading", level: Number(node.tagName[1]), text });
      }
      continue;
    }

    if (node.tagName === "P") {
      const text = pickTextFromElement(node);
      if (text.length > 30) {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }

    if (node.tagName === "UL" || node.tagName === "OL") {
      const items = Array.from(node.querySelectorAll(":scope > li"))
        .map((li) => pickTextFromElement(li))
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: "list", ordered: node.tagName === "OL", items });
      }
      continue;
    }

    if (node.tagName === "BLOCKQUOTE") {
      const text = pickTextFromElement(node);
      if (text) {
        blocks.push({ type: "quote", text });
      }
      continue;
    }

    if (node.tagName === "PRE") {
      const text = cleanText(node.textContent || "");
      if (text) {
        blocks.push({ type: "code", text });
      }
    }
  }

  return { blocks, tables };
}

function buildPlainText(blocks, tables) {
  const lines = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      lines.push(block.text);
      continue;
    }
    if (block.type === "paragraph" || block.type === "quote" || block.type === "code") {
      lines.push(block.text);
      continue;
    }
    if (block.type === "list") {
      for (const item of block.items) lines.push(item);
      continue;
    }
    if (block.type === "table") {
      const table = tables[block.tableIndex];
      if (!table) continue;
      if (table.headers.length) lines.push(table.headers.join(" | "));
      for (const row of table.rows) lines.push(row.join(" | "));
    }
  }

  return lines.filter(Boolean).join("\n\n").trim();
}

function getPagePayload(options = {}) {
  const root = findBestRoot();
  const { blocks, tables } = collectBlocks(root);

  const meta = {
    title: cleanText(document.title || "Untitled"),
    url: location.href,
    extractedAt: new Date().toISOString(),
    rootTag: root.tagName.toLowerCase()
  };

  const text = buildPlainText(blocks, tables) || cleanText(root.innerText || document.body.innerText || "");
  return { meta, text, blocks, tables };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "extractPageText") {
    const payload = getPagePayload(msg.options || {});
    sendResponse({ payload });
  }
  return true;
});
