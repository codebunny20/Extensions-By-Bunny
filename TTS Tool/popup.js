let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
  const select = document.getElementById("voiceSelect");
  select.innerHTML = "";

  voices.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = v.name;
    select.appendChild(opt);
  });
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakText(text, voiceIndex, rate, pitch, volume) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voices[voiceIndex];
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = volume;
  speechSynthesis.speak(utter);
}

document.getElementById("speakBtn").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  }, (res) => {
    const text = res[0].result;
    if (!text) return;

    speakText(
      text,
      document.getElementById("voiceSelect").value,
      parseFloat(document.getElementById("rate").value),
      parseFloat(document.getElementById("pitch").value),
      parseFloat(document.getElementById("volume").value)
    );
  });
};

document.getElementById("stopBtn").onclick = () => {
  speechSynthesis.cancel();
};

document.getElementById("previewBtn").onclick = () => {
  speakText(
    "This is a preview.",
    document.getElementById("voiceSelect").value,
    parseFloat(document.getElementById("rate").value),
    parseFloat(document.getElementById("pitch").value),
    parseFloat(document.getElementById("volume").value)
  );
};
