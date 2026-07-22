const fs = require("fs");
const path = require("path");

const root = process.cwd();

module.exports = function installed() {
  const installedPath = path.join(root, ".awe", "installed.json");
  if (!fs.existsSync(installedPath)) {
    console.log("No packages installed.");
    process.exit(0);
  }

  const installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
  if (!installed.packages || installed.packages.length === 0) {
    console.log("No packages installed.");
    process.exit(0);
  }

  installed.packages.forEach((p) => {
    console.log(`${p.name}@${p.version} - ${p.type}`);
  });
  process.exit(0);
};
