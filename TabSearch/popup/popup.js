document.getElementById("searchBtn").addEventListener("click", async () => {
    const query = document.getElementById("query").value;
    const caseSensitive = document.getElementById("case").checked;
    const wholeWord = document.getElementById("whole").checked;
  
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.tabs.sendMessage(tab.id, {
      type: "SEARCH",
      query,
      caseSensitive,
      wholeWord
    });
  });
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "RESULTS") {
      document.getElementById("result").textContent =
        msg.count + " matches found";
    }
  });
  