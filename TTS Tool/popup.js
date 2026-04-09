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

document.getElementById("speakBtn").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (voiceIndex, rate) => {
      const text = window.getSelection().toString();
      if (!text) return;

      const utter = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      utter.voice = voices[voiceIndex];
      utter.rate = rate;

      speechSynthesis.speak(utter);
    },
    args: [
      document.getElementById("voiceSelect").value,
      parseFloat(document.getElementById("rate").value)
    ]
  });
};

document.getElementById("stopBtn").onclick = () => {
  speechSynthesis.cancel();
};
