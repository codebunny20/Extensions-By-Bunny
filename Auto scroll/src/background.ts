type BadgeState = "idle" | "running" | "paused";
type ScrollAction = "start" | "pause" | "resume" | "stop" | "status";
type ScrollDirection = "up" | "left" | "down" | "right";

type BadgeStatusMessage = {
  type?: "badge-status";
  state?: BadgeState;
  speed?: number;
};

type ScrollStatus = {
  isRunning?: boolean;
  isPaused?: boolean;
};

type ScrollPayload = {
  action: ScrollAction;
  speed?: number;
  direction?: ScrollDirection;
  loop?: boolean;
  reset?: boolean;
  jumpScroll?: boolean;
  lineDelayMs?: number;
};

type StoredSettings = {
  speed: number;
  direction: ScrollDirection;
  loopAtEnd: boolean;
  hardResetOnStop: boolean;
  extensionEnabled: boolean;
  jumpScrollEnabled: boolean;
  lineDelayMs: number;
};

const SPEED_STORAGE_KEY = "scrollSpeed";
const DIRECTION_STORAGE_KEY = "scrollDirection";
const LOOP_STORAGE_KEY = "loopAtEnd";
const HARD_RESET_ON_STOP_STORAGE_KEY = "hardResetOnStop";
const EXTENSION_ENABLED_STORAGE_KEY = "extensionEnabled";
const JUMP_SCROLL_STORAGE_KEY = "jumpScrollEnabled";
const LINE_DELAY_STORAGE_KEY = "lineDelayMs";

const DEFAULT_SPEED = 3;
const DEFAULT_DIRECTION: ScrollDirection = "down";
const DEFAULT_LOOP = false;
const DEFAULT_HARD_RESET_ON_STOP = true;
const DEFAULT_EXTENSION_ENABLED = true;
const DEFAULT_JUMP_SCROLL = false;
const DEFAULT_LINE_DELAY_MS = 220;

const BADGE_BACKGROUND_COLORS: Record<BadgeState, string> = {
  idle: "#5f6368",
  running: "#1f7a3d",
  paused: "#9a6b16"
};

function clampBadgeSpeed(speed: number): number {
  return Math.min(20, Math.max(1, Math.round(speed)));
}

function clampLineDelay(delay: number): number {
  return Math.min(1200, Math.max(60, Math.round(delay / 20) * 20));
}

function isScrollDirection(value: unknown): value is ScrollDirection {
  return value === "up" || value === "left" || value === "down" || value === "right";
}

function getBadgeText(state: BadgeState, speed?: number): string {
  if (state === "running") {
    if (typeof speed === "number" && Number.isFinite(speed)) {
      return String(clampBadgeSpeed(speed));
    }

    return "ON";
  }

  if (state === "paused") {
    return "||";
  }

  return "OFF";
}

async function updateBadge(tabId: number, state: BadgeState, speed?: number): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: BADGE_BACKGROUND_COLORS[state]
  });

  await chrome.action.setBadgeText({
    tabId,
    text: getBadgeText(state, speed)
  });
}

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function sendScrollMessage<T>(tabId: number, payload: ScrollPayload): Promise<T | undefined> {
  try {
    return await chrome.tabs.sendMessage(tabId, payload) as T;
  } catch (error: unknown) {
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

    console.warn("Unable to send command to page:", error);
    return undefined;
  }
}

async function getStoredSettings(): Promise<StoredSettings> {
  try {
    const result = await chrome.storage.local.get([
      SPEED_STORAGE_KEY,
      DIRECTION_STORAGE_KEY,
      LOOP_STORAGE_KEY,
      HARD_RESET_ON_STOP_STORAGE_KEY,
      EXTENSION_ENABLED_STORAGE_KEY,
      JUMP_SCROLL_STORAGE_KEY,
      LINE_DELAY_STORAGE_KEY
    ]);

    const speedValue = result?.[SPEED_STORAGE_KEY];
    const directionValue = result?.[DIRECTION_STORAGE_KEY];
    const loopValue = result?.[LOOP_STORAGE_KEY];
    const hardResetValue = result?.[HARD_RESET_ON_STOP_STORAGE_KEY];
    const extensionEnabledValue = result?.[EXTENSION_ENABLED_STORAGE_KEY];
    const jumpScrollValue = result?.[JUMP_SCROLL_STORAGE_KEY];
    const lineDelayValue = result?.[LINE_DELAY_STORAGE_KEY];

    const speed = typeof speedValue === "number" && Number.isFinite(speedValue)
      ? clampBadgeSpeed(speedValue)
      : DEFAULT_SPEED;
    const direction = isScrollDirection(directionValue)
      ? directionValue
      : DEFAULT_DIRECTION;
    const loopAtEnd = typeof loopValue === "boolean" ? loopValue : DEFAULT_LOOP;
    const hardResetOnStop = typeof hardResetValue === "boolean" ? hardResetValue : DEFAULT_HARD_RESET_ON_STOP;
    const extensionEnabled = typeof extensionEnabledValue === "boolean"
      ? extensionEnabledValue
      : DEFAULT_EXTENSION_ENABLED;
    const jumpScrollEnabled = typeof jumpScrollValue === "boolean"
      ? jumpScrollValue
      : DEFAULT_JUMP_SCROLL;
    const lineDelayMs = typeof lineDelayValue === "number" && Number.isFinite(lineDelayValue)
      ? clampLineDelay(lineDelayValue)
      : DEFAULT_LINE_DELAY_MS;

    return {
      speed,
      direction,
      loopAtEnd,
      hardResetOnStop,
      extensionEnabled,
      jumpScrollEnabled,
      lineDelayMs
    };
  } catch (error: unknown) {
    console.warn("Unable to read stored settings:", error);
    return {
      speed: DEFAULT_SPEED,
      direction: DEFAULT_DIRECTION,
      loopAtEnd: DEFAULT_LOOP,
      hardResetOnStop: DEFAULT_HARD_RESET_ON_STOP,
      extensionEnabled: DEFAULT_EXTENSION_ENABLED,
      jumpScrollEnabled: DEFAULT_JUMP_SCROLL,
      lineDelayMs: DEFAULT_LINE_DELAY_MS
    };
  }
}

async function handleToggleAutoscroll(): Promise<void> {
  const tabId = await getActiveTabId();

  if (!tabId) {
    return;
  }

  const settings = await getStoredSettings();

  if (!settings.extensionEnabled) {
    await updateBadge(tabId, "idle");
    return;
  }

  const status = await sendScrollMessage<ScrollStatus>(tabId, { action: "status" });

  if (status?.isRunning || status?.isPaused) {
    await sendScrollMessage<void>(tabId, {
      action: "stop",
      direction: settings.direction,
      reset: settings.hardResetOnStop
    });
    return;
  }

  await sendScrollMessage<void>(tabId, {
    action: "start",
    speed: settings.speed,
    direction: settings.direction,
    loop: settings.loopAtEnd,
    jumpScroll: settings.jumpScrollEnabled,
    lineDelayMs: settings.lineDelayMs
  });
}

async function handlePauseResumeAutoscroll(): Promise<void> {
  const tabId = await getActiveTabId();

  if (!tabId) {
    return;
  }

  const settings = await getStoredSettings();

  if (!settings.extensionEnabled) {
    await updateBadge(tabId, "idle");
    return;
  }

  const status = await sendScrollMessage<ScrollStatus>(tabId, { action: "status" });

  if (status?.isRunning) {
    await sendScrollMessage<void>(tabId, {
      action: "pause",
      direction: settings.direction
    });
    return;
  }

  if (status?.isPaused) {
    await sendScrollMessage<void>(tabId, {
      action: "resume",
      speed: settings.speed,
      direction: settings.direction,
      loop: settings.loopAtEnd,
      jumpScroll: settings.jumpScrollEnabled,
      lineDelayMs: settings.lineDelayMs
    });
    return;
  }

  await sendScrollMessage<void>(tabId, {
    action: "start",
    speed: settings.speed,
    direction: settings.direction,
    loop: settings.loopAtEnd,
    jumpScroll: settings.jumpScrollEnabled,
    lineDelayMs: settings.lineDelayMs
  });
}

async function handleToggleExtensionEnabled(): Promise<void> {
  const settings = await getStoredSettings();
  const nextEnabled = !settings.extensionEnabled;

  await chrome.storage.local.set({ [EXTENSION_ENABLED_STORAGE_KEY]: nextEnabled });

  const tabId = await getActiveTabId();

  if (!tabId) {
    return;
  }

  if (!nextEnabled) {
    await sendScrollMessage<void>(tabId, {
      action: "stop",
      direction: settings.direction,
      reset: settings.hardResetOnStop
    });
  }

  await updateBadge(tabId, "idle");
}

async function handleAdjustScrollSpeed(delta: number): Promise<void> {
  const tabId = await getActiveTabId();

  if (!tabId) {
    return;
  }

  const settings = await getStoredSettings();

  if (!settings.extensionEnabled) {
    await updateBadge(tabId, "idle");
    return;
  }

  const nextSpeed = clampBadgeSpeed(settings.speed + delta);

  if (nextSpeed === settings.speed) {
    return;
  }

  await chrome.storage.local.set({ [SPEED_STORAGE_KEY]: nextSpeed });

  const status = await sendScrollMessage<ScrollStatus>(tabId, { action: "status" });

  if (status?.isRunning) {
    await sendScrollMessage<void>(tabId, {
      action: "start",
      speed: nextSpeed,
      direction: settings.direction,
      loop: settings.loopAtEnd,
      jumpScroll: settings.jumpScrollEnabled,
      lineDelayMs: settings.lineDelayMs
    });
    return;
  }

  if (status?.isPaused) {
    await sendScrollMessage<void>(tabId, {
      action: "pause",
      speed: nextSpeed,
      direction: settings.direction
    });
  }
}

chrome.commands.onCommand.addListener((command: string) => {
  if (command === "toggle-autoscroll") {
    void handleToggleAutoscroll().catch((error: unknown) => {
      console.warn("Unable to toggle auto scroll:", error);
    });
    return;
  }

  if (command === "pause-resume-autoscroll") {
    void handlePauseResumeAutoscroll().catch((error: unknown) => {
      console.warn("Unable to pause/resume auto scroll:", error);
    });
    return;
  }

  if (command === "toggle-extension-enabled") {
    void handleToggleExtensionEnabled().catch((error: unknown) => {
      console.warn("Unable to toggle extension enabled state:", error);
    });
    return;
  }

  if (command === "increase-scroll-speed") {
    void handleAdjustScrollSpeed(1).catch((error: unknown) => {
      console.warn("Unable to increase auto scroll speed:", error);
    });
    return;
  }

  if (command === "decrease-scroll-speed") {
    void handleAdjustScrollSpeed(-1).catch((error: unknown) => {
      console.warn("Unable to decrease auto scroll speed:", error);
    });
  }
});

chrome.runtime.onMessage.addListener((message: BadgeStatusMessage, sender) => {
  if (message.type !== "badge-status") {
    return;
  }

  const tabId = sender.tab?.id;
  const state = message.state;

  if (!tabId || (state !== "idle" && state !== "running" && state !== "paused")) {
    return;
  }

  void updateBadge(tabId, state, message.speed).catch((error: unknown) => {
    console.warn("Unable to update action badge:", error);
  });
});

export {};
