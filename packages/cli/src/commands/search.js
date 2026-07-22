const fs = require("fs");
const path = require("path");

const root = process.cwd();

function fail(msg) {
  console.log("❌ " + msg);
}

module.exports = function search(keyword) {
  if (!keyword) {
    console.log("Usage: awe search <keyword>");
    process.exit(1);
  }

  const indexPath = path.join(root, "registry", "index.json");
  if (!fs.existsSync(indexPath)) {
    fail("registry/index.json missing");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const found = (data.packages || []).filter((p) => {
    const text = `${p.name} ${p.type} ${p.description || ""}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  });

  if (found.length === 0) {
    console.log(`No packages found for: ${keyword}`);
    process.exit(0);
  }

  found.forEach((p) => {
    console.log(`${p.name}@${p.version} - ${p.type} - ${p.description || ""}`);
  });
  process.exit(0);
};
