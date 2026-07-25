const fs = require("fs");
const path = require("path");

const root = process.cwd();

function fail(msg) {
  console.log("❌ " + msg);
}

function listDir(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) {
    fail(`${dir} missing`);
    process.exit(1);
  }
  const items = fs.readdirSync(full).filter((x) => !x.startsWith("."));
  if (items.length === 0) {
    console.log(`No ${dir} found.`);
    return;
  }
  items.forEach((x) => console.log(x));
}

module.exports = function list(type) {
  if (!["skills", "workflows", "factories"].includes(type)) {
    console.log("Usage: awe list skills|workflows|factories");
    process.exit(1);
  }
  listDir(type);
  process.exit(0);
};
