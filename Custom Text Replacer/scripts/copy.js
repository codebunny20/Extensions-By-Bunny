// Post-build copy: moves manifest + HTML files into dist/ so the dist/
// folder can be loaded directly as an unpacked Chrome extension.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const copies = [
  ["manifest.json",          "manifest.json"],
  ["src/popup/popup.html",   "popup/popup.html"],
  ["src/popup/popup.css",    "popup/popup.css"],
  ["src/site/index.html",    "site/index.html"],
  ["src/site/style.css",     "site/style.css"],
];

for (const [src, dest] of copies) {
  const srcPath  = path.join(root, src);
  const destPath = path.join(dist, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied  ${src}  →  dist/${dest}`);
}

console.log("Done.");
