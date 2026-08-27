// content_script_extract.js
function isMediaUrl(value) {
  if (!value) return false;

  try {
    const parsed = new URL(value, location.href);
    const pathname = parsed.pathname.toLowerCase();
    return /\.(mp3|mp4)(?:[?#].*)?$/i.test(pathname);
  } catch (error) {
    return false;
  }
}

function getMediaKind(url, fallbackTag) {
  const normalized = String(url || "").toLowerCase();
  if (normalized.endsWith(".mp3") || /\bmp3\b/i.test(normalized)) return "audio";
  if (normalized.endsWith(".mp4") || /\bmp4\b/i.test(normalized)) return "video";
  if (fallbackTag === "VIDEO") return "video";
  if (fallbackTag === "AUDIO") return "audio";
  return "media";
}

function normalizeFilename(url, fallbackType) {
  let name = "media";

  try {
    const parsed = new URL(url, location.href);
    const pathname = parsed.pathname.split("/").pop() || "";
    name = decodeURIComponent(pathname || "");
  } catch (error) {
    name = "";
  }

  const fallbackExtension = fallbackType === "audio" ? "mp3" : "mp4";
  const extension = /\.(mp3|mp4)$/i.test(name) ? "" : `.${fallbackExtension}`;
  const sanitized = (name || `media${extension}`).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const finalName = sanitized || `media-${Date.now()}.${fallbackExtension}`;

  return finalName.length > 180 ? `${finalName.slice(0, 180).replace(/\.[^.]+$/, "")}.${fallbackExtension}` : finalName;
}

function addMediaCandidate(list, url, tagName) {
  if (!url || !isMediaUrl(url)) return;

  const normalized = (() => {
    try {
      return new URL(url, location.href).href;
    } catch (error) {
      return "";
    }
  })();

  if (!normalized) return;

  const type = getMediaKind(normalized, tagName);
  if (type !== "audio" && type !== "video") return;

  if (!list.has(normalized)) {
    list.set(normalized, {
      url: normalized,
      type,
      filename: normalizeFilename(normalized, type),
      source: tagName
    });
  }
}

function collectMediaCandidates() {
  const found = new Map();

  document.querySelectorAll("video, audio, source, a").forEach((element) => {
    const tagName = element.tagName.toUpperCase();
    const directUrl = element.src || element.currentSrc || element.href;
    addMediaCandidate(found, directUrl, tagName);

    const dataSource = element.getAttribute("data-src") || element.getAttribute("data-url");
    addMediaCandidate(found, dataSource, tagName);

    if (tagName === "A") {
      const href = element.getAttribute("href");
      addMediaCandidate(found, href, tagName);
    }
  });

  return Array.from(found.values()).sort((left, right) => left.url.localeCompare(right.url));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "findMedia") {
    sendResponse({ media: collectMediaCandidates() });
  }
  return true;
});
