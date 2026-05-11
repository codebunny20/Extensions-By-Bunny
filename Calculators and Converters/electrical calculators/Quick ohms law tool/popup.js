const V = document.getElementById("voltage");
const I = document.getElementById("current");
const R = document.getElementById("resistance");
const P = document.getElementById("power");

document.getElementById("calcBtn").addEventListener("click", () => {
  let v = parseFloat(V.value);
  let i = parseFloat(I.value);
  let r = parseFloat(R.value);
  let p = parseFloat(P.value);

  // Count how many fields are filled
  const filled = [v, i, r, p].filter(x => !isNaN(x)).length;

  if (filled < 2) return;

  // Solve using Ohm's Law
  if (!isNaN(v) && !isNaN(i)) {
    r = v / i;
    p = v * i;
  } else if (!isNaN(v) && !isNaN(r)) {
    i = v / r;
    p = v * i;
  } else if (!isNaN(v) && !isNaN(p)) {
    i = p / v;
    r = v / i;
  } else if (!isNaN(i) && !isNaN(r)) {
    v = i * r;
    p = v * i;
  } else if (!isNaN(i) && !isNaN(p)) {
    v = p / i;
    r = v / i;
  } else if (!isNaN(r) && !isNaN(p)) {
    i = Math.sqrt(p / r);
    v = i * r;
  }

  V.value = v.toFixed(4);
  I.value = i.toFixed(4);
  R.value = r.toFixed(4);
  P.value = p.toFixed(4);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  V.value = "";
  I.value = "";
  R.value = "";
  P.value = "";
});
