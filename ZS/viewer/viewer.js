// viewer.js
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'viewer_text';
  const out = document.getElementById('out');
  const meta = document.getElementById('meta');
  const downloadBtn = document.getElementById('download');
  const copyBtn = document.getElementById('copy');
  const closeBtn = document.getElementById('close');

  let currentFormat = 'txt';
  let currentPayload = {
    meta: {
      title: 'Extracted Page Text',
      url: '',
      extractedAt: new Date().toISOString()
    },
    text: '',
    blocks: [],
    tables: []
  };
  let currentFormattedContent = '';

  chrome.storage.local.get(id, res => {
    const stored = res[id];
    const format = typeof stored === 'object' ? stored?.format : 'txt';
    currentPayload = normalizePayload(typeof stored === 'object' ? (stored?.payload || stored) : stored);
    currentFormat = normalizeFormat(format);
    renderDisplay(currentPayload, currentFormat);
    meta.textContent = `Title: ${currentPayload.meta.title} | Length: ${currentPayload.text.length} characters | Format: ${currentFormat.toUpperCase()}`;
    chrome.storage.local.remove(id);
  });

  function resetOutput() {
    if (!out) return;
    out.innerHTML = '';
  }

  function renderTextDisplay(text) {
    if (!out) return;
    resetOutput();
    const pre = document.createElement('pre');
    pre.className = 'out-pre';
    pre.textContent = text;
    out.appendChild(pre);
  }

  function parseCsvLine(line) {
    const cells = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (char === ',' && !quoted) {
        cells.push(value);
        value = '';
        continue;
      }
      value += char;
    }

    cells.push(value);
    return cells;
  }

  function renderCsvDisplay(csvContent) {
    if (!out) return;
    resetOutput();

    const lines = csvContent.split(/\r?\n/).filter((line) => line.length > 0);
    if (!lines.length) {
      renderTextDisplay('');
      return;
    }

    const rows = lines.map(parseCsvLine);
    const table = document.createElement('table');
    table.className = 'csv-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    rows[0].forEach((cell) => {
      const th = document.createElement('th');
      th.textContent = cell;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.slice(1).forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    out.appendChild(table);
  }

  function renderHtmlDisplay(htmlContent) {
    if (!out) return;
    resetOutput();

    const iframe = document.createElement('iframe');
    iframe.className = 'html-preview';
    iframe.setAttribute('sandbox', 'allow-popups');
    iframe.srcdoc = htmlContent;
    out.appendChild(iframe);
  }

  function renderDisplay(payload, format) {
    const serialized = serializeForFormat(payload, format);
    currentFormattedContent = serialized.content;

    if (format === 'html') {
      renderHtmlDisplay(serialized.content);
      return;
    }

    if (format === 'csv') {
      renderCsvDisplay(serialized.content);
      return;
    }

    renderTextDisplay(serialized.content);
  }

  function normalizePayload(payload) {
    if (typeof payload === 'string') {
      return {
        meta: {
          title: 'Extracted Page Text',
          url: '',
          extractedAt: new Date().toISOString()
        },
        text: payload,
        blocks: [],
        tables: []
      };
    }

    const meta = payload?.meta || {};
    return {
      meta: {
        title: String(meta.title || 'Extracted Page Text'),
        url: String(meta.url || ''),
        extractedAt: String(meta.extractedAt || new Date().toISOString())
      },
      text: String(payload?.text || ''),
      blocks: Array.isArray(payload?.blocks) ? payload.blocks : [],
      tables: Array.isArray(payload?.tables) ? payload.tables : []
    };
  }

  function normalizeFormat(format) {
    const allowed = new Set(['txt', 'md', 'json', 'csv', 'html']);
    return allowed.has(format) ? format : 'txt';
  }

  function escapeMarkdown(value) {
    return String(value || '').replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeCsv(value) {
    return `"${String(value || '').replace(/"/g, '""')}"`;
  }

  function renderMarkdown(payload) {
    const { meta, blocks, tables, text } = payload;
    const output = [];

    output.push('---');
    output.push(`title: ${meta.title}`);
    output.push(`url: ${meta.url}`);
    output.push(`extracted_at: ${meta.extractedAt}`);
    output.push('---\n');
    output.push(`# ${escapeMarkdown(meta.title)}\n`);
    if (meta.url) {
      output.push(`Source: ${meta.url}\n`);
    }

    if (!blocks.length) {
      output.push(text);
      return output.join('\n');
    }

    blocks.forEach((block) => {
      if (block.type === 'heading') {
        const level = Math.min(Math.max(Number(block.level || 2), 1), 6);
        output.push(`${'#'.repeat(level)} ${escapeMarkdown(block.text)}`);
        output.push('');
      } else if (block.type === 'paragraph') {
        output.push(block.text);
        output.push('');
      } else if (block.type === 'list') {
        block.items.forEach((item, index) => {
          output.push(block.ordered ? `${index + 1}. ${item}` : `- ${item}`);
        });
        output.push('');
      } else if (block.type === 'quote') {
        output.push(`> ${block.text}`);
        output.push('');
      } else if (block.type === 'code') {
        output.push('```');
        output.push(block.text);
        output.push('```');
        output.push('');
      } else if (block.type === 'table') {
        const table = tables[block.tableIndex];
        if (!table) return;
        const headers = table.headers.length ? table.headers : (table.rows[0] || []).map((_, i) => `col_${i + 1}`);
        if (!headers.length) return;
        output.push(`| ${headers.map((h) => escapeMarkdown(h)).join(' | ')} |`);
        output.push(`| ${headers.map(() => '---').join(' | ')} |`);
        table.rows.forEach((row) => {
          const normalized = headers.map((_, i) => escapeMarkdown(row[i] || ''));
          output.push(`| ${normalized.join(' | ')} |`);
        });
        output.push('');
      }
    });

    return output.join('\n').trim();
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
        ? [...table.headers, ...Array(Math.max(0, width - table.headers.length)).fill('')]
        : Array.from({ length: width }, (_, i) => `col_${i + 1}`);
      const lines = [headers.map(escapeCsv).join(',')];
      table.rows.forEach((row) => {
        const normalized = Array.from({ length: width }, (_, i) => row[i] || '');
        lines.push(normalized.map(escapeCsv).join(','));
      });
      return lines.join('\n');
    }

    const lines = ['section,text'];
    payload.blocks.forEach((block) => {
      if (block.type === 'heading') {
        lines.push(`${escapeCsv('heading')},${escapeCsv(block.text)}`);
      } else if (block.type === 'paragraph') {
        lines.push(`${escapeCsv('paragraph')},${escapeCsv(block.text)}`);
      } else if (block.type === 'quote') {
        lines.push(`${escapeCsv('quote')},${escapeCsv(block.text)}`);
      } else if (block.type === 'list') {
        block.items.forEach((item) => lines.push(`${escapeCsv('list_item')},${escapeCsv(item)}`));
      }
    });

    if (lines.length === 1) {
      lines.push(`${escapeCsv('text')},${escapeCsv(payload.text)}`);
    }
    return lines.join('\n');
  }

  function renderHtml(payload) {
    const { meta, blocks, tables, text } = payload;
    const parts = [];

    parts.push('<!doctype html><html><head><meta charset="utf-8">');
    parts.push(`<title>${escapeHtml(meta.title)}</title>`);
    parts.push('<style>body{font:16px/1.5 Segoe UI,Arial,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}header{border-bottom:1px solid #ddd;margin-bottom:20px;padding-bottom:12px}pre,code{background:#f4f4f4}pre{padding:10px;overflow:auto}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style>');
    parts.push('</head><body>');
    parts.push('<header>');
    parts.push(`<h1>${escapeHtml(meta.title)}</h1>`);
    parts.push(`<p><strong>Source:</strong> <a href="${escapeHtml(meta.url)}">${escapeHtml(meta.url)}</a></p>`);
    parts.push(`<p><strong>Extracted:</strong> ${escapeHtml(meta.extractedAt)}</p>`);
    parts.push('</header>');

    if (!blocks.length) {
      parts.push(`<pre>${escapeHtml(text)}</pre>`);
    } else {
      blocks.forEach((block) => {
        if (block.type === 'heading') {
          const level = Math.min(Math.max(Number(block.level || 2), 1), 6);
          parts.push(`<h${level}>${escapeHtml(block.text)}</h${level}>`);
        } else if (block.type === 'paragraph') {
          parts.push(`<p>${escapeHtml(block.text)}</p>`);
        } else if (block.type === 'quote') {
          parts.push(`<blockquote>${escapeHtml(block.text)}</blockquote>`);
        } else if (block.type === 'code') {
          parts.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`);
        } else if (block.type === 'list') {
          parts.push(block.ordered ? '<ol>' : '<ul>');
          block.items.forEach((item) => parts.push(`<li>${escapeHtml(item)}</li>`));
          parts.push(block.ordered ? '</ol>' : '</ul>');
        } else if (block.type === 'table') {
          const table = tables[block.tableIndex];
          if (!table) return;
          const headers = table.headers.length ? table.headers : (table.rows[0] || []).map((_, i) => `col_${i + 1}`);
          if (!headers.length) return;
          parts.push('<table><thead><tr>');
          headers.forEach((h) => parts.push(`<th>${escapeHtml(h)}</th>`));
          parts.push('</tr></thead><tbody>');
          table.rows.forEach((row) => {
            parts.push('<tr>');
            headers.forEach((_, i) => parts.push(`<td>${escapeHtml(row[i] || '')}</td>`));
            parts.push('</tr>');
          });
          parts.push('</tbody></table>');
        }
      });
    }

    parts.push('</body></html>');
    return parts.join('');
  }

  function serializeForFormat(payload, format) {
    const safePayload = normalizePayload(payload);

    switch (format) {
      case 'md':
        return {
          content: renderMarkdown(safePayload),
          mime: 'text/markdown;charset=utf-8'
        };
      case 'json':
        return {
          content: JSON.stringify(safePayload, null, 2),
          mime: 'application/json;charset=utf-8'
        };
      case 'csv':
        return { content: renderCsv(safePayload), mime: 'text/csv;charset=utf-8' };
      case 'html':
        return { content: renderHtml(safePayload), mime: 'text/html;charset=utf-8' };
      case 'txt':
      default:
        return { content: safePayload.text, mime: 'text/plain;charset=utf-8' };
    }
  }

  function makeBlob(payload, format) {
    const serialized = serializeForFormat(payload, format);
    return new Blob([serialized.content], { type: serialized.mime });
  }

  downloadBtn.addEventListener('click', () => {
    const blob = makeBlob(currentPayload, currentFormat);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-text.${currentFormat}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  copyBtn.addEventListener('click', async () => {
    try {
      if (!currentFormattedContent) {
        currentFormattedContent = serializeForFormat(currentPayload, currentFormat).content;
      }
      await navigator.clipboard.writeText(currentFormattedContent);
    } catch (e) {
      console.error('Copy failed', e);
    }
  });

  closeBtn.addEventListener('click', () => window.close());
});
