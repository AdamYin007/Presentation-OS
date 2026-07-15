#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const args = process.argv.slice(2);
const cmd = args[0];

function ok(msg) {
  console.log("✅ " + msg);
}

function fail(msg) {
  console.log("❌ " + msg);
}

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function listDir(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) {
    fail(`${dir} missing`);
    process.exit(1);
  }
  const items = fs.readdirSync(full).filter(x => !x.startsWith("."));
  if (items.length === 0) {
    console.log(`No ${dir} found.`);
    return;
  }
  items.forEach(x => console.log(x));
}

if (!cmd || cmd === "help") {
  console.log(`
AWE - AI Workspace Enterprise

Commands:
  awe doctor
  awe list <skills|workflows|factories>
  awe search <keyword>
  awe install <package>
  awe installed
  awe remove <package>
  awe run factory <name> [--topic ...] [--out ...]
  awe registry list
  awe sprint
  awe help
`);
  process.exit(0);
}

if (cmd === "doctor") {
  console.log("== AWE Doctor ==");

  let failed = false;

  [
    "package.json",
    "packages/cli/src/index.js",
    "registry",
    "skills",
    "workflows",
    "factories",
    "prompts",
    "docs",
    "tests"
  ].forEach(p => {
    if (exists(p)) {
      ok(p);
    } else {
      fail(p);
      failed = true;
    }
  });

  const { checkM8Docs } = require("../../../scripts/check-m8-docs.cjs");
  const m8DocsResult = checkM8Docs({ verbose: false, cwd: root });

  if (m8DocsResult.ok) {
    ok("M8 docs smoke");
  } else {
    fail("M8 docs smoke");
    m8DocsResult.failures.forEach(reason => console.log(`  - ${reason}`));
    failed = true;
  }

  process.exit(failed ? 1 : 0);
}

if (cmd === "list") {
  const type = args[1];
  if (!["skills", "workflows", "factories"].includes(type)) {
    console.log("Usage: awe list skills|workflows|factories");
    process.exit(1);
  }
  listDir(type);
  process.exit(0);
}


if (cmd === "search") {
  const keyword = args[1];
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
  const found = (data.packages || []).filter(p => {
    const text = `${p.name} ${p.type} ${p.description || ""}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  });

  if (found.length === 0) {
    console.log(`No packages found for: ${keyword}`);
    process.exit(0);
  }

  found.forEach(p => {
    console.log(`${p.name}@${p.version} - ${p.type} - ${p.description || ""}`);
  });
  process.exit(0);
}


if (cmd === "install") {
  const name = args[1];
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
  const pkg = (data.packages || []).find(p => p.name === name);

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

  const existsAlready = installed.packages.some(p => p.name === pkg.name);
  if (!existsAlready) {
    installed.packages.push({
      name: pkg.name,
      version: pkg.version,
      type: pkg.type,
      installedAt: new Date().toISOString()
    });
  }

  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));
  ok(`installed ${pkg.name}@${pkg.version}`);
  process.exit(0);
}

if (cmd === "installed") {
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

  installed.packages.forEach(p => {
    console.log(`${p.name}@${p.version} - ${p.type}`);
  });
  process.exit(0);
}


if (cmd === "remove" || cmd === "uninstall") {
  const name = args[1];
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
  installed.packages = installed.packages.filter(p => p.name !== name);

  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));

  if (installed.packages.length === before) {
    fail(`package not installed: ${name}`);
    process.exit(1);
  }

  ok(`removed ${name}`);
  process.exit(0);
}


if (cmd === "run") {
  const kind = args[1];
  const name = args[2];

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

  const { spawnSync } = require("child_process");
  const passArgs = args.slice(3);

  const result = spawnSync("node", [entry, ...passArgs], {
    stdio: "inherit",
    cwd: root
  });

  process.exit(result.status || 0);
}

if (cmd === "registry") {
  const sub = args[1];
  if (sub === "list") {
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
    data.packages.forEach(p => {
      console.log(`${p.name}@${p.version} - ${p.type}`);
    });
    process.exit(0);
  }
}


/* ── sprint ───────────────────────────────────────────── */
if (cmd === "sprint") {
  const sprintFile = path.join(root, "docs", "sprint.md");
  if (!fs.existsSync(sprintFile)) {
    console.log("❌ docs/sprint.md not found. Create it first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(sprintFile, "utf8");

  // Pick the right section by matching heading text
  function findBlock(content, title) {
    const idx = content.indexOf(`## ${title}`);
    if (idx === -1) return [];
    const from = content.substring(idx);
    const lines = from.split("\n");
    let result = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 0) { result.push(lines[i]); continue; }
      const m = lines[i].match(/^##\s+/);
      if (m) break; // hit next top-level heading
      result.push(lines[i]);
    }
    return result;
  }

  console.log("=== AWE Sprint — " + new Date().toLocaleDateString("zh-CN", { year:"numeric", month:"long", day:"numeric", weekday:"long" }) + " ===");
  console.log("");

  console.log("--- 今日任务 ---");
  findBlock(raw, "Today").forEach(l => console.log(l));
  console.log("");

  console.log("--- 验收标准 ---");
  findBlock(raw, "Acceptance").forEach(l => console.log(l));
  console.log("");

  console.log("--- 建议 Agent 分工 ---");
  findBlock(raw, "Agents").forEach(l => console.log(l));
  console.log("");

  console.log("完整计划: docs/sprint.md");
  process.exit(0);
}

console.log("Unknown command:", cmd);
process.exit(1);
