let recognition;
let listening = false;

function startVoiceTyping() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech Recognition not supported.");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const active = document.activeElement;
    if (!active) return;

    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") {
      active.value = transcript;
    } else {
      active.textContent = transcript;
    }
  };

  recognition.start();
  listening = true;
}

function stopVoiceTyping() {
  if (recognition && listening) {
    recognition.stop();
    listening = false;
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_VOICE_TYPING") startVoiceTyping();
  if (msg.type === "STOP_VOICE_TYPING") stopVoiceTyping();
});
