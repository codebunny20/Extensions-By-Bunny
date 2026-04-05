// ===== Display & UI Elements =====
const display = document.getElementById("display");
const buttons = document.querySelectorAll(".btn");
const equalsBtn = document.getElementById("equals");
const clearBtn = document.getElementById("clear");
const copyBtn = document.getElementById("copyBtn");
const historyToggle = document.getElementById("historyToggle");
const historyDrawer = document.getElementById("historyDrawer");
const historyList = document.getElementById("historyList");

// Hard fail early if popup.html isn't wired correctly
if (
    !display ||
    !equalsBtn ||
    !clearBtn ||
    !copyBtn ||
    !historyToggle ||
    !historyDrawer ||
    !historyList ||
    !buttons?.length
  ) {
    console.error("Calculator popup: missing DOM elements. Check popup.html ids/classes.");
  }


// ===== Calculator State =====
let currentInput = "";
let history = [];

// ===== History Drawer Helpers (collapse/expand) =====
function isHistoryOpen() {
    return historyDrawer.classList.contains("open");
}

function openHistory() {
    if (isHistoryOpen()) return;
    historyDrawer.classList.add("open");
    saveDrawerState();
}

function closeHistory() {
    if (!isHistoryOpen()) return;
    historyDrawer.classList.remove("open");
    saveDrawerState();
}

function toggleHistory() {
    historyDrawer.classList.toggle("open");
    saveDrawerState();
}

// ===== Load Persistent Data =====
chrome.storage.sync.get(["history", "drawerOpen"], (data) => {
    if (data.history) {
        history = data.history;
        renderHistory();
    }
    if (data.drawerOpen) {
        historyDrawer.classList.add("open");
    }
});

// ===== Save History to Storage =====
function saveHistory() {
    chrome.storage.sync.set({ history });
}

// ===== Save Drawer State =====
function saveDrawerState() {
    chrome.storage.sync.set({
        drawerOpen: historyDrawer.classList.contains("open")
    });
}

// ===== Update Display =====
function updateDisplay() {
    display.textContent = currentInput || "0";
}

// ===== Add to History =====
function addToHistory(expression, result) {
    const entry = `${expression} = ${result}`;
    history.unshift(entry); // newest first
    renderHistory();
    saveHistory();
}

// ===== Render History Drawer =====
function renderHistory() {
    historyList.innerHTML = "";
    history.forEach((item) => {
        const div = document.createElement("div");
        div.textContent = item;
        div.addEventListener("click", () => {
            currentInput = item.split("=")[1].trim();
            updateDisplay();
            closeHistory(); // collapse after selecting an item
        });
        historyList.appendChild(div);
    });
}

// ===== Clear Button =====
clearBtn.addEventListener("click", () => {
    currentInput = "";
    updateDisplay();
});

// ===== Copy to Clipboard =====
copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(display.textContent);
});

// ===== Toggle History Drawer =====
historyToggle.addEventListener("click", (e) => {
    e.stopPropagation(); // don't let it trigger the outside-click closer
    toggleHistory();
});

// ===== Collapse History Drawer on Outside Click =====
document.addEventListener("click", (e) => {
    if (!isHistoryOpen()) return;

    // If click is NOT inside the drawer and NOT on the toggle button, close it
    const clickedInsideDrawer = historyDrawer.contains(e.target);
    const clickedToggle = historyToggle.contains(e.target);

    if (!clickedInsideDrawer && !clickedToggle) {
        closeHistory();
    }
});

// ===== Helpers to keep expression valid =====
const OPS = new Set(["+", "-", "*", "/"]);

function lastChar(str) {
  return str ? str[str.length - 1] : "";
}

function isOperator(ch) {
  return OPS.has(ch);
}

function appendValue(value) {
  // Only allow known-safe characters
  if (!/^[0-9.+\-*/]$/.test(value)) return;

  const last = lastChar(currentInput);

  // Don't start with +,*,/ (allow leading minus)
  if (!currentInput && (value === "+" || value === "*" || value === "/")) return;

  // Replace operator if last char is already an operator (prevents 5++2)
  if (isOperator(value) && isOperator(last)) {
    currentInput = currentInput.slice(0, -1) + value;
    updateDisplay();
    return;
  }

  // Prevent multiple decimals in the current number segment
  if (value === ".") {
    // get last number chunk after the last operator
    const parts = currentInput.split(/[\+\-\*\/]/);
    const lastChunk = parts[parts.length - 1] ?? "";
    if (lastChunk.includes(".")) return;

    // if chunk is empty, prepend 0 (so ".5" becomes "0.5")
    if (!lastChunk) currentInput += "0";
  }

  currentInput += value;
  updateDisplay();
}

function canEvaluate(expr) {
  if (!expr) return false;

  // expression should not end with an operator or dot
  const end = lastChar(expr);
  if (isOperator(end) || end === ".") return false;

  // allow only digits/operators/dots/spaces (no letters, no parentheses here)
  if (!/^[0-9+\-*/. ]+$/.test(expr)) return false;

  return true;
}

function evaluateExpression(expr) {
  // Evaluate in strict mode; input is already restricted by canEvaluate/appendValue
  return Function(`"use strict"; return (${expr});`)();
}

// ===== Handle Button Clicks =====
buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.value;
    if (!value) return;

    appendValue(value);
  });
});

// ===== Equals Button =====
equalsBtn.addEventListener("click", () => {
  if (!canEvaluate(currentInput)) {
    // give a consistent feedback but don't blow away input
    display.textContent = "Error";
    setTimeout(updateDisplay, 400);
    return;
  }

  try {
    const expression = currentInput;
    const result = evaluateExpression(expression);

    addToHistory(expression, result);
    currentInput = String(result);
    updateDisplay();
  } catch (err) {
    console.error("Calculator evaluation failed:", err, "expr:", currentInput);
    display.textContent = "Error";
    setTimeout(updateDisplay, 400);
  }
});

// ===== Keyboard Input =====
document.addEventListener("keydown", (e) => {
    const key = e.key;

    // Esc closes history drawer
    if (key === "Escape") {
        closeHistory();
        return;
    }

    // Enter = equals
    if (key === "Enter") {
        equalsBtn.click();
        return;
    }

    // Backspace
    if (key === "Backspace") {
        currentInput = currentInput.slice(0, -1);
        updateDisplay();
        return;
    }

    // Numbers/operators/decimal all go through the same validator
    if (/^[0-9]$/.test(key) || ["+", "-", "*", "/","."].includes(key)) {
        appendValue(key);
        return;
    }
});