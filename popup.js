// ===== Display & UI Elements =====
const display = document.getElementById("display");
const buttons = document.querySelectorAll(".btn");
const equalsBtn = document.getElementById("equals");
const clearBtn = document.getElementById("clear");
const copyBtn = document.getElementById("copyBtn");
const historyToggle = document.getElementById("historyToggle");
const historyDrawer = document.getElementById("historyDrawer");
const historyList = document.getElementById("historyList");

// ===== Calculator State =====
let currentInput = "";
let history = [];

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
        });
        historyList.appendChild(div);
    });
}

// ===== Handle Button Clicks =====
buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const value = btn.dataset.value;

        if (value) {
            // Prevent multiple decimals in one number
            if (value === "." && currentInput.endsWith(".")) return;

            currentInput += value;
            updateDisplay();
        }
    });
});

// ===== Clear Button =====
clearBtn.addEventListener("click", () => {
    currentInput = "";
    updateDisplay();
});

// ===== Equals Button =====
equalsBtn.addEventListener("click", () => {
    if (!currentInput) return;

    try {
        const expression = currentInput;
        const result = eval(expression); // safe here because input is controlled

        addToHistory(expression, result);
        currentInput = String(result);
        updateDisplay();
    } catch {
        currentInput = "Error";
        updateDisplay();
        setTimeout(() => {
            currentInput = "";
            updateDisplay();
        }, 800);
    }
});

// ===== Copy to Clipboard =====
copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(display.textContent);
});

// ===== Toggle History Drawer =====
historyToggle.addEventListener("click", () => {
    historyDrawer.classList.toggle("open");
    saveDrawerState();
});

// ===== Keyboard Input =====
document.addEventListener("keydown", (e) => {
    const key = e.key;

    // Numbers
    if (!isNaN(key)) {
        currentInput += key;
        updateDisplay();
    }

    // Operators
    if (["+", "-", "*", "/"].includes(key)) {
        currentInput += key;
        updateDisplay();
    }

    // Decimal
    if (key === ".") {
        if (!currentInput.endsWith(".")) {
            currentInput += ".";
            updateDisplay();
        }
    }

    // Enter = equals
    if (key === "Enter") {
        equalsBtn.click();
    }

    // Backspace
    if (key === "Backspace") {
        currentInput = currentInput.slice(0, -1);
        updateDisplay();
    }
});
