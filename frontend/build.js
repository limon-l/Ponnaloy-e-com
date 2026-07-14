const fs = require("fs");
const path = require("path");

const apiUrl = process.env.PONNALOY_API_URL;

if (!apiUrl) {
  console.log("PONNALOY_API_URL not set — using default env.js (auto-detect).");
  process.exit(0);
}

const envContent = `window.PONNALOY_API_URL = ${JSON.stringify(apiUrl)};\n`;
const target = path.join(__dirname, "public", "js", "env.js");

fs.writeFileSync(target, envContent, "utf8");
console.log(`env.js written → ${apiUrl}`);
