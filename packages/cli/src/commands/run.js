const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();

function fail(msg) {
  console.log("❌ " + msg);
}

module.exports = function run(kind, name, passArgs) {
  if (kind !== "factory" || !name) {
    console.log("Usage: awe run factory <name> [--topic ...] [--out ...]");
    process.exit(1);
  }

  const pkgDir = path.join(root, "registry", "packages", name);
  const pkgJson = path.join(pkgDir, "package.json");

  if (!fs.existsSync(pkgJson)) {
    fail(`factory not found: ${name}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
  if (pkg.type !== "factory") {
    fail(`${name} is not a factory`);
    process.exit(1);
  }

  const entry = path.join(pkgDir, pkg.entry || "bin/run.js");
  if (!fs.existsSync(entry)) {
    fail(`factory entry missing: ${entry}`);
    process.exit(1);
  }

  const result = spawnSync("node", [entry, ...passArgs], {
    stdio: "inherit",
    cwd: root,
  });

  process.exit(result.status || 0);
};
