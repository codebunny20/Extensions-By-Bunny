function clearHighlights() {
    document.querySelectorAll(".ps-highlight").forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
  }
  
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  
  function searchPage(query, caseSensitive, wholeWord) {
    clearHighlights();
    if (!query) return 0;
  
    const flags = caseSensitive ? "g" : "gi";
    const safeQuery = wholeWord ? `\\b${escapeRegex(query)}\\b` : escapeRegex(query);
    const regex = new RegExp(safeQuery, flags);
  
    let count = 0;
  
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue;
      if (regex.test(text)) {
        const span = document.createElement("span");
        span.className = "ps-highlight";
  
        const newHTML = text.replace(regex, match => {
          count++;
          return `<mark class="ps-highlight">${match}</mark>`;
        });
  
        const wrapper = document.createElement("span");
        wrapper.innerHTML = newHTML;
  
        node.parentNode.replaceChild(wrapper, node);
      }
    }
  
    return count;
  }
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SEARCH") {
      const count = searchPage(msg.query, msg.caseSensitive, msg.wholeWord);
      chrome.runtime.sendMessage({ type: "RESULTS", count });
    }
  });
  