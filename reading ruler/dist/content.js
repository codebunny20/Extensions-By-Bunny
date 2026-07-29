"use strict";
if (window.__readingRulerInjected) {
    // Avoid duplicate injection on same page lifecycle.
}
else {
    window.__readingRulerInjected = true;
    const SETTINGS_KEY = "readingRulerSettings";
    const DEFAULTS = {
        enabled: false,
        rulerHeight: 32,
        dimStrength: 0.4,
        ttsEnabled: false,
        autoSpeakSelection: false,
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
    };
    const MIN_RULER_HEIGHT = 8;
    const MAX_RULER_HEIGHT = 240;
    const MIN_DIM_STRENGTH = 0.05;
    const MAX_DIM_STRENGTH = 0.95;
    const MIN_TTS_RATE = 0.5;
    const MAX_TTS_RATE = 2;
    const MIN_TTS_PITCH = 0;
    const MAX_TTS_PITCH = 2;
    const MIN_TTS_VOLUME = 0;
    const MAX_TTS_VOLUME = 1;
    let rulerEnabled = DEFAULTS.enabled;
    let rulerHeight = DEFAULTS.rulerHeight;
    let dimStrength = DEFAULTS.dimStrength;
    let ttsEnabled = DEFAULTS.ttsEnabled;
    let autoSpeakSelection = DEFAULTS.autoSpeakSelection;
    let ttsRate = DEFAULTS.ttsRate;
    let ttsPitch = DEFAULTS.ttsPitch;
    let ttsVolume = DEFAULTS.ttsVolume;
    let lastYCenter = Math.round(window.innerHeight / 2);
    let animationFrameId = 0;
    let showHintTimer;
    let autoSpeakTimer;
    let lastAutoSpokenText = "";
    const rootNode = document.body ?? document.documentElement;
    const readingOverlay = document.createElement("div");
    readingOverlay.style.transition = "background-color 0.15s ease";
    readingOverlay.style.position = "fixed";
    readingOverlay.style.top = "0";
    readingOverlay.style.left = "0";
    readingOverlay.style.width = "100%";
    readingOverlay.style.height = "100%";
    readingOverlay.style.pointerEvents = "none";
    readingOverlay.style.zIndex = "9998";
    readingOverlay.style.display = "none";
    rootNode?.appendChild(readingOverlay);
    const readingRuler = document.createElement("div");
    readingRuler.style.position = "fixed";
    readingRuler.style.left = "0";
    readingRuler.style.width = "100%";
    readingRuler.style.pointerEvents = "none";
    readingRuler.style.zIndex = "9999";
    readingRuler.style.display = "none";
    readingRuler.style.backgroundColor = "rgba(228, 239, 238, 0.15)";
    rootNode?.appendChild(readingRuler);
    const brightenLayer = document.createElement("div");
    brightenLayer.style.position = "absolute";
    brightenLayer.style.top = "0";
    brightenLayer.style.left = "0";
    brightenLayer.style.width = "100%";
    brightenLayer.style.height = "100%";
    brightenLayer.style.pointerEvents = "none";
    const supportsBackdropFilter = typeof CSS !== "undefined" &&
        (CSS.supports("backdrop-filter", "brightness(1.5)") ||
            CSS.supports("-webkit-backdrop-filter", "brightness(1.5)"));
    if (supportsBackdropFilter) {
        brightenLayer.style.backdropFilter = "brightness(1.5)";
        brightenLayer.style.webkitBackdropFilter =
            "brightness(1.5)";
    }
    else {
        brightenLayer.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
    }
    readingRuler.appendChild(brightenLayer);
    const hintPopup = document.createElement("div");
    hintPopup.style.position = "fixed";
    hintPopup.style.bottom = "20px";
    hintPopup.style.left = "20px";
    hintPopup.style.padding = "8px 12px";
    hintPopup.style.background = "rgba(0,0,0,0.75)";
    hintPopup.style.color = "white";
    hintPopup.style.fontSize = "12px";
    hintPopup.style.borderRadius = "6px";
    hintPopup.style.zIndex = "10000";
    hintPopup.style.opacity = "0";
    hintPopup.style.transition = "opacity 0.25s ease";
    hintPopup.style.pointerEvents = "none";
    rootNode?.appendChild(hintPopup);
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    function normalizeSettings(raw) {
        const candidate = (raw ?? {});
        return {
            enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULTS.enabled,
            rulerHeight: typeof candidate.rulerHeight === "number"
                ? clamp(candidate.rulerHeight, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT)
                : DEFAULTS.rulerHeight,
            dimStrength: typeof candidate.dimStrength === "number"
                ? clamp(candidate.dimStrength, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH)
                : DEFAULTS.dimStrength,
            ttsEnabled: typeof candidate.ttsEnabled === "boolean" ? candidate.ttsEnabled : DEFAULTS.ttsEnabled,
            autoSpeakSelection: typeof candidate.autoSpeakSelection === "boolean"
                ? candidate.autoSpeakSelection
                : DEFAULTS.autoSpeakSelection,
            ttsRate: typeof candidate.ttsRate === "number"
                ? clamp(candidate.ttsRate, MIN_TTS_RATE, MAX_TTS_RATE)
                : DEFAULTS.ttsRate,
            ttsPitch: typeof candidate.ttsPitch === "number"
                ? clamp(candidate.ttsPitch, MIN_TTS_PITCH, MAX_TTS_PITCH)
                : DEFAULTS.ttsPitch,
            ttsVolume: typeof candidate.ttsVolume === "number"
                ? clamp(candidate.ttsVolume, MIN_TTS_VOLUME, MAX_TTS_VOLUME)
                : DEFAULTS.ttsVolume,
        };
    }
    function stopSpeech() {
        if (typeof speechSynthesis !== "undefined") {
            speechSynthesis.cancel();
        }
    }
    function getSelectedText() {
        const selected = document.getSelection()?.toString().trim();
        if (selected) {
            return selected;
        }
        const activeElement = document.activeElement;
        const isTextInput = activeElement instanceof HTMLInputElement &&
            /^(text|search|url|tel|password|email)$/i.test(activeElement.type);
        if (activeElement instanceof HTMLTextAreaElement || isTextInput) {
            const input = activeElement;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            if (end > start) {
                return input.value.slice(start, end).trim();
            }
        }
        return "";
    }
    function speakText(text) {
        if (!ttsEnabled) {
            return { ok: false, message: "TTS is disabled." };
        }
        if (typeof speechSynthesis === "undefined") {
            return { ok: false, message: "Speech synthesis is not supported on this page." };
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;
        utterance.volume = ttsVolume;
        stopSpeech();
        speechSynthesis.speak(utterance);
        return { ok: true, message: "Speaking selected text." };
    }
    function speakSelectedText() {
        const text = getSelectedText();
        if (!text) {
            return { ok: false, message: "Select text to speak." };
        }
        return speakText(text);
    }
    function scheduleAutoSpeak() {
        if (!ttsEnabled || !autoSpeakSelection) {
            return;
        }
        if (autoSpeakTimer !== undefined) {
            clearTimeout(autoSpeakTimer);
        }
        autoSpeakTimer = window.setTimeout(() => {
            autoSpeakTimer = undefined;
            const selectedText = getSelectedText();
            if (!selectedText || selectedText === lastAutoSpokenText) {
                return;
            }
            const result = speakText(selectedText);
            if (result.ok) {
                lastAutoSpokenText = selectedText;
            }
        }, 200);
    }
    function showHint(text) {
        hintPopup.textContent = text;
        hintPopup.style.opacity = "1";
        if (showHintTimer !== undefined) {
            clearTimeout(showHintTimer);
        }
        showHintTimer = window.setTimeout(() => {
            hintPopup.style.opacity = "0";
        }, 2000);
    }
    function updateOverlayClip(yCenter) {
        const top = clamp(yCenter - rulerHeight / 2, 0, window.innerHeight);
        const bottom = clamp(yCenter + rulerHeight / 2, 0, window.innerHeight);
        const vh = window.innerHeight;
        readingOverlay.style.clipPath = `polygon(
      0px 0px,
      100% 0px,
      100% ${top}px,
      0px ${top}px,
      0px ${bottom}px,
      100% ${bottom}px,
      100% ${vh}px,
      0px ${vh}px
    )`;
    }
    function renderOverlayStyle() {
        readingOverlay.style.backgroundColor = `rgba(0, 0, 0, ${dimStrength})`;
        readingRuler.style.height = `${rulerHeight}px`;
    }
    function renderRulerPosition() {
        animationFrameId = 0;
        const clampedYCenter = clamp(lastYCenter, 0, window.innerHeight);
        readingRuler.style.top = `${clampedYCenter - rulerHeight / 2}px`;
        updateOverlayClip(clampedYCenter);
    }
    function scheduleRulerRender() {
        if (animationFrameId !== 0) {
            return;
        }
        animationFrameId = requestAnimationFrame(renderRulerPosition);
    }
    function setEnabled(on) {
        rulerEnabled = !!on;
        readingRuler.style.display = rulerEnabled ? "block" : "none";
        readingOverlay.style.display = rulerEnabled ? "block" : "none";
        if (rulerEnabled) {
            scheduleRulerRender();
        }
        else if (animationFrameId !== 0) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
        }
    }
    function applySettings(nextSettings) {
        const safe = normalizeSettings(nextSettings);
        const wasTtsEnabled = ttsEnabled;
        rulerHeight = safe.rulerHeight;
        dimStrength = safe.dimStrength;
        ttsEnabled = safe.ttsEnabled;
        autoSpeakSelection = safe.autoSpeakSelection;
        ttsRate = safe.ttsRate;
        ttsPitch = safe.ttsPitch;
        ttsVolume = safe.ttsVolume;
        if (wasTtsEnabled && !ttsEnabled) {
            stopSpeech();
            lastAutoSpokenText = "";
        }
        if (!autoSpeakSelection) {
            lastAutoSpokenText = "";
        }
        renderOverlayStyle();
        setEnabled(safe.enabled);
    }
    function loadInitialSettings() {
        chrome.storage.sync.get([SETTINGS_KEY], (result) => {
            applySettings(result[SETTINGS_KEY]);
        });
    }
    function persistCurrentSettings() {
        const nextSettings = {
            enabled: rulerEnabled,
            rulerHeight,
            dimStrength,
            ttsEnabled,
            autoSpeakSelection,
            ttsRate,
            ttsPitch,
            ttsVolume,
        };
        chrome.storage.sync.set({
            [SETTINGS_KEY]: nextSettings,
        });
    }
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync" || !changes[SETTINGS_KEY]) {
            return;
        }
        const nextValue = changes[SETTINGS_KEY].newValue;
        applySettings(nextValue);
    });
    document.addEventListener("mousemove", (event) => {
        if (!rulerEnabled) {
            return;
        }
        lastYCenter = event.clientY;
        scheduleRulerRender();
    });
    window.addEventListener("resize", () => {
        if (!rulerEnabled) {
            return;
        }
        scheduleRulerRender();
    });
    document.addEventListener("selectionchange", () => {
        scheduleAutoSpeak();
    });
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || typeof message !== "object") {
            return;
        }
        const action = message.type;
        if (action === "SPEAK_SELECTION") {
            const result = speakSelectedText();
            if (!result.ok) {
                showHint(result.message);
            }
            sendResponse(result);
            return;
        }
        if (action === "STOP_SPEECH") {
            stopSpeech();
            sendResponse({ ok: true, message: "Speech stopped." });
        }
    });
    // Keep keyboard controls as a quick-access alternative.
    document.addEventListener("keydown", (event) => {
        if (!(event.ctrlKey && event.shiftKey)) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === "r") {
            setEnabled(!rulerEnabled);
            persistCurrentSettings();
            showHint(rulerEnabled ? "Reading Ruler on" : "Reading Ruler off");
            return;
        }
        if (key === "s") {
            event.preventDefault();
            const result = speakSelectedText();
            showHint(result.message);
            return;
        }
        if (!rulerEnabled) {
            return;
        }
        if (key === "arrowup") {
            event.preventDefault();
            rulerHeight = clamp(rulerHeight + 4, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT);
            renderOverlayStyle();
            scheduleRulerRender();
            persistCurrentSettings();
            showHint(`Height: ${rulerHeight}px`);
            return;
        }
        if (key === "arrowdown") {
            event.preventDefault();
            rulerHeight = clamp(rulerHeight - 4, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT);
            renderOverlayStyle();
            scheduleRulerRender();
            persistCurrentSettings();
            showHint(`Height: ${rulerHeight}px`);
            return;
        }
        if (key === "arrowleft") {
            event.preventDefault();
            dimStrength = clamp(dimStrength + 0.05, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH);
            renderOverlayStyle();
            persistCurrentSettings();
            showHint(`Dim: ${Math.round(dimStrength * 100)}%`);
            return;
        }
        if (key === "arrowright") {
            event.preventDefault();
            dimStrength = clamp(dimStrength - 0.05, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH);
            renderOverlayStyle();
            persistCurrentSettings();
            showHint(`Dim: ${Math.round(dimStrength * 100)}%`);
        }
    });
    renderOverlayStyle();
    loadInitialSettings();
}
//# sourceMappingURL=content.js.map