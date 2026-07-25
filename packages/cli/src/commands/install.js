const fs = require("fs");
const path = require("path");

const root = process.cwd();

function ok(msg) {
  console.log("✅ " + msg);
}

function fail(msg) {
  console.log("❌ " + msg);
}

module.exports = function install(name) {
  if (!name) {
    console.log("Usage: awe install <package>");
    process.exit(1);
  }

  const indexPath = path.join(root, "registry", "index.json");
  if (!fs.existsSync(indexPath)) {
    fail("registry/index.json missing");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const pkg = (data.packages || []).find((p) => p.name === name);

  if (!pkg) {
    fail(`package not found: ${name}`);
    process.exit(1);
  }

  const stateDir = path.join(root, ".awe");
  const installedPath = path.join(stateDir, "installed.json");

  fs.mkdirSync(stateDir, { recursive: true });

  let installed = { packages: [] };
  if (fs.existsSync(installedPath)) {
    installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
  }

  const existsAlready = installed.packages.some((p) => p.name === pkg.name);
  if (!existsAlready) {
    installed.packages.push({
      name: pkg.name,
      version: pkg.version,
      type: pkg.type,
      installedAt: new Date().toISOString(),
    });
  }

  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));
  ok(`installed ${pkg.name}@${pkg.version}`);
  process.exit(0);
};
