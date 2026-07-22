const fs = require("fs");
const path = require("path");

const root = process.cwd();

function fail(msg) {
  console.log("❌ " + msg);
}

module.exports = function registryList() {
  const indexPath = path.join(root, "registry", "index.json");
  if (!fs.existsSync(indexPath)) {
    fail("registry/index.json missing");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (!data.packages || data.packages.length === 0) {
    console.log("No registry packages found.");
    process.exit(0);
  }
  data.packages.forEach((p) => {
    console.log(`${p.name}@${p.version} - ${p.type}`);
  });
  process.exit(0);
};
