const SETTINGS_KEY = "readingRulerSettings";

interface RulerSettings {
  enabled: boolean;
  rulerHeight: number;
  dimStrength: number;
  ttsEnabled: boolean;
  autoSpeakSelection: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
}

const DEFAULTS: RulerSettings = {
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

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required popup element: #${id}`);
  }
  return element as T;
}

const enabledInput = getRequiredElement<HTMLInputElement>("enabled");
const heightInput = getRequiredElement<HTMLInputElement>("height");
const dimInput = getRequiredElement<HTMLInputElement>("dim");
const heightValue = getRequiredElement<HTMLElement>("heightValue");
const dimValue = getRequiredElement<HTMLElement>("dimValue");
const ttsEnabledInput = getRequiredElement<HTMLInputElement>("ttsEnabled");
const autoSpeakInput = getRequiredElement<HTMLInputElement>("autoSpeak");
const ttsRateInput = getRequiredElement<HTMLInputElement>("ttsRate");
const ttsPitchInput = getRequiredElement<HTMLInputElement>("ttsPitch");
const ttsVolumeInput = getRequiredElement<HTMLInputElement>("ttsVolume");
const ttsRateValue = getRequiredElement<HTMLElement>("ttsRateValue");
const ttsPitchValue = getRequiredElement<HTMLElement>("ttsPitchValue");
const ttsVolumeValue = getRequiredElement<HTMLElement>("ttsVolumeValue");
const speakBtn = getRequiredElement<HTMLButtonElement>("speakBtn");
const stopBtn = getRequiredElement<HTMLButtonElement>("stopBtn");
const ttsStatus = getRequiredElement<HTMLElement>("ttsStatus");
const ttsPanel = getRequiredElement<HTMLElement>("ttsPanel");
const resetButton = getRequiredElement<HTMLButtonElement>("resetBtn");
const closeButton = getRequiredElement<HTMLButtonElement>("closeBtn");

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeSettings(raw: unknown): RulerSettings {
  const candidate = (raw ?? {}) as Partial<RulerSettings>;

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULTS.enabled,
    rulerHeight:
      typeof candidate.rulerHeight === "number"
        ? clamp(candidate.rulerHeight, MIN_RULER_HEIGHT, MAX_RULER_HEIGHT)
        : DEFAULTS.rulerHeight,
    dimStrength:
      typeof candidate.dimStrength === "number"
        ? clamp(candidate.dimStrength, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH)
        : DEFAULTS.dimStrength,
      ttsEnabled:
        typeof candidate.ttsEnabled === "boolean" ? candidate.ttsEnabled : DEFAULTS.ttsEnabled,
      autoSpeakSelection:
        typeof candidate.autoSpeakSelection === "boolean"
          ? candidate.autoSpeakSelection
          : DEFAULTS.autoSpeakSelection,
      ttsRate:
        typeof candidate.ttsRate === "number"
          ? clamp(candidate.ttsRate, MIN_TTS_RATE, MAX_TTS_RATE)
          : DEFAULTS.ttsRate,
      ttsPitch:
        typeof candidate.ttsPitch === "number"
          ? clamp(candidate.ttsPitch, MIN_TTS_PITCH, MAX_TTS_PITCH)
          : DEFAULTS.ttsPitch,
      ttsVolume:
        typeof candidate.ttsVolume === "number"
          ? clamp(candidate.ttsVolume, MIN_TTS_VOLUME, MAX_TTS_VOLUME)
          : DEFAULTS.ttsVolume,
  };
}

function readSettings(): Promise<RulerSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      resolve(normalizeSettings(result[SETTINGS_KEY]));
    });
  });
}

function writeSettings(settings: RulerSettings): void {
  chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

function render(settings: RulerSettings): void {
  enabledInput.checked = settings.enabled;
  heightInput.value = String(settings.rulerHeight);
  dimInput.value = String(Math.round(settings.dimStrength * 100));
  heightValue.textContent = `${settings.rulerHeight}px`;
  dimValue.textContent = `${Math.round(settings.dimStrength * 100)}%`;

  ttsEnabledInput.checked = settings.ttsEnabled;
  autoSpeakInput.checked = settings.autoSpeakSelection;
  ttsRateInput.value = String(Math.round(settings.ttsRate * 100));
  ttsPitchInput.value = String(Math.round(settings.ttsPitch * 100));
  ttsVolumeInput.value = String(Math.round(settings.ttsVolume * 100));
  ttsRateValue.textContent = `${settings.ttsRate.toFixed(2)}x`;
  ttsPitchValue.textContent = settings.ttsPitch.toFixed(2);
  ttsVolumeValue.textContent = `${Math.round(settings.ttsVolume * 100)}%`;

  speakBtn.disabled = !settings.ttsEnabled;
  stopBtn.disabled = !settings.ttsEnabled;
  ttsPanel.dataset.enabled = String(settings.ttsEnabled);
}

function currentSettingsFromUI(): RulerSettings {
  return {
    enabled: enabledInput.checked,
    rulerHeight: clamp(Number(heightInput.value), MIN_RULER_HEIGHT, MAX_RULER_HEIGHT),
    dimStrength: clamp(Number(dimInput.value) / 100, MIN_DIM_STRENGTH, MAX_DIM_STRENGTH),
    ttsEnabled: ttsEnabledInput.checked,
    autoSpeakSelection: autoSpeakInput.checked,
    ttsRate: clamp(Number(ttsRateInput.value) / 100, MIN_TTS_RATE, MAX_TTS_RATE),
    ttsPitch: clamp(Number(ttsPitchInput.value) / 100, MIN_TTS_PITCH, MAX_TTS_PITCH),
    ttsVolume: clamp(Number(ttsVolumeInput.value) / 100, MIN_TTS_VOLUME, MAX_TTS_VOLUME),
  };
}

function persistFromUI(): void {
  const settings = currentSettingsFromUI();
  render(settings);
  writeSettings(settings);
}

enabledInput.addEventListener("change", persistFromUI);
heightInput.addEventListener("input", persistFromUI);
dimInput.addEventListener("input", persistFromUI);
ttsEnabledInput.addEventListener("change", persistFromUI);
autoSpeakInput.addEventListener("change", persistFromUI);
ttsRateInput.addEventListener("input", persistFromUI);
ttsPitchInput.addEventListener("input", persistFromUI);
ttsVolumeInput.addEventListener("input", persistFromUI);

interface TtsResponse {
  ok: boolean;
  message: string;
}

function setTtsStatus(message: string, isError = false): void {
  ttsStatus.textContent = message;
  ttsStatus.dataset.state = isError ? "error" : "success";
}

function sendMessageToActiveTab(payload: { type: "SPEAK_SELECTION" | "STOP_SPEECH" }): Promise<TtsResponse> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0]?.id;

      if (!activeTabId) {
        resolve({ ok: false, message: "No active tab found." });
        return;
      }

      chrome.tabs.sendMessage(activeTabId, payload, (response?: TtsResponse) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({ ok: false, message: "Cannot connect to this page for TTS." });
          return;
        }

        if (!response) {
          resolve({ ok: false, message: "No response from page." });
          return;
        }

        resolve(response);
      });
    });
  });
}

speakBtn.addEventListener("click", async () => {
  const response = await sendMessageToActiveTab({ type: "SPEAK_SELECTION" });
  setTtsStatus(response.message, !response.ok);
});

stopBtn.addEventListener("click", async () => {
  const response = await sendMessageToActiveTab({ type: "STOP_SPEECH" });
  setTtsStatus(response.message, !response.ok);
});

resetButton.addEventListener("click", () => {
  render(DEFAULTS);
  writeSettings(DEFAULTS);
  setTtsStatus("Settings reset.");
});

closeButton.addEventListener("click", () => {
  window.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    window.close();
  }
});

void (async () => {
  const settings = await readSettings();
  render(settings);
  ttsStatus.dataset.state = "info";
})();
