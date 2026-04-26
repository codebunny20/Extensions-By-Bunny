// ---- Unit definitions by category ----
const unitCategories = {
    length: {
      m:  { name: "Meters",       toBase: v => v,           fromBase: v => v },
      cm: { name: "Centimeters",  toBase: v => v / 100,     fromBase: v => v * 100 },
      km: { name: "Kilometers",   toBase: v => v * 1000,    fromBase: v => v / 1000 },
      in: { name: "Inches",       toBase: v => v * 0.0254,  fromBase: v => v / 0.0254 },
      ft: { name: "Feet",         toBase: v => v * 0.3048,  fromBase: v => v / 0.3048 }
    }
  };
  
  // ---- DOM references ----
  const valueInput = document.getElementById("value-input");
  const categorySelect = document.getElementById("category-select");
  const fromSelect = document.getElementById("from-select");
  const toSelect = document.getElementById("to-select");
  const convertBtn = document.getElementById("convert-btn");
  const resultEl = document.getElementById("result");
  
  // ---- Populate category dropdown ----
  function populateCategories() {
    categorySelect.innerHTML = "";
  
    Object.keys(unitCategories).forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat[0].toUpperCase() + cat.slice(1);
      categorySelect.appendChild(opt);
    });
  
    categorySelect.value = "length";
  }
  
  // ---- Populate unit selects based on category ----
  function populateSelects() {
    const category = categorySelect.value;
    const units = unitCategories[category];
  
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";
  
    Object.entries(units).forEach(([key, u]) => {
      const optFrom = document.createElement("option");
      optFrom.value = key;
      optFrom.textContent = `${u.name} (${key})`;
  
      const optTo = optFrom.cloneNode(true);
  
      fromSelect.appendChild(optFrom);
      toSelect.appendChild(optTo);
    });
  
    // Default: first and second units
    fromSelect.selectedIndex = 0;
    toSelect.selectedIndex = 1;
  }
  
  // ---- Conversion logic ----
  function convert() {
    const raw = valueInput.value.trim();
    if (raw === "") {
      resultEl.textContent = "";
      return;
    }
  
    const value = Number(raw);
    if (Number.isNaN(value)) {
      resultEl.textContent = "Invalid number";
      return;
    }
  
    const category = categorySelect.value;
    const units = unitCategories[category];
  
    const from = units[fromSelect.value];
    const to = units[toSelect.value];
  
    if (!from || !to) {
      resultEl.textContent = "Invalid unit selection";
      return;
    }
  
    const base = from.toBase(value);
    const converted = to.fromBase(base);
  
    resultEl.textContent = `${value} ${fromSelect.value} = ${converted.toFixed(4)} ${toSelect.value}`;
  }
  
  // ---- Event listeners ----
  convertBtn.addEventListener("click", convert);
  
  valueInput.addEventListener("keydown", e => {
    if (e.key === "Enter") convert();
  });
  
  fromSelect.addEventListener("change", convert);
  toSelect.addEventListener("change", convert);
  
  categorySelect.addEventListener("change", () => {
    populateSelects();
    convert();
  });
  
  // ---- Init ----
  populateCategories();
  populateSelects();
  