const stopButton = document.getElementById("stopScroll") as HTMLButtonElement | null;
const pauseResumeButton = document.getElementById("pauseResume") as HTMLButtonElement | null;
const speedSlider = document.getElementById("scrollSpeed") as HTMLInputElement | null;
const speedValue = document.getElementById("speedValue");
const speedRangeHint = document.getElementById("speedRangeHint");
const directionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-direction]"));
const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const doneSettingsButton = document.getElementById("doneSettingsButton");
const loopToggle = document.getElementById("loopToggle") as HTMLInputElement | null;
const hardResetToggle = document.getElementById("hardResetToggle") as HTMLInputElement | null;
const extensionEnabledToggle = document.getElementById("extensionEnabledToggle") as HTMLInputElement | null;
const jumpScrollToggle = document.getElementById("jumpScrollToggle") as HTMLInputElement | null;
const slowMoToggle = document.getElementById("slowMoToggle") as HTMLInputElement | null;
const lineDelaySlider = document.getElementById("lineDelay") as HTMLInputElement | null;
const lineDelayValue = document.getElementById("lineDelayValue");
const privacyPolicyButton = document.getElementById("privacyPolicyButton");
// Storage keys keep popup preferences persistent across popup open/close cycles.
const SPEED_STORAGE_KEY = "scrollSpeed";
const DIRECTION_STORAGE_KEY = "scrollDirection";
const LOOP_STORAGE_KEY = "loopAtEnd";
const HARD_RESET_ON_STOP_STORAGE_KEY = "hardResetOnStop";
const EXTENSION_ENABLED_STORAGE_KEY = "extensionEnabled";
const JUMP_SCROLL_STORAGE_KEY = "jumpScrollEnabled";
const SLOW_MO_STORAGE_KEY = "slowMoModeEnabled";
const NORMAL_SPEED_STORAGE_KEY = "normalScrollSpeed";
const SLOW_SPEED_STORAGE_KEY = "slowMoScrollSpeed";
const LINE_DELAY_STORAGE_KEY = "lineDelayMs";
const PRIVACY_POLICY_PAGE_PATH_CANDIDATES = [
  "Privacy policy/privacy-policy.html",
  "privacy-policy.html"
] as const;
const DEFAULT_SPEED = 3;
const DEFAULT_DIRECTION: ScrollDirection = "down";
const DEFAULT_LOOP = false;
const DEFAULT_HARD_RESET_ON_STOP = true;
const DEFAULT_EXTENSION_ENABLED = true;
const DEFAULT_JUMP_SCROLL = false;
const DEFAULT_SLOW_MO_MODE = false;
const DEFAULT_SLOW_SPEED = 0.5;
const DEFAULT_LINE_DELAY_MS = 220;
const MAX_SPEED = 20;
const NORMAL_MIN_SPEED = 1;
const SLOW_MO_MIN_SPEED = 0.1;

type ScrollDirection = "up" | "left" | "down" | "right";
type ScrollAction = "start" | "pause" | "resume" | "stop" | "status";

type ScrollRuntimeState = "idle" | "running" | "paused";

type ScrollStatus = {
  isRunning?: boolean;
  isPaused?: boolean;
};

let selectedDirection: ScrollDirection = DEFAULT_DIRECTION;
let loopAtEnd: boolean = DEFAULT_LOOP;
let hardResetOnStop = DEFAULT_HARD_RESET_ON_STOP;
let extensionEnabled = DEFAULT_EXTENSION_ENABLED;
let jumpScrollEnabled = DEFAULT_JUMP_SCROLL;
let slowMoModeEnabled = DEFAULT_SLOW_MO_MODE;
let normalModeSpeed = DEFAULT_SPEED;
let slowMoModeSpeed = DEFAULT_SLOW_SPEED;
let lineDelayMs = DEFAULT_LINE_DELAY_MS;
let runtimeState: ScrollRuntimeState = "idle";

function roundSpeedForMode(value: number, isSlowMode: boolean): number {
  if (!isSlowMode) {
    return Math.round(value);
  }

  return Math.round(value * 10) / 10;
}

function clampSpeedForMode(value: number, isSlowMode: boolean): number {
  const minSpeed = isSlowMode ? SLOW_MO_MIN_SPEED : NORMAL_MIN_SPEED;
  return roundSpeedForMode(Math.min(MAX_SPEED, Math.max(minSpeed, value)), isSlowMode);
}

function getMinimumSpeed(): number {
  return slowMoModeEnabled ? SLOW_MO_MIN_SPEED : NORMAL_MIN_SPEED;
}

function clampSpeed(value: number): number {
  // Constrain user input so scrolling remains smooth and predictable.
  return clampSpeedForMode(value, slowMoModeEnabled);
}

function formatSpeed(value: number): string {
  if (!slowMoModeEnabled) {
    return String(Math.round(value));
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function updateSpeedControl(): void {
  if (!speedSlider) {
    return;
  }

  speedSlider.min = String(getMinimumSpeed());
  speedSlider.max = String(MAX_SPEED);
  speedSlider.step = slowMoModeEnabled ? "0.1" : "1";
  speedSlider.value = String(clampSpeed(Number(speedSlider.value)));
}

function updateSpeedRangeHint(): void {
  if (!speedRangeHint) {
    return;
  }

  speedRangeHint.textContent = slowMoModeEnabled ? "Range: 0.1x to 20x" : "Range: 1x to 20x";
}

function setSavedSpeedForMode(value: number, isSlowMode: boolean): void {
  const clamped = clampSpeedForMode(value, isSlowMode);

  if (isSlowMode) {
    slowMoModeSpeed = clamped;
    return;
  }

  normalModeSpeed = clamped;
}

function setSavedSpeedForCurrentMode(value: number): void {
  setSavedSpeedForMode(value, slowMoModeEnabled);
}

function getSavedSpeedForCurrentMode(): number {
  return slowMoModeEnabled ? slowMoModeSpeed : normalModeSpeed;
}

function applySavedSpeedToSlider(): void {
  if (!speedSlider) {
    return;
  }

  speedSlider.value = String(getSavedSpeedForCurrentMode());
}

function isScrollDirection(value: string): value is ScrollDirection {
  return value === "up" || value === "left" || value === "down" || value === "right";
}

function clampLineDelay(value: number): number {
  return Math.min(1200, Math.max(60, Math.round(value / 20) * 20));
}

function getSpeed(): number {
  // Read from the slider each time so commands always use the latest UI value.
  const parsed = Number(speedSlider?.value ?? String(DEFAULT_SPEED));

  if (!Number.isFinite(parsed)) {
    return DEFAULT_SPEED;
  }

  return clampSpeed(parsed);
}

function updateSpeedLabel(): void {
  if (speedValue) {
    speedValue.textContent = formatSpeed(getSpeed());
  }
}

function updateLineDelayLabel(): void {
  if (lineDelayValue) {
    lineDelayValue.textContent = `${lineDelayMs} ms`;
  }
}

function updateDirectionButtons(): void {
  for (const button of directionButtons) {
    const buttonDirection = button.dataset.direction;
    const isActive = buttonDirection === selectedDirection;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function saveSpeed(speed: number): Promise<void> {
  try {
    await chrome.storage.local.set({ [SPEED_STORAGE_KEY]: clampSpeed(speed) });
  } catch (error: unknown) {
    console.warn("Unable to save speed setting:", error);
  }
}

async function saveDirection(direction: ScrollDirection): Promise<void> {
  try {
    await chrome.storage.local.set({ [DIRECTION_STORAGE_KEY]: direction });
  } catch (error: unknown) {
    console.warn("Unable to save direction setting:", error);
  }
}

async function saveLoopSetting(loop: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [LOOP_STORAGE_KEY]: loop });
  } catch (error: unknown) {
    console.warn("Unable to save loop setting:", error);
  }
}

async function saveHardResetSetting(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [HARD_RESET_ON_STOP_STORAGE_KEY]: enabled });
  } catch (error: unknown) {
    console.warn("Unable to save hard reset setting:", error);
  }
}

async function saveExtensionEnabledSetting(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [EXTENSION_ENABLED_STORAGE_KEY]: enabled });
  } catch (error: unknown) {
    console.warn("Unable to save extension enabled setting:", error);
  }
}

async function saveJumpScrollSetting(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [JUMP_SCROLL_STORAGE_KEY]: enabled });
  } catch (error: unknown) {
    console.warn("Unable to save jump scroll setting:", error);
  }
}

async function saveSlowMoModeSetting(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [SLOW_MO_STORAGE_KEY]: enabled });
  } catch (error: unknown) {
    console.warn("Unable to save slow-mo mode setting:", error);
  }
}

async function saveModeSpeeds(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [NORMAL_SPEED_STORAGE_KEY]: clampSpeedForMode(normalModeSpeed, false),
      [SLOW_SPEED_STORAGE_KEY]: clampSpeedForMode(slowMoModeSpeed, true)
    });
  } catch (error: unknown) {
    console.warn("Unable to save mode speed settings:", error);
  }
}

async function saveLineDelaySetting(delayMs: number): Promise<void> {
  try {
    await chrome.storage.local.set({ [LINE_DELAY_STORAGE_KEY]: clampLineDelay(delayMs) });
  } catch (error: unknown) {
    console.warn("Unable to save line delay setting:", error);
  }
}

async function restoreSavedSettings(): Promise<void> {
  if (!speedSlider) {
    updateDirectionButtons();
    return;
  }

  try {
    // Treat storage payloads as untrusted and validate each setting before use.
    const result = await chrome.storage.local.get([
      SPEED_STORAGE_KEY,
      DIRECTION_STORAGE_KEY,
      LOOP_STORAGE_KEY,
      HARD_RESET_ON_STOP_STORAGE_KEY,
      EXTENSION_ENABLED_STORAGE_KEY,
      JUMP_SCROLL_STORAGE_KEY,
      SLOW_MO_STORAGE_KEY,
      NORMAL_SPEED_STORAGE_KEY,
      SLOW_SPEED_STORAGE_KEY,
      LINE_DELAY_STORAGE_KEY
    ]);
    const savedDirection = result?.[DIRECTION_STORAGE_KEY];
    const savedLoop = result?.[LOOP_STORAGE_KEY];
    const savedHardReset = result?.[HARD_RESET_ON_STOP_STORAGE_KEY];
    const savedExtensionEnabled = result?.[EXTENSION_ENABLED_STORAGE_KEY];
    const savedJumpScroll = result?.[JUMP_SCROLL_STORAGE_KEY];
    const savedSlowMoMode = result?.[SLOW_MO_STORAGE_KEY];
    const savedNormalSpeed = result?.[NORMAL_SPEED_STORAGE_KEY];
    const savedSlowSpeed = result?.[SLOW_SPEED_STORAGE_KEY];
    const savedValue = result?.[SPEED_STORAGE_KEY];
    const savedLineDelay = result?.[LINE_DELAY_STORAGE_KEY];

    if (typeof savedSlowMoMode === "boolean") {
      slowMoModeEnabled = savedSlowMoMode;
    }

    if (typeof savedNormalSpeed === "number" && Number.isFinite(savedNormalSpeed)) {
      normalModeSpeed = clampSpeedForMode(savedNormalSpeed, false);
    }

    if (typeof savedSlowSpeed === "number" && Number.isFinite(savedSlowSpeed)) {
      slowMoModeSpeed = clampSpeedForMode(savedSlowSpeed, true);
    }

    if (typeof savedValue === "number" && Number.isFinite(savedValue)) {
      if (slowMoModeEnabled && !(typeof savedSlowSpeed === "number" && Number.isFinite(savedSlowSpeed))) {
        slowMoModeSpeed = clampSpeedForMode(savedValue, true);
      }

      if (!slowMoModeEnabled && !(typeof savedNormalSpeed === "number" && Number.isFinite(savedNormalSpeed))) {
        normalModeSpeed = clampSpeedForMode(savedValue, false);
      }
    }

    updateSlowMoToggle();
    updateSpeedControl();
    applySavedSpeedToSlider();
    updateSpeedRangeHint();

    if (typeof savedDirection === "string" && isScrollDirection(savedDirection)) {
      selectedDirection = savedDirection;
    }

    if (typeof savedLoop === "boolean") {
      loopAtEnd = savedLoop;
    }

    if (typeof savedHardReset === "boolean") {
      hardResetOnStop = savedHardReset;
    }

    if (typeof savedExtensionEnabled === "boolean") {
      extensionEnabled = savedExtensionEnabled;
    }

    if (typeof savedJumpScroll === "boolean") {
      jumpScrollEnabled = savedJumpScroll;
    }

    if (typeof savedLineDelay === "number" && Number.isFinite(savedLineDelay)) {
      lineDelayMs = clampLineDelay(savedLineDelay);
    }
  } catch (error: unknown) {
    console.warn("Unable to restore saved settings:", error);
  }

  updateSpeedLabel();
  updateDirectionButtons();
  updateLoopToggle();
  updateHardResetToggle();
  updateExtensionEnabledToggle();
  updateJumpScrollToggle();
  updateLineDelayControl();
  updateLineDelayLabel();
  updateControlAvailability();
}

function updateLoopToggle(): void {
  if (loopToggle) {
    loopToggle.checked = loopAtEnd;
  }
}

function updateHardResetToggle(): void {
  if (hardResetToggle) {
    hardResetToggle.checked = hardResetOnStop;
  }
}

function updateExtensionEnabledToggle(): void {
  if (extensionEnabledToggle) {
    extensionEnabledToggle.checked = extensionEnabled;
  }
}

function updateJumpScrollToggle(): void {
  if (jumpScrollToggle) {
    jumpScrollToggle.checked = jumpScrollEnabled;
  }
}

function updateSlowMoToggle(): void {
  if (slowMoToggle) {
    slowMoToggle.checked = slowMoModeEnabled;
  }
}

function updateLineDelayControl(): void {
  if (lineDelaySlider) {
    lineDelaySlider.value = String(clampLineDelay(lineDelayMs));
    lineDelaySlider.disabled = !jumpScrollEnabled || !extensionEnabled;
  }
}

function updateControlAvailability(): void {
  if (speedSlider) {
    speedSlider.disabled = !extensionEnabled;
  }

  for (const button of directionButtons) {
    button.disabled = !extensionEnabled;
  }

  if (stopButton) {
    stopButton.disabled = !extensionEnabled;
  }

  if (jumpScrollToggle) {
    jumpScrollToggle.disabled = !extensionEnabled;
  }

  if (slowMoToggle) {
    slowMoToggle.disabled = !extensionEnabled;
  }

  updateLineDelayControl();

  updatePauseResumeButton();
}

async function sendScrollCommand(
  action: ScrollAction,
  options?: {
    speed?: number;
    direction?: ScrollDirection;
    loop?: boolean;
    reset?: boolean;
    jumpScroll?: boolean;
    slowMode?: boolean;
    lineDelayMs?: number;
  }
): Promise<void> {
  await sendScrollMessage<void>(action, options);
}

function updatePauseResumeButton(): void {
  if (!pauseResumeButton) {
    return;
  }

  if (!extensionEnabled) {
    pauseResumeButton.textContent = "Pause";
    pauseResumeButton.disabled = true;
    return;
  }

  if (runtimeState === "paused") {
    pauseResumeButton.textContent = "Resume";
    pauseResumeButton.disabled = false;
    return;
  }

  pauseResumeButton.textContent = "Pause";
  pauseResumeButton.disabled = runtimeState !== "running";
}

function setRuntimeState(state: ScrollRuntimeState): void {
  runtimeState = state;
  updatePauseResumeButton();
}

async function sendScrollMessage<T>(
  action: ScrollAction,
  options?: {
    speed?: number;
    direction?: ScrollDirection;
    loop?: boolean;
    reset?: boolean;
    jumpScroll?: boolean;
    slowMode?: boolean;
    lineDelayMs?: number;
  }
): Promise<T | undefined> {
  if (!extensionEnabled && action !== "stop" && action !== "status") {
    return undefined;
  }

  const tabId = await getActiveTabId();

  if (!tabId) {
    return undefined;
  }

  const payload = {
    action,
    ...(options?.speed !== undefined ? { speed: options.speed } : {}),
    ...(options?.direction !== undefined ? { direction: options.direction } : {}),
    ...(options?.loop !== undefined ? { loop: options.loop } : {}),
    ...(options?.reset !== undefined ? { reset: options.reset } : {}),
    ...(options?.jumpScroll !== undefined ? { jumpScroll: options.jumpScroll } : {}),
    ...(options?.slowMode !== undefined ? { slowMode: options.slowMode } : {}),
    ...(options?.lineDelayMs !== undefined ? { lineDelayMs: options.lineDelayMs } : {})
  };

  try {
    // Send command to the content script already running in the active tab.
    return await chrome.tabs.sendMessage(tabId, payload) as T;
  } catch (error: unknown) {
    // If there is no receiver, inject the script and retry once.
    if (error instanceof Error && error.message.includes("Receiving end does not exist")) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/scroll.js"]
        });
        return await chrome.tabs.sendMessage(tabId, payload) as T;
      } catch (injectError: unknown) {
        console.warn("Unable to inject content script:", injectError);
      }
    }

    // Content scripts are not available on restricted pages like chrome:// URLs.
    console.warn("Unable to send command to page:", error);
    return undefined;
  }
}

async function syncRuntimeState(): Promise<void> {
  if (!extensionEnabled) {
    setRuntimeState("idle");
    return;
  }

  const status = await sendScrollMessage<ScrollStatus>("status");

  if (status?.isRunning) {
    setRuntimeState("running");
    return;
  }

  if (status?.isPaused) {
    setRuntimeState("paused");
    return;
  }

  setRuntimeState("idle");
}

async function resolvePrivacyPolicyUrl(): Promise<string> {
  // Probe known locations so popup links survive file moves/renames.
  for (const path of PRIVACY_POLICY_PAGE_PATH_CANDIDATES) {
    const candidateUrl = chrome.runtime.getURL(path);

    try {
      const response = await fetch(candidateUrl, { cache: "no-store" });

      if (response.ok) {
        return candidateUrl;
      }
    } catch {
      // Ignore and try the next candidate.
    }
  }

  return chrome.runtime.getURL(PRIVACY_POLICY_PAGE_PATH_CANDIDATES[0]);
}

function openSettingsModal(): void {
  settingsModal?.classList.add("active");
}

function closeSettingsModal(): void {
  settingsModal?.classList.remove("active");
}

function isSettingsOpen(): boolean {
  return settingsModal?.classList.contains("active") ?? false;
}

if (speedSlider) {
  speedSlider.addEventListener("input", () => {
    const speed = getSpeed();
    setSavedSpeedForCurrentMode(speed);
    applySavedSpeedToSlider();
    updateSpeedLabel();
    void saveSpeed(speed);
    void saveModeSpeeds();
  });
}

for (const button of directionButtons) {
  button.addEventListener("click", () => {
    if (!extensionEnabled) {
      return;
    }

    const direction = button.dataset.direction;

    if (!direction || !isScrollDirection(direction)) {
      return;
    }

    selectedDirection = direction;
    updateDirectionButtons();
    void saveDirection(direction);
    // Direction button acts as "start" and sends current speed + loop mode.
    void sendScrollCommand("start", {
      speed: getSpeed(),
      direction,
      loop: loopAtEnd,
      jumpScroll: jumpScrollEnabled,
      slowMode: slowMoModeEnabled,
      lineDelayMs
    });
    setRuntimeState("running");
  });
}

if (settingsButton) {
  settingsButton.addEventListener("click", () => {
    if (isSettingsOpen()) {
      closeSettingsModal();
      return;
    }

    openSettingsModal();
  });
}

if (closeSettings) {
  closeSettings.addEventListener("click", () => {
    closeSettingsModal();
  });
}

if (doneSettingsButton) {
  doneSettingsButton.addEventListener("click", () => {
    closeSettingsModal();
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !isSettingsOpen()) {
    return;
  }

  closeSettingsModal();
});

if (loopToggle) {
  loopToggle.addEventListener("change", () => {
    loopAtEnd = loopToggle.checked;
    // Save only; new mode will be applied next time start is triggered.
    void saveLoopSetting(loopAtEnd);
  });
}

if (hardResetToggle) {
  hardResetToggle.addEventListener("change", () => {
    hardResetOnStop = hardResetToggle.checked;
    void saveHardResetSetting(hardResetOnStop);
  });
}

if (extensionEnabledToggle) {
  extensionEnabledToggle.addEventListener("change", () => {
    extensionEnabled = extensionEnabledToggle.checked;
    void saveExtensionEnabledSetting(extensionEnabled);
    updateControlAvailability();

    if (!extensionEnabled) {
      void sendScrollCommand("stop", { direction: selectedDirection, reset: hardResetOnStop });
      setRuntimeState("idle");
      return;
    }

    void syncRuntimeState();
  });
}

if (jumpScrollToggle) {
  jumpScrollToggle.addEventListener("change", () => {
    jumpScrollEnabled = jumpScrollToggle.checked;
    updateLineDelayControl();
    void saveJumpScrollSetting(jumpScrollEnabled);

    if (!extensionEnabled) {
      return;
    }

    if (runtimeState === "running") {
      void sendScrollCommand("start", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
      return;
    }

    if (runtimeState === "paused") {
      void sendScrollCommand("pause", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
    }
  });
}

if (slowMoToggle) {
  slowMoToggle.addEventListener("change", () => {
    setSavedSpeedForCurrentMode(getSpeed());
    slowMoModeEnabled = slowMoToggle.checked;
    updateSpeedControl();
    applySavedSpeedToSlider();
    updateSpeedLabel();
    updateSpeedRangeHint();
    void saveSlowMoModeSetting(slowMoModeEnabled);
    void saveSpeed(getSpeed());
    void saveModeSpeeds();

    if (!extensionEnabled) {
      return;
    }

    if (runtimeState === "running") {
      void sendScrollCommand("start", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
      return;
    }

    if (runtimeState === "paused") {
      void sendScrollCommand("pause", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
    }
  });
}

if (lineDelaySlider) {
  lineDelaySlider.addEventListener("input", () => {
    const parsed = Number(lineDelaySlider.value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    lineDelayMs = clampLineDelay(parsed);
    updateLineDelayControl();
    updateLineDelayLabel();
    void saveLineDelaySetting(lineDelayMs);

    if (!extensionEnabled || !jumpScrollEnabled) {
      return;
    }

    if (runtimeState === "running") {
      void sendScrollCommand("start", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
      return;
    }

    if (runtimeState === "paused") {
      void sendScrollCommand("pause", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
    }
  });
}

if (privacyPolicyButton) {
  privacyPolicyButton.addEventListener("click", async () => {
    try {
      const privacyUrl = await resolvePrivacyPolicyUrl();
      await chrome.tabs.create({ url: privacyUrl });
    } catch (error: unknown) {
      console.warn("Unable to open privacy policy page:", error);
    }
  });
}

// Hydrate UI from storage every time the popup opens.
void restoreSavedSettings();
void syncRuntimeState();

if (pauseResumeButton) {
  pauseResumeButton.addEventListener("click", () => {
    if (!extensionEnabled) {
      return;
    }

    if (runtimeState === "paused") {
      void sendScrollCommand("resume", {
        speed: getSpeed(),
        direction: selectedDirection,
        loop: loopAtEnd,
        jumpScroll: jumpScrollEnabled,
        slowMode: slowMoModeEnabled,
        lineDelayMs
      });
      setRuntimeState("running");
      return;
    }

    if (runtimeState === "running") {
      void sendScrollCommand("pause", { direction: selectedDirection });
      setRuntimeState("paused");
    }
  });
}

if (stopButton) {
  stopButton.addEventListener("click", () => {
    if (!extensionEnabled) {
      return;
    }

    void sendScrollCommand("stop", { direction: selectedDirection, reset: hardResetOnStop });
    setRuntimeState("idle");
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const change = changes[EXTENSION_ENABLED_STORAGE_KEY];

  if (!change || typeof change.newValue !== "boolean") {
    return;
  }

  extensionEnabled = change.newValue;
  updateExtensionEnabledToggle();
  updateControlAvailability();

  if (!extensionEnabled) {
    setRuntimeState("idle");
    return;
  }

  void syncRuntimeState();
});

export {};
