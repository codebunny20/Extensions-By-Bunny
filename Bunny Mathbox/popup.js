(function () {
  const toolSelect = document.getElementById("tool-select");
  const toolSections = Array.from(document.querySelectorAll(".tool-section"));

  function switchTool(tool) {
    toolSections.forEach((section) => {
      section.classList.toggle("is-active", section.dataset.tool === tool);
    });
  }

  toolSelect.addEventListener("change", (event) => {
    switchTool(event.target.value);
  });

  initCalculator();
  initConverter();
  initOhmsTool();
  initResistorCalculator();
  switchTool(toolSelect.value);

  function initCalculator() {
    const display = document.getElementById("calc-display");
    const grid = document.getElementById("calc-grid");
    const clearBtn = document.getElementById("calc-clear");
    const equalsBtn = document.getElementById("calc-equals");
    let expression = "";

    function update() {
      display.textContent = expression || "0";
    }

    function tokenize(expr) {
      const tokens = [];
      let numberBuffer = "";

      for (let i = 0; i < expr.length; i += 1) {
        const char = expr[i];
        if ((char >= "0" && char <= "9") || char === ".") {
          numberBuffer += char;
        } else if ("+-*/".includes(char)) {
          if (numberBuffer) {
            tokens.push(numberBuffer);
            numberBuffer = "";
          }
          tokens.push(char);
        }
      }

      if (numberBuffer) {
        tokens.push(numberBuffer);
      }

      return tokens;
    }

    function evaluateExpression(expr) {
      const tokens = tokenize(expr);
      if (!tokens.length) {
        return 0;
      }

      const stack = [];
      let i = 0;
      while (i < tokens.length) {
        const token = tokens[i];
        if (token === "*" || token === "/") {
          const left = parseFloat(stack.pop());
          const right = parseFloat(tokens[i + 1]);
          if (token === "/" && right === 0) {
            return NaN;
          }
          stack.push(String(token === "*" ? left * right : left / right));
          i += 2;
        } else {
          stack.push(token);
          i += 1;
        }
      }

      let result = parseFloat(stack[0]);
      i = 1;
      while (i < stack.length) {
        const op = stack[i];
        const right = parseFloat(stack[i + 1]);
        result = op === "+" ? result + right : result - right;
        i += 2;
      }
      return result;
    }

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || button.id === "calc-clear" || button.id === "calc-equals") {
        return;
      }

      if (button.dataset.key) {
        const key = button.dataset.key;
        if (key === ".") {
          const parts = expression.split(/[+\-*/]/);
          const currentPart = parts[parts.length - 1] || "";
          if (currentPart.includes(".")) {
            return;
          }
        }
        expression += key;
      }

      if (button.dataset.op) {
        const op = button.dataset.op;
        if (!expression) {
          return;
        }
        if ("+-*/".includes(expression.slice(-1))) {
          expression = expression.slice(0, -1) + op;
        } else {
          expression += op;
        }
      }

      update();
    });

    clearBtn.addEventListener("click", () => {
      expression = "";
      update();
    });

    equalsBtn.addEventListener("click", () => {
      try {
        const result = evaluateExpression(expression);
        expression = Number.isFinite(result) ? String(result) : "Error";
      } catch (error) {
        expression = "Error";
      }
      update();
    });

    update();
  }

  function initConverter() {
    const unitCategories = {
      length: {
        m: { name: "Meters", toBase: (v) => v, fromBase: (v) => v },
        cm: { name: "Centimeters", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
        km: { name: "Kilometers", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        in: { name: "Inches", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
        ft: { name: "Feet", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
        yd: { name: "Yards", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
        mi: { name: "Miles", toBase: (v) => v * 1609.34, fromBase: (v) => v / 1609.34 }
      },
      mass: {
        g: { name: "Grams", toBase: (v) => v, fromBase: (v) => v },
        kg: { name: "Kilograms", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        mg: { name: "Milligrams", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
        lb: { name: "Pounds", toBase: (v) => v * 453.59237, fromBase: (v) => v / 453.59237 },
        oz: { name: "Ounces", toBase: (v) => v * 28.3495231, fromBase: (v) => v / 28.3495231 }
      },
      temperature: {
        C: { name: "Celsius", toBase: (v) => v, fromBase: (v) => v },
        F: { name: "Fahrenheit", toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32 },
        K: { name: "Kelvin", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
      },
      time: {
        s: { name: "Seconds", toBase: (v) => v, fromBase: (v) => v },
        min: { name: "Minutes", toBase: (v) => v * 60, fromBase: (v) => v / 60 },
        h: { name: "Hours", toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
        d: { name: "Days", toBase: (v) => v * 86400, fromBase: (v) => v / 86400 }
      },
      data: {
        B: { name: "Bytes", toBase: (v) => v, fromBase: (v) => v },
        KB: { name: "Kilobytes", toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
        MB: { name: "Megabytes", toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / (1024 ** 2) },
        GB: { name: "Gigabytes", toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / (1024 ** 3) }
      },
      speed: {
        "m/s": { name: "Meters/sec", toBase: (v) => v, fromBase: (v) => v },
        "km/h": { name: "Km/hour", toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
        mph: { name: "Miles/hour", toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 }
      },
      area: {
        m2: { name: "Square meters", toBase: (v) => v, fromBase: (v) => v },
        cm2: { name: "Square cm", toBase: (v) => v / 10000, fromBase: (v) => v * 10000 },
        km2: { name: "Square km", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
        ft2: { name: "Square feet", toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 }
      },
      volume: {
        L: { name: "Liters", toBase: (v) => v, fromBase: (v) => v },
        mL: { name: "Milliliters", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
        gal: { name: "Gallons", toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
        qt: { name: "Quarts", toBase: (v) => v * 0.946353, fromBase: (v) => v / 0.946353 }
      },
      pressure: {
        Pa: { name: "Pascals", toBase: (v) => v, fromBase: (v) => v },
        kPa: { name: "Kilopascals", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        bar: { name: "Bar", toBase: (v) => v * 100000, fromBase: (v) => v / 100000 },
        psi: { name: "PSI", toBase: (v) => v * 6894.76, fromBase: (v) => v / 6894.76 }
      },
      energy: {
        J: { name: "Joules", toBase: (v) => v, fromBase: (v) => v },
        kJ: { name: "Kilojoules", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        cal: { name: "Calories", toBase: (v) => v * 4.184, fromBase: (v) => v / 4.184 }
      },
      power: {
        W: { name: "Watts", toBase: (v) => v, fromBase: (v) => v },
        kW: { name: "Kilowatts", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        hp: { name: "Horsepower", toBase: (v) => v * 745.7, fromBase: (v) => v / 745.7 }
      }
    };

    const categoryEl = document.getElementById("conv-category");
    const valueEl = document.getElementById("conv-value");
    const fromEl = document.getElementById("conv-from");
    const toEl = document.getElementById("conv-to");
    const runBtn = document.getElementById("conv-run");
    const resultEl = document.getElementById("conv-result");

    function populateCategories() {
      categoryEl.innerHTML = "";
      Object.keys(unitCategories).forEach((categoryKey) => {
        const option = document.createElement("option");
        option.value = categoryKey;
        option.textContent = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
        categoryEl.appendChild(option);
      });
    }

    function populateUnits() {
      const units = unitCategories[categoryEl.value];
      fromEl.innerHTML = "";
      toEl.innerHTML = "";

      Object.entries(units).forEach(([unitKey, config]) => {
        const fromOption = document.createElement("option");
        fromOption.value = unitKey;
        fromOption.textContent = config.name + " (" + unitKey + ")";
        const toOption = fromOption.cloneNode(true);
        fromEl.appendChild(fromOption);
        toEl.appendChild(toOption);
      });

      fromEl.selectedIndex = 0;
      toEl.selectedIndex = Math.min(1, toEl.options.length - 1);
    }

    function convert() {
      const raw = valueEl.value.trim();
      if (!raw) {
        resultEl.textContent = "Enter a value to convert.";
        return;
      }

      const value = Number(raw);
      if (Number.isNaN(value)) {
        resultEl.textContent = "Invalid number.";
        return;
      }

      const units = unitCategories[categoryEl.value];
      const fromUnit = units[fromEl.value];
      const toUnit = units[toEl.value];

      const baseValue = fromUnit.toBase(value);
      const converted = toUnit.fromBase(baseValue);
      resultEl.textContent = value + " " + fromEl.value + " = " + converted.toFixed(6) + " " + toEl.value;
    }

    categoryEl.addEventListener("change", populateUnits);
    runBtn.addEventListener("click", convert);

    populateCategories();
    populateUnits();
  }

  function initOhmsTool() {
    const voltage = document.getElementById("ohm-voltage");
    const current = document.getElementById("ohm-current");
    const resistance = document.getElementById("ohm-resistance");
    const power = document.getElementById("ohm-power");
    const calcBtn = document.getElementById("ohm-calc");
    const clearBtn = document.getElementById("ohm-clear");
    const result = document.getElementById("ohm-result");

    calcBtn.addEventListener("click", () => {
      let v = parseFloat(voltage.value);
      let i = parseFloat(current.value);
      let r = parseFloat(resistance.value);
      let p = parseFloat(power.value);

      const filled = [v, i, r, p].filter((x) => !Number.isNaN(x)).length;
      if (filled < 2) {
        result.textContent = "Enter at least two known values.";
        return;
      }

      if (!Number.isNaN(v) && !Number.isNaN(i)) {
        r = v / i;
        p = v * i;
      } else if (!Number.isNaN(v) && !Number.isNaN(r)) {
        i = v / r;
        p = v * i;
      } else if (!Number.isNaN(v) && !Number.isNaN(p)) {
        i = p / v;
        r = v / i;
      } else if (!Number.isNaN(i) && !Number.isNaN(r)) {
        v = i * r;
        p = v * i;
      } else if (!Number.isNaN(i) && !Number.isNaN(p)) {
        v = p / i;
        r = v / i;
      } else if (!Number.isNaN(r) && !Number.isNaN(p)) {
        i = Math.sqrt(p / r);
        v = i * r;
      }

      if (![v, i, r, p].every(Number.isFinite)) {
        result.textContent = "Cannot solve with these values. Check for zero or invalid inputs.";
        return;
      }

      voltage.value = v.toFixed(4);
      current.value = i.toFixed(4);
      resistance.value = r.toFixed(4);
      power.value = p.toFixed(4);
      result.textContent = "Solved values updated.";
    });

    clearBtn.addEventListener("click", () => {
      voltage.value = "";
      current.value = "";
      resistance.value = "";
      power.value = "";
      result.textContent = "";
    });
  }

  function initResistorCalculator() {
    const vinEl = document.getElementById("res-vin");
    const voutEl = document.getElementById("res-vout");
    const currentEl = document.getElementById("res-current");
    const calcBtn = document.getElementById("res-calc");

    const resultWrap = document.getElementById("res-result");
    const rLine = document.getElementById("res-r-line");
    const pLine = document.getElementById("res-p-line");
    const noteLine = document.getElementById("res-note-line");

    function roundTo(value, decimals) {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    }

    calcBtn.addEventListener("click", () => {
      const vin = parseFloat(vinEl.value);
      const vout = parseFloat(voutEl.value);
      const currentmA = parseFloat(currentEl.value);

      resultWrap.classList.remove("hidden");

      if (!Number.isFinite(vin) || !Number.isFinite(vout) || !Number.isFinite(currentmA) || currentmA <= 0) {
        rLine.textContent = "Check your inputs.";
        pLine.textContent = "";
        noteLine.textContent = "";
        return;
      }

      if (vin <= vout) {
        rLine.textContent = "V_in must be greater than V_target.";
        pLine.textContent = "";
        noteLine.textContent = "";
        return;
      }

      const currentA = currentmA / 1000;
      const vDrop = vin - vout;
      const resistance = vDrop / currentA;
      const power = vDrop * currentA;

      const ratingMin = roundTo(power * 2, 2);
      const ratingMax = roundTo(power * 4, 2);

      rLine.textContent = "R ~= " + roundTo(resistance, 1) + " ohm";
      pLine.textContent = "Power ~= " + roundTo(power, 2) + " W (suggest " + ratingMin + " to " + ratingMax + " W)";

      const notes = [];
      if (power >= 1) {
        notes.push("Use a larger resistor body and allow airflow.");
      }
      if (ratingMin < 0.25) {
        notes.push("0.25 W is a common minimum practical rating.");
      } else if (ratingMin < 0.5) {
        notes.push("0.5 W often runs cooler than 0.25 W.");
      } else if (ratingMin < 1) {
        notes.push("Consider 1 W for cooler operation.");
      }

      noteLine.textContent = notes.join(" ") || "Validate in real operating conditions before finalizing.";
    });
  }
})();