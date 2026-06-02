"use strict";
(() => {
  // src/popup.ts
  (() => {
    const getById = (id) => {
      return document.getElementById(id);
    };
    const toolSelect = getById("tool-select");
    const toolSections = Array.from(document.querySelectorAll(".tool-section"));
    const helpToggle = getById("help-toggle");
    const helpPanel = getById("help-panel");
    const helpTitle = getById("help-title");
    const helpContent = getById("help-content");
    const helpClose = getById("help-close");
    const toolHelp = {
      calculator: {
        title: "Standard Calculator",
        usageSteps: [
          "Tap number buttons to build an expression.",
          "Use +, -, *, or / to choose operations.",
          "Press = to evaluate or C to clear everything."
        ],
        methodSteps: [
          "The input is tokenized into numbers and operators.",
          "Multiplication and division are solved first from left to right.",
          "Addition and subtraction are solved next from left to right.",
          "If division by zero or invalid math occurs, it returns Error."
        ]
      },
      converter: {
        title: "Unit Converter",
        usageSteps: [
          "Choose a category such as length, mass, or temperature.",
          "Enter the numeric value to convert.",
          "Pick From and To units, then press Convert."
        ],
        methodSteps: [
          "The value is converted to a base unit using the selected From rule.",
          "The base value is converted into the target unit using the To rule.",
          "Temperature uses equations instead of scale factors: C<->F and C<->K.",
          "The final answer is displayed to 6 decimal places."
        ]
      },
      ratio: {
        title: "Ratio Calculator",
        usageSteps: [
          "Enter the first and second ratio numbers.",
          "Optionally fill one equivalent value field.",
          "Press Calculate to simplify and solve missing equivalent values."
        ],
        methodSteps: [
          "The ratio is simplified by scaling decimals and dividing by GCD.",
          "The unit ratio is shown as 1:(right/left).",
          "If one equivalent field is provided, proportional scaling solves the other side."
        ]
      },
      ohms: {
        title: "Quick Ohms Law Tool",
        usageSteps: [
          "Enter any two known values among V, I, R, and P.",
          "Press Calculate to fill all fields.",
          "Use Clear to reset entries."
        ],
        methodSteps: [
          "Uses Ohm and power relationships: V=IR, P=VI, P=I^2R, P=V^2/R.",
          "Chooses a formula path based on which two values are provided.",
          "Computed results are written back into all four fields with 4 decimals."
        ]
      },
      voltage: {
        title: "Voltage Calculator",
        usageSteps: [
          "Enter any two values from current, resistance, and power.",
          "Press Calculate Voltage.",
          "Read both the computed voltage and formula used."
        ],
        methodSteps: [
          "If I and R are given: V = I x R.",
          "If P and I are given: V = P / I.",
          "If P and R are given: V = sqrt(P x R)."
        ]
      },
      resistor: {
        title: "Resistor Calculator",
        usageSteps: [
          "Enter supply voltage, target voltage, and load current in mA.",
          "Press Calculate.",
          "Use the resistance and suggested wattage range shown below."
        ],
        methodSteps: [
          "Voltage drop is Vdrop = Vin - Vtarget.",
          "Resistance is R = Vdrop / I, where I is current converted from mA to A.",
          "Power is P = Vdrop x I, then recommended resistor rating is 2x to 4x power."
        ]
      },
      battery: {
        title: "Battery Calculator",
        usageSteps: [
          "Enter per-cell voltage, per-cell current, and battery count.",
          "Press Calculate.",
          "Compare the series and parallel totals."
        ],
        methodSteps: [
          "Series: total voltage = cell voltage x count; current stays the same.",
          "Parallel: voltage stays the same; total current = cell current x count.",
          "Assumes all batteries are identical and equally rated."
        ]
      }
    };
    let isHelpOpen = false;
    if (!toolSelect || toolSections.length === 0) {
      return;
    }
    const toolSelectEl = toolSelect;
    function renderHelp(tool) {
      if (!helpTitle || !helpContent) {
        return;
      }
      const details = toolHelp[tool] ?? toolHelp.calculator;
      const usage = details.usageSteps.map((step, index) => index + 1 + ". " + step).join("\n");
      const method = details.methodSteps.map((step, index) => index + 1 + ". " + step).join("\n");
      helpTitle.textContent = details.title + " help";
      helpContent.textContent = "How to use:\n" + usage + "\n\nHow it calculates or converts:\n" + method;
    }
    function setHelpOpen(nextOpen) {
      if (!helpPanel || !helpToggle) {
        return;
      }
      isHelpOpen = nextOpen;
      helpPanel.classList.toggle("hidden", !isHelpOpen);
      helpToggle.textContent = isHelpOpen ? "Hide Help" : "Open Help";
      helpToggle.setAttribute("aria-expanded", String(isHelpOpen));
    }
    function initHelpPanel() {
      renderHelp(toolSelectEl.value);
      if (!helpToggle || !helpPanel || !helpClose) {
        return;
      }
      helpToggle.addEventListener("click", () => {
        setHelpOpen(!isHelpOpen);
      });
      helpClose.addEventListener("click", () => {
        setHelpOpen(false);
      });
    }
    function switchTool(tool) {
      toolSections.forEach((section) => {
        section.classList.toggle("is-active", section.dataset.tool === tool);
      });
      renderHelp(tool);
    }
    toolSelectEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      switchTool(target.value);
    });
    initCalculator();
    initConverter();
    initRatioCalculator();
    initOhmsTool();
    initVoltageCalculator();
    initResistorCalculator();
    initBatteryCalculator();
    initHelpPanel();
    switchTool(toolSelectEl.value);
    function initCalculator() {
      const display = getById("calc-display");
      const grid = getById("calc-grid");
      const clearBtn = getById("calc-clear");
      const equalsBtn = getById("calc-equals");
      if (!display || !grid || !clearBtn || !equalsBtn) {
        return;
      }
      const displayEl = display;
      const gridEl = grid;
      const clearButton = clearBtn;
      const equalsButton = equalsBtn;
      let expression = "";
      function update() {
        displayEl.textContent = expression || "0";
      }
      function tokenize(expr) {
        const tokens = [];
        let numberBuffer = "";
        for (let i = 0; i < expr.length; i += 1) {
          const char = expr[i];
          if (char >= "0" && char <= "9" || char === ".") {
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
            const left = parseFloat(stack.pop() ?? "NaN");
            const right = parseFloat(tokens[i + 1] ?? "NaN");
            if (token === "/" && right === 0) {
              return Number.NaN;
            }
            stack.push(String(token === "*" ? left * right : left / right));
            i += 2;
          } else {
            stack.push(token);
            i += 1;
          }
        }
        let result = parseFloat(stack[0] ?? "0");
        i = 1;
        while (i < stack.length) {
          const op = stack[i];
          const right = parseFloat(stack[i + 1] ?? "NaN");
          result = op === "+" ? result + right : result - right;
          i += 2;
        }
        return result;
      }
      gridEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const button = target.closest("button");
        if (!(button instanceof HTMLButtonElement) || button.id === "calc-clear" || button.id === "calc-equals") {
          return;
        }
        if (button.dataset.key) {
          const key = button.dataset.key;
          if (expression === "Error") {
            expression = "";
          }
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
          if (!expression || expression === "Error") {
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
      clearButton.addEventListener("click", () => {
        expression = "";
        update();
      });
      equalsButton.addEventListener("click", () => {
        try {
          const normalizedExpression = expression.replace(/[+\-*/]+$/, "");
          const result = evaluateExpression(normalizedExpression);
          expression = Number.isFinite(result) ? String(result) : "Error";
        } catch {
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
          km: { name: "Kilometers", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
          in: { name: "Inches", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
          ft: { name: "Feet", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
          yd: { name: "Yards", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
          mi: { name: "Miles", toBase: (v) => v * 1609.34, fromBase: (v) => v / 1609.34 }
        },
        mass: {
          g: { name: "Grams", toBase: (v) => v, fromBase: (v) => v },
          kg: { name: "Kilograms", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
          mg: { name: "Milligrams", toBase: (v) => v / 1e3, fromBase: (v) => v * 1e3 },
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
          MB: { name: "Megabytes", toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
          GB: { name: "Gigabytes", toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 }
        },
        speed: {
          "m/s": { name: "Meters/sec", toBase: (v) => v, fromBase: (v) => v },
          "km/h": { name: "Km/hour", toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
          mph: { name: "Miles/hour", toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 }
        },
        area: {
          m2: { name: "Square meters", toBase: (v) => v, fromBase: (v) => v },
          cm2: { name: "Square cm", toBase: (v) => v / 1e4, fromBase: (v) => v * 1e4 },
          km2: { name: "Square km", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
          ft2: { name: "Square feet", toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 }
        },
        volume: {
          L: { name: "Liters", toBase: (v) => v, fromBase: (v) => v },
          mL: { name: "Milliliters", toBase: (v) => v / 1e3, fromBase: (v) => v * 1e3 },
          gal: { name: "Gallons", toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
          qt: { name: "Quarts", toBase: (v) => v * 0.946353, fromBase: (v) => v / 0.946353 }
        },
        pressure: {
          Pa: { name: "Pascals", toBase: (v) => v, fromBase: (v) => v },
          kPa: { name: "Kilopascals", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
          bar: { name: "Bar", toBase: (v) => v * 1e5, fromBase: (v) => v / 1e5 },
          psi: { name: "PSI", toBase: (v) => v * 6894.76, fromBase: (v) => v / 6894.76 }
        },
        energy: {
          J: { name: "Joules", toBase: (v) => v, fromBase: (v) => v },
          kJ: { name: "Kilojoules", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
          cal: { name: "Calories", toBase: (v) => v * 4.184, fromBase: (v) => v / 4.184 }
        },
        power: {
          W: { name: "Watts", toBase: (v) => v, fromBase: (v) => v },
          kW: { name: "Kilowatts", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
          hp: { name: "Horsepower", toBase: (v) => v * 745.7, fromBase: (v) => v / 745.7 }
        }
      };
      const categoryEl = getById("conv-category");
      const valueEl = getById("conv-value");
      const fromEl = getById("conv-from");
      const toEl = getById("conv-to");
      const runBtn = getById("conv-run");
      const resultEl = getById("conv-result");
      if (!categoryEl || !valueEl || !fromEl || !toEl || !runBtn || !resultEl) {
        return;
      }
      const categorySelect = categoryEl;
      const valueInput = valueEl;
      const fromSelect = fromEl;
      const toSelect = toEl;
      const runButton = runBtn;
      const resultOutput = resultEl;
      function populateCategories() {
        categorySelect.innerHTML = "";
        Object.keys(unitCategories).forEach((categoryKey) => {
          const option = document.createElement("option");
          option.value = categoryKey;
          option.textContent = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
          categorySelect.appendChild(option);
        });
      }
      function populateUnits() {
        const units = unitCategories[categorySelect.value];
        if (!units) {
          return;
        }
        fromSelect.innerHTML = "";
        toSelect.innerHTML = "";
        Object.entries(units).forEach(([unitKey, config]) => {
          const fromOption = document.createElement("option");
          fromOption.value = unitKey;
          fromOption.textContent = config.name + " (" + unitKey + ")";
          const toOption = fromOption.cloneNode(true);
          fromSelect.appendChild(fromOption);
          toSelect.appendChild(toOption);
        });
        fromSelect.selectedIndex = 0;
        toSelect.selectedIndex = Math.min(1, toSelect.options.length - 1);
      }
      function convert() {
        const raw = valueInput.value.trim();
        if (!raw) {
          resultOutput.textContent = "Enter a value to convert.";
          return;
        }
        const value = Number(raw);
        if (Number.isNaN(value)) {
          resultOutput.textContent = "Invalid number.";
          return;
        }
        const units = unitCategories[categorySelect.value];
        const fromUnit = units?.[fromSelect.value];
        const toUnit = units?.[toSelect.value];
        if (!fromUnit || !toUnit) {
          resultOutput.textContent = "Select valid units.";
          return;
        }
        const baseValue = fromUnit.toBase(value);
        const converted = toUnit.fromBase(baseValue);
        resultOutput.textContent = value + " " + fromSelect.value + " = " + converted.toFixed(6) + " " + toSelect.value;
      }
      categorySelect.addEventListener("change", populateUnits);
      runButton.addEventListener("click", convert);
      populateCategories();
      populateUnits();
    }
    function initRatioCalculator() {
      const leftEl = getById("ratio-left");
      const rightEl = getById("ratio-right");
      const knownLeftEl = getById("ratio-known-left");
      const knownRightEl = getById("ratio-known-right");
      const calcBtn = getById("ratio-calc");
      const clearBtn = getById("ratio-clear");
      const resultEl = getById("ratio-result");
      if (!leftEl || !rightEl || !knownLeftEl || !knownRightEl || !calcBtn || !clearBtn || !resultEl) {
        return;
      }
      function gcd(a, b) {
        let x = Math.abs(a);
        let y = Math.abs(b);
        while (y !== 0) {
          const remainder = x % y;
          x = y;
          y = remainder;
        }
        return x || 1;
      }
      function decimalPlaces(value) {
        const text = String(value);
        if (!text.includes(".")) {
          return 0;
        }
        return text.split(".")[1]?.length ?? 0;
      }
      function simplifyRatio(left, right) {
        const factor = Math.pow(10, Math.max(decimalPlaces(left), decimalPlaces(right)));
        const scaledLeft = Math.round(left * factor);
        const scaledRight = Math.round(right * factor);
        const divisor = gcd(scaledLeft, scaledRight);
        return [scaledLeft / divisor, scaledRight / divisor];
      }
      function formatNumber(value) {
        if (!Number.isFinite(value)) {
          return "-";
        }
        const rounded = Math.round(value * 1e6) / 1e6;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
      }
      calcBtn.addEventListener("click", () => {
        const left = parseFloat(leftEl.value);
        const right = parseFloat(rightEl.value);
        const knownLeft = parseFloat(knownLeftEl.value);
        const knownRight = parseFloat(knownRightEl.value);
        if (!Number.isFinite(left) || !Number.isFinite(right) || left === 0 || right === 0) {
          resultEl.textContent = "Enter two non-zero ratio values.";
          return;
        }
        const [simpleLeft, simpleRight] = simplifyRatio(left, right);
        const lines = [
          "Simplified ratio: " + formatNumber(simpleLeft) + ":" + formatNumber(simpleRight),
          "Unit ratio: 1:" + formatNumber(right / left)
        ];
        if (Number.isFinite(knownLeft)) {
          lines.push(
            "If first value is " + formatNumber(knownLeft) + ", second value is " + formatNumber(knownLeft * right / left) + "."
          );
        }
        if (Number.isFinite(knownRight)) {
          lines.push(
            "If second value is " + formatNumber(knownRight) + ", first value is " + formatNumber(knownRight * left / right) + "."
          );
        }
        if (!Number.isFinite(knownLeft) && !Number.isFinite(knownRight)) {
          lines.push("Enter either optional equivalent value field to solve for a matching ratio.");
        }
        resultEl.textContent = lines.join("\n");
      });
      clearBtn.addEventListener("click", () => {
        leftEl.value = "";
        rightEl.value = "";
        knownLeftEl.value = "";
        knownRightEl.value = "";
        resultEl.textContent = "";
      });
    }
    function initOhmsTool() {
      const voltage = getById("ohm-voltage");
      const current = getById("ohm-current");
      const resistance = getById("ohm-resistance");
      const power = getById("ohm-power");
      const calcBtn = getById("ohm-calc");
      const clearBtn = getById("ohm-clear");
      const result = getById("ohm-result");
      if (!voltage || !current || !resistance || !power || !calcBtn || !clearBtn || !result) {
        return;
      }
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
    function initVoltageCalculator() {
      const currentEl = getById("volt-current");
      const resistanceEl = getById("volt-resistance");
      const powerEl = getById("volt-power");
      const calcBtn = getById("volt-calc");
      const clearBtn = getById("volt-clear");
      const resultEl = getById("volt-result");
      if (!currentEl || !resistanceEl || !powerEl || !calcBtn || !clearBtn || !resultEl) {
        return;
      }
      function formatNumber(value) {
        const rounded = Math.round(value * 1e6) / 1e6;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
      }
      calcBtn.addEventListener("click", () => {
        const current = parseFloat(currentEl.value);
        const resistance = parseFloat(resistanceEl.value);
        const power = parseFloat(powerEl.value);
        const hasCurrent = Number.isFinite(current);
        const hasResistance = Number.isFinite(resistance);
        const hasPower = Number.isFinite(power);
        const provided = [hasCurrent, hasResistance, hasPower].filter(Boolean).length;
        if (provided < 2) {
          resultEl.textContent = "Enter any two values: current, resistance, or power.";
          return;
        }
        if (hasCurrent && current <= 0 || hasResistance && resistance <= 0 || hasPower && power <= 0) {
          resultEl.textContent = "All entered values must be greater than zero.";
          return;
        }
        let voltage = Number.NaN;
        let formula = "";
        if (hasCurrent && hasResistance) {
          voltage = current * resistance;
          formula = "V = I x R";
        } else if (hasPower && hasCurrent) {
          voltage = power / current;
          formula = "V = P / I";
        } else if (hasPower && hasResistance) {
          voltage = Math.sqrt(power * resistance);
          formula = "V = sqrt(P x R)";
        }
        if (!Number.isFinite(voltage)) {
          resultEl.textContent = "Could not calculate voltage from those values.";
          return;
        }
        resultEl.textContent = "Voltage: " + formatNumber(voltage) + " V\nUsing: " + formula;
      });
      clearBtn.addEventListener("click", () => {
        currentEl.value = "";
        resistanceEl.value = "";
        powerEl.value = "";
        resultEl.textContent = "";
      });
    }
    function initResistorCalculator() {
      const vinEl = getById("res-vin");
      const voutEl = getById("res-vout");
      const currentEl = getById("res-current");
      const calcBtn = getById("res-calc");
      const resultWrap = getById("res-result");
      const rLine = getById("res-r-line");
      const pLine = getById("res-p-line");
      const noteLine = getById("res-note-line");
      if (!vinEl || !voutEl || !currentEl || !calcBtn || !resultWrap || !rLine || !pLine || !noteLine) {
        return;
      }
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
        const currentA = currentmA / 1e3;
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
    function initBatteryCalculator() {
      const voltageEl = getById("bat-voltage");
      const currentEl = getById("bat-current");
      const countEl = getById("bat-count");
      const calcBtn = getById("bat-calc");
      const clearBtn = getById("bat-clear");
      const resultWrap = getById("bat-result");
      const seriesLine = getById("bat-series-line");
      const parallelLine = getById("bat-parallel-line");
      const noteLine = getById("bat-note-line");
      if (!voltageEl || !currentEl || !countEl || !calcBtn || !clearBtn || !resultWrap || !seriesLine || !parallelLine || !noteLine) {
        return;
      }
      function formatNumber(value) {
        const rounded = Math.round(value * 1e4) / 1e4;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
      }
      calcBtn.addEventListener("click", () => {
        const voltage = parseFloat(voltageEl.value);
        const current = parseFloat(currentEl.value);
        const count = parseInt(countEl.value, 10);
        resultWrap.classList.remove("hidden");
        if (!Number.isFinite(voltage) || voltage <= 0 || !Number.isFinite(current) || current <= 0 || !Number.isInteger(count) || count <= 0) {
          seriesLine.textContent = "Enter valid positive values for voltage, current, and count.";
          parallelLine.textContent = "";
          noteLine.textContent = "";
          return;
        }
        const seriesVoltage = voltage * count;
        const seriesCurrent = current;
        const parallelVoltage = voltage;
        const parallelCurrent = current * count;
        seriesLine.textContent = "Series total: " + formatNumber(seriesVoltage) + " V, " + formatNumber(seriesCurrent) + " A";
        parallelLine.textContent = "Parallel total: " + formatNumber(parallelVoltage) + " V, " + formatNumber(parallelCurrent) + " A";
        noteLine.textContent = "Assumes identical batteries with the same voltage and current rating.";
      });
      clearBtn.addEventListener("click", () => {
        voltageEl.value = "";
        currentEl.value = "";
        countEl.value = "";
        resultWrap.classList.add("hidden");
        seriesLine.textContent = "";
        parallelLine.textContent = "";
        noteLine.textContent = "";
      });
    }
  })();
})();
