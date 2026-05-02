const display = document.getElementById("display");
let expression = "";

function update() {
  display.textContent = expression || "0";
}

document.querySelectorAll("[data-key]").forEach(btn => {
  btn.addEventListener("click", () => {
    expression += btn.dataset.key;
    update();
  });
});

document.querySelectorAll("[data-op]").forEach(btn => {
  btn.addEventListener("click", () => {
    expression += btn.dataset.op;
    update();
  });
});

document.getElementById("clear").addEventListener("click", () => {
  expression = "";
  update();
});

document.getElementById("equals").addEventListener("click", () => {
    try {
      const safe = expression.replace(/[^0-9+\-*/.]/g, "");
      const result = new Function("return (" + safe + ")")();
      expression = String(result);
    } catch {
      expression = "Error";
    }
    update();
  });
