// viewer.js
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'viewer_text';
  const out = document.getElementById('out');
  const meta = document.getElementById('meta');
  const downloadBtn = document.getElementById('download');
  const copyBtn = document.getElementById('copy');
  const closeBtn = document.getElementById('close');

  chrome.storage.local.get(id, res => {
    const text = res[id] || '';
    out.textContent = text;
    meta.textContent = `Length: ${text.length} characters`;
    chrome.storage.local.remove(id);
  });

  function makeBlob(text) {
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  downloadBtn.addEventListener('click', () => {
    const text = out.textContent || '';
    const blob = makeBlob(text);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page-text.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(out.textContent || '');
    } catch (e) {
      console.error('Copy failed', e);
    }
  });

  closeBtn.addEventListener('click', () => window.close());
});
