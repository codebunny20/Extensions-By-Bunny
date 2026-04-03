const exprEl = document.getElementById("expr");
const resultEl = document.getElementById("result");

let expression = "";

function update() {
  exprEl.textContent = expression;
}

document.querySelectorAll("button").forEach(btn => {
  const val = btn.dataset.value;
  const action = btn.dataset.action;

  btn.addEventListener("click", () => {
    if (val) {
      expression += val;
      update();
      return;
    }

    if (action === "clear") {
      expression = "";
      resultEl.textContent = "0";
      update();
    }

    if (action === "back") {
      expression = expression.slice(0, -1);
      update();
    }

    if (action === "equals") {
      try {
        const result = eval(expression);
        resultEl.textContent = result;
        expression = result.toString();
        update();
      } catch {
        resultEl.textContent = "Error";
      }
    }
  });
});
