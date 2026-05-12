(function initMagnifier() {
  if (globalThis.__magnifierContentLoaded) {
    return;
  }

  globalThis.__magnifierContentLoaded = true;

  const DEFAULT_SETTINGS = {
    zoom: 2,
    lensSize: 180
  };

  let magnifierEnabled = false;
  let magnifier = null;
  let magnifierView = null;
  let refreshTimer = 0;
  let captureInFlight = false;
  let captureRequestId = 0;
  let lastCaptureUrl = "";
  let lastMouse = null;
  let settings = { ...DEFAULT_SETTINGS };

  let rafId = 0;
  let targetClientX = window.innerWidth / 2;
  let targetClientY = window.innerHeight / 2;
  let curClientX = targetClientX;
  let curClientY = targetClientY;

  const FOLLOW = 0.22;
  const ext = chrome;

  if (ext?.runtime?.onMessage) {
    ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.action === "magnifier:ping") {
        sendResponse({ ok: true });
        return false;
      }

      if (msg?.action === "toggleMagnifier") {
        applySettings(msg.settings);
        setMagnifierEnabled(!magnifierEnabled);
        sendResponse({ ok: true, enabled: magnifierEnabled });
        return false;
      }

      if (msg?.action === "updateMagnifierSettings") {
        applySettings(msg.settings);
        sendResponse({ ok: true, settings });
        return false;
      }

      return false;
    });
  }

  function setMagnifierEnabled(next) {
    const enabled = Boolean(next);
    if (enabled === magnifierEnabled) return;

    magnifierEnabled = enabled;
    if (enabled) {
      enableMagnifier();
    } else {
      disableMagnifier();
    }
  }

  function applySettings(nextSettings = {}) {
    settings = {
      zoom: clampNumber(nextSettings.zoom, settings.zoom, 1.25, 4),
      lensSize: clampNumber(nextSettings.lensSize, settings.lensSize, 120, 280)
    };

    if (magnifier) {
      magnifier.style.width = `${settings.lensSize}px`;
      magnifier.style.height = `${settings.lensSize}px`;
    }

    updateLensView();
  }

  function enableMagnifier() {
    if (!magnifier) {
      magnifier = document.createElement("div");
      magnifier.id = "magnifier";
      magnifier.setAttribute("aria-hidden", "true");
      magnifier.tabIndex = -1;

      magnifierView = document.createElement("div");
      magnifierView.id = "magnifier__view";
      magnifierView.setAttribute("aria-hidden", "true");

      magnifier.appendChild(magnifierView);
      (document.body || document.documentElement).appendChild(magnifier);
    }

    const initX = lastMouse?.clientX ?? window.innerWidth / 2;
    const initY = lastMouse?.clientY ?? window.innerHeight / 2;
    targetClientX = curClientX = initX;
    targetClientY = curClientY = initY;

    applySettings(settings);

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });

    requestCapture();
    startRenderLoop();
  }

  function disableMagnifier() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", onViewportChange);
    window.removeEventListener("resize", onViewportChange);

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = 0;
    }

    stopRenderLoop();
    captureRequestId += 1;
    captureInFlight = false;
    lastCaptureUrl = "";

    if (magnifierView) {
      magnifierView.style.backgroundImage = "none";
    }

    if (magnifier) {
      magnifier.remove();
    }

    magnifier = null;
    magnifierView = null;
  }

  function onKeyDown(event) {
    if (event.key === "Escape" && magnifierEnabled) {
      setMagnifierEnabled(false);
    }
  }

  function onMouseMove(event) {
    lastMouse = event;
    targetClientX = event.clientX;
    targetClientY = event.clientY;
  }

  function onViewportChange() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
      refreshTimer = 0;
      requestCapture();
    }, 120);
  }

  function requestCapture() {
    if (!magnifierEnabled || captureInFlight || !ext?.runtime?.sendMessage) {
      return;
    }

    const requestId = ++captureRequestId;
    captureInFlight = true;

    setLensCaptureVisibility(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!magnifierEnabled || requestId !== captureRequestId) {
          captureInFlight = false;
          setLensCaptureVisibility(true);
          return;
        }

        ext.runtime.sendMessage({ action: "magnifier:capture" }, (response) => {
          captureInFlight = false;
          setLensCaptureVisibility(true);

          if (!magnifierEnabled || requestId !== captureRequestId) {
            return;
          }

          if (ext.runtime.lastError || !response?.ok || !response.dataUrl) {
            return;
          }

          lastCaptureUrl = response.dataUrl;
          updateLensView();
        });
      });
    });
  }

  function startRenderLoop() {
    stopRenderLoop();
    rafId = requestAnimationFrame(renderTick);
  }

  function stopRenderLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = 0;
  }

  function renderTick() {
    if (!magnifierEnabled || !magnifier) {
      rafId = 0;
      return;
    }

    curClientX = lerp(curClientX, targetClientX, FOLLOW);
    curClientY = lerp(curClientY, targetClientY, FOLLOW);

    const half = settings.lensSize / 2;
    const x = clamp(curClientX, half, window.innerWidth - half);
    const y = clamp(curClientY, half, window.innerHeight - half);

    magnifier.style.left = `${x}px`;
    magnifier.style.top = `${y}px`;

    updateLensView();
    rafId = requestAnimationFrame(renderTick);
  }

  function updateLensView() {
    if (!magnifierView) return;

    const half = settings.lensSize / 2;

    magnifierView.style.backgroundSize = `${window.innerWidth * settings.zoom}px ${window.innerHeight * settings.zoom}px`;
    magnifierView.style.backgroundPosition = `${-curClientX * settings.zoom + half}px ${-curClientY * settings.zoom + half}px`;

    if (lastCaptureUrl) {
      magnifierView.style.backgroundImage = `url(${lastCaptureUrl})`;
    }
  }

  function setLensCaptureVisibility(visible) {
    if (!magnifier) return;
    magnifier.style.visibility = visible ? "visible" : "hidden";
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampNumber(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return clamp(numeric, min, max);
  }
})();