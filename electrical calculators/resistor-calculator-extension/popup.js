function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  
  document.getElementById("calc").addEventListener("click", () => {
    const vin = parseFloat(document.getElementById("vin").value);
    const vout = parseFloat(document.getElementById("vout").value);
    const current_mA = parseFloat(document.getElementById("current").value);
  
    const resultDiv = document.getElementById("result");
    const rLine = document.getElementById("rLine");
    const pLine = document.getElementById("pLine");
    const noteLine = document.getElementById("noteLine");
  
    if (isNaN(vin) || isNaN(vout) || isNaN(current_mA) || current_mA <= 0) {
      resultDiv.classList.remove("hidden");
      rLine.textContent = "Check your inputs.";
      pLine.textContent = "";
      noteLine.textContent = "";
      return;
    }
  
    if (vin <= vout) {
      resultDiv.classList.remove("hidden");
      rLine.textContent = "V_in must be greater than V_target.";
      pLine.textContent = "";
      noteLine.textContent = "";
      return;
    }
  
    const current_A = current_mA / 1000;
    const vdrop = vin - vout;
    const R = vdrop / current_A;
    const P = vdrop * current_A;

    // NEW: recommended wattage range (rule of thumb)
    const ratingMin_W = roundTo(P * 2, 2);
    const ratingMax_W = roundTo(P * 4, 2);
  
    resultDiv.classList.remove("hidden");
    rLine.textContent = `R ≈ ${roundTo(R, 1)} Ω`;
    pLine.textContent = `Power ≈ ${roundTo(P, 2)} W (suggest ${ratingMin_W}–${ratingMax_W} W; more if hot enclosure or pulsed load)`;
    // Practical notes (not a substitute for real-world validation)
    const notes = [];

    if (P >= 1) notes.push("Use a physically larger resistor and allow airflow.");
    if (ratingMin_W < 0.25) notes.push("Minimum common rating is 0.25 W; consider 0.25 W or higher.");
    if (ratingMin_W >= 0.25 && ratingMin_W < 0.5) notes.push("0.5 W parts often run cooler than 0.25 W.");
    if (ratingMin_W >= 0.5 && ratingMin_W < 1) notes.push("Consider 1 W for cooler operation.");

    notes.push("Verify with actual component temperature in your enclosure.");
    notes.push("For pulsed loads, check peak power and resistor pulse/energy rating.");
    notes.push("Choose an appropriate tolerance and temperature coefficient for your application.");

    noteLine.textContent = notes.join(" ");
  });