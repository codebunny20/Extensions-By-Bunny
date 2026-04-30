chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "speak-selection") {
      const text = window.getSelection().toString();
      if (text) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    }
  });
  