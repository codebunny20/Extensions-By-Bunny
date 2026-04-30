// ---------------- Unit Categories ----------------
const unitCategories = {
  length: {
    m: { name: "Meters", toBase: v => v, fromBase: v => v },
    cm: { name: "Centimeters", toBase: v => v / 100, fromBase: v => v * 100 },
    km: { name: "Kilometers", toBase: v => v * 1000, fromBase: v => v / 1000 },
    in: { name: "Inches", toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    ft: { name: "Feet", toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    yd: { name: "Yards", toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    mi: { name: "Miles", toBase: v => v * 1609.34, fromBase: v => v / 1609.34 }
  },

  mass: {
    g: { name: "Grams", toBase: v => v, fromBase: v => v },
    kg: { name: "Kilograms", toBase: v => v * 1000, fromBase: v => v / 1000 },
    mg: { name: "Milligrams", toBase: v => v / 1000, fromBase: v => v * 1000 },
    lb: { name: "Pounds", toBase: v => v * 453.59237, fromBase: v => v / 453.59237 },
    oz: { name: "Ounces", toBase: v => v * 28.3495231, fromBase: v => v / 28.3495231 }
  },

  temperature: {
    C: { name: "Celsius", toBase: v => v, fromBase: v => v },
    F: { name: "Fahrenheit", toBase: v => (v - 32) * 5/9, fromBase: v => v * 9/5 + 32 },
    K: { name: "Kelvin", toBase: v => v - 273.15, fromBase: v => v + 273.15 }
  },

  time: {
    s: { name: "Seconds", toBase: v => v, fromBase: v => v },
    min: { name: "Minutes", toBase: v => v * 60, fromBase: v => v / 60 },
    h: { name: "Hours", toBase: v => v * 3600, fromBase: v => v / 3600 },
    d: { name: "Days", toBase: v => v * 86400, fromBase: v => v / 86400 }
  },

  data: {
    B: { name: "Bytes", toBase: v => v, fromBase: v => v },
    KB: { name: "Kilobytes", toBase: v => v * 1024, fromBase: v => v / 1024 },
    MB: { name: "Megabytes", toBase: v => v * 1024**2, fromBase: v => v / (1024**2) },
    GB: { name: "Gigabytes", toBase: v => v * 1024**3, fromBase: v => v / (1024**3) }
  },

  speed: {
    "m/s": { name: "Meters/sec", toBase: v => v, fromBase: v => v },
    "km/h": { name: "Km/hour", toBase: v => v / 3.6, fromBase: v => v * 3.6 },
    "mph": { name: "Miles/hour", toBase: v => v * 0.44704, fromBase: v => v / 0.44704 }
  },

  area: {
    "m2": { name: "Square meters", toBase: v => v, fromBase: v => v },
    "cm2": { name: "Square cm", toBase: v => v / 10000, fromBase: v => v * 10000 },
    "km2": { name: "Square km", toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    "ft2": { name: "Square feet", toBase: v => v * 0.092903, fromBase: v => v / 0.092903 }
  },

  volume: {
    L: { name: "Liters", toBase: v => v, fromBase: v => v },
    mL: { name: "Milliliters", toBase: v => v / 1000, fromBase: v => v * 1000 },
    gal: { name: "Gallons", toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    qt: { name: "Quarts", toBase: v => v * 0.946353, fromBase: v => v / 0.946353 }
  },

  pressure: {
    Pa: { name: "Pascals", toBase: v => v, fromBase: v => v },
    kPa: { name: "Kilopascals", toBase: v => v * 1000, fromBase: v => v / 1000 },
    bar: { name: "Bar", toBase: v => v * 100000, fromBase: v => v / 100000 },
    psi: { name: "PSI", toBase: v => v * 6894.76, fromBase: v => v / 6894.76 }
  },

  energy: {
    J: { name: "Joules", toBase: v => v, fromBase: v => v },
    kJ: { name: "Kilojoules", toBase: v => v * 1000, fromBase: v => v / 1000 },
    cal: { name: "Calories", toBase: v => v * 4.184, fromBase: v => v / 4.184 }
  },

  power: {
    W: { name: "Watts", toBase: v => v, fromBase: v => v },
    kW: { name: "Kilowatts", toBase: v => v * 1000, fromBase: v => v / 1000 },
    hp: { name: "Horsepower", toBase: v => v * 745.7, fromBase: v => v / 745.7 }
  }
};

// ---------------- DOM ----------------
const convCategory = document.getElementById("conv-category");
const convValue = document.getElementById("conv-value");
const convFrom = document.getElementById("conv-from");
const convTo = document.getElementById("conv-to");
const convBtn = document.getElementById("conv-btn");
const convResult = document.getElementById("conv-result");

// ---------------- Populate ----------------
function populateCategories() {
  convCategory.innerHTML = "";
  Object.keys(unitCategories).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat[0].toUpperCase() + cat.slice(1);
    convCategory.appendChild(opt);
  });
}

function populateUnits() {
  const units = unitCategories[convCategory.value];
  convFrom.innerHTML = "";
  convTo.innerHTML = "";

  Object.entries(units).forEach(([key, u]) => {
    const opt1 = document.createElement("option");
    opt1.value = key;
    opt1.textContent = `${u.name} (${key})`;

    const opt2 = opt1.cloneNode(true);

    convFrom.appendChild(opt1);
    convTo.appendChild(opt2);
  });

  convFrom.selectedIndex = 0;
  convTo.selectedIndex = 1;
}

// ---------------- Convert ----------------
function convert() {
  const raw = convValue.value.trim();
  if (!raw) {
    convResult.textContent = "";
    return;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    convResult.textContent = "Invalid number";
    return;
  }

  const units = unitCategories[convCategory.value];
  const from = units[convFrom.value];
  const to = units[convTo.value];

  const base = from.toBase(value);
  const converted = to.fromBase(base);

  const formatted = Number(converted).toPrecision(10).replace(/\.?0+$/, "");
  convResult.textContent = `${value} ${convFrom.value} = ${formatted} ${convTo.value}`;
}

// ---------------- Events ----------------
convCategory.addEventListener("change", () => {
  populateUnits();
  convert();
});

convFrom.addEventListener("change", convert);
convTo.addEventListener("change", convert);
convBtn.addEventListener("click", convert);

convValue.addEventListener("keydown", e => {
  if (e.key === "Enter") convert();
});

// ---------------- Init ----------------
populateCategories();
populateUnits();
