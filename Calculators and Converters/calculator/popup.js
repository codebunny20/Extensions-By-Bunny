const display = document.getElementById("display");
let expression = "";

function update() {
  display.textContent = expression || "0";
}

// Tokenize expression into numbers and operators
function tokenize(expr) {
  const tokens = [];
  let num = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      num += ch;
    } else if ("+-*/".includes(ch)) {
      if (num) {
        tokens.push(num);
        num = "";
      }
      tokens.push(ch);
    }
  }
  if (num) tokens.push(num);
  return tokens;
}

// Evaluate tokens with operator precedence (*, / before +, -)
function evaluateExpression(expr) {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return 0;

  // First pass: handle * and /
  const stack = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "*" || token === "/") {
      const prev = parseFloat(stack.pop());
      const next = parseFloat(tokens[i + 1]);
      let result;
      if (token === "*") {
        result = prev * next;
      } else {
        result = next === 0 ? NaN : prev / next;
      }
      stack.push(String(result));
      i += 2;
    } else {
      stack.push(token);
      i++;
    }
  }

  // Second pass: handle + and -
  let result = parseFloat(stack[0]);
  i = 1;
  while (i < stack.length) {
    const op = stack[i];
    const next = parseFloat(stack[i + 1]);
    if (op === "+") {
      result += next;
    } else if (op === "-") {
      result -= next;
    }
    i += 2;
  }

  return result;
}

document.querySelectorAll("[data-key]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    if (key === "." && expression.endsWith(".")) return;
    expression += key;
    update();
  });
});

document.querySelectorAll("[data-op]").forEach(btn => {
  btn.addEventListener("click", () => {
    const op = btn.dataset.op;
    if (!expression) return;
    if ("+-*/".includes(expression.slice(-1))) {
      expression = expression.slice(0, -1) + op;
    } else {
      expression += op;
    }
    update();
  });
});

document.getElementById("clear").addEventListener("click", () => {
  expression = "";
  update();
});

document.getElementById("equals").addEventListener("click", () => {
  try {
    const result = evaluateExpression(expression);
    if (Number.isNaN(result) || !Number.isFinite(result)) {
      expression = "Error";
    } else {
      expression = String(result);
    }
  } catch {
    expression = "Error";
  }
  update();
});
