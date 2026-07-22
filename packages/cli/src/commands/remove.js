const fs = require("fs");
const path = require("path");

const root = process.cwd();

function ok(msg) {
  console.log("✅ " + msg);
}

function fail(msg) {
  console.log("❌ " + msg);
}

module.exports = function remove(name) {
  if (!name) {
    console.log("Usage: awe remove <package>");
    process.exit(1);
  }

  const installedPath = path.join(root, ".awe", "installed.json");
  if (!fs.existsSync(installedPath)) {
    console.log("No packages installed.");
    process.exit(0);
  }

  const installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
  const before = installed.packages.length;
  installed.packages = installed.packages.filter((p) => p.name !== name);

  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));

  if (installed.packages.length === before) {
    fail(`package not installed: ${name}`);
    process.exit(1);
  }

  ok(`removed ${name}`);
  process.exit(0);
};
