type VoiceState = "idle" | "starting" | "listening";

interface VoiceCallbacks {
  onStatus: (message: string) => void;
  onTranscript: (text: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

export class VoiceController {
  private recognition: SpeechRecognition | null = null;
  private state: VoiceState = "idle";
  private startToken = 0;
  private permissionGranted = false;

  constructor(private readonly callbacks: VoiceCallbacks) {}

  isSupported(): boolean {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isListening(): boolean {
    return this.state === "listening";
  }

  async toggle(): Promise<void> {
    if (this.isListening() || this.state === "starting") {
      this.stop();
      return;
    }

    await this.start();
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      this.callbacks.onStatus("Voice typing is not supported in this browser.");
      return;
    }

    if (this.state !== "idle") {
      return;
    }

    this.state = "starting";
    this.callbacks.onListeningChange(true);
    this.callbacks.onStatus("Listening...");

    const token = ++this.startToken;

    try {
      await this.requestMicPermission();
      if (token !== this.startToken || this.state !== "starting") {
        this.setIdle("");
        return;
      }

      const r = this.ensureRecognition();
      if (!r) {
        this.setIdle("Voice typing is not supported in this browser.");
        return;
      }

      r.start();
      this.state = "listening";
      this.callbacks.onListeningChange(true);
      this.callbacks.onStatus("Listening...");
    } catch (err) {
      const message = this.getErrorMessage(err);
      this.setIdle(`Mic blocked/unavailable: ${message}`);
    }
  }

  stop(): void {
    if (this.state === "idle") {
      return;
    }

    this.startToken += 1;

    if (this.state === "starting") {
      this.setIdle("");
      return;
    }

    // Mark idle first so the onend handler won't restart recognition.
    this.setIdle("");

    try {
      this.recognition?.stop();
    } catch {
      // ignore — already marked idle
    }
  }

  private ensureRecognition(): SpeechRecognition | null {
    if (this.recognition) {
      return this.recognition;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      return null;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) {
          continue;
        }

        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (interimText.trim()) {
        this.callbacks.onStatus(`Listening: ${interimText}`);
      } else if (this.state !== "idle") {
        this.callbacks.onStatus("Listening...");
      }

      if (finalText.trim()) {
        this.callbacks.onTranscript(finalText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.setIdle(`Mic error: ${event.error || "unknown"}`);
    };

    recognition.onend = () => {
      if (this.state === "listening") {
        // Recognition ended due to silence or a natural pause — restart it
        // so the user can keep speaking without pressing the button again.
        try {
          recognition.start();
        } catch {
          this.setIdle("");
        }
      } else if (this.state !== "idle") {
        this.setIdle("");
      }
    };

    this.recognition = recognition;
    return recognition;
  }

  private async requestMicPermission(): Promise<void> {
    if (this.permissionGranted) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    this.permissionGranted = true;
  }

  private setIdle(statusMessage: string): void {
    this.state = "idle";
    this.callbacks.onListeningChange(false);
    this.callbacks.onStatus(statusMessage);
  }

  private getErrorMessage(err: unknown): string {
    if (!err) {
      return "unknown";
    }

    if (typeof err === "string") {
      return err;
    }

    if (err && typeof err === "object") {
      const maybeName = (err as { name?: unknown }).name;
      const maybeMessage = (err as { message?: unknown }).message;

      if (typeof maybeName === "string" && maybeName.trim()) {
        return maybeName;
      }

      if (typeof maybeMessage === "string" && maybeMessage.trim()) {
        return maybeMessage;
      }
    }

    return "unknown";
  }
}
