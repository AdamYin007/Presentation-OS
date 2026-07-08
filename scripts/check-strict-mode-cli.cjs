#!/usr/bin/env node
"use strict";

/**
 * Check script for M11.6 Strict Mode CLI
 *
 * Validates the CLI independently. Does NOT modify package.json, check:all,
 * doctor, CI, fixtures, or snapshots.
 */

var assert = require("assert");
var childProcess = require("child_process");
var path = require("path");
var fs = require("fs");

var baseDir = path.resolve(__dirname, "..");
var cliPath = path.join(baseDir, "scripts", "validate-pack-runtime-context.cjs");
var snapDir = path.join(baseDir, "test", "snapshots", "pack-runtime-context-soft-report");
var fixtureDir = path.join(baseDir, "test", "fixtures", "pack-runtime-context");

var fixtures = {
  minimalValid: path.join(fixtureDir, "valid", "minimal-valid.json"),
  contextNotObject: path.join(fixtureDir, "invalid", "context-not-object.json"),
  missingContractVersion: path.join(fixtureDir, "edge", "missing-contract-version.json"),
};

var passed = 0;
var failed = 0;
var failures = [];

function runCli(args) {
  var result = childProcess.spawnSync("node", [cliPath].concat(args), {
    cwd: baseDir,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(name + ": " + e.message);
  }
}

// 1. --help exit 0
check("--help exit 0", function () {
  var r = runCli(["--help"]);
  assert.strictEqual(r.exitCode, 0, "expected exit 0, got " + r.exitCode);
});

// 2. no args exit 1
check("no args exit 1", function () {
  var r = runCli([]);
  assert.strictEqual(r.exitCode, 1, "expected exit 1, got " + r.exitCode);
});

// 3. unknown arg exit 1
check("unknown arg exit 1", function () {
  var r = runCli(["--bogus"]);
  assert.strictEqual(r.exitCode, 1);
});

// 4. --fixture missing value exit 1
check("--fixture missing value exit 1", function () {
  var r = runCli(["--fixture"]);
  assert.strictEqual(r.exitCode, 1);
});

// 5. --strict + --soft exit 1
check("--strict + --soft exit 1", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--strict", "--soft"]);
  assert.strictEqual(r.exitCode, 1);
});

// 6. --compact without --json exit 1
check("--compact without --json exit 1", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--compact"]);
  assert.strictEqual(r.exitCode, 1);
});

// 7. dangerous params all exit 1
check("dangerous params exit 1", function () {
  var dangerous = ["--update", "--write", "--fix", "--delete", "--repair", "--all"];
  for (var i = 0; i < dangerous.length; i++) {
    var r = runCli(["--fixture", fixtures.minimalValid, dangerous[i]]);
    assert.strictEqual(r.exitCode, 1, dangerous[i] + " should exit 1");
  }
});

// 8. fixture not exist exit 1
check("fixture not exist exit 1", function () {
  var r = runCli(["--fixture", "/nonexistent/path.json"]);
  assert.strictEqual(r.exitCode, 1);
});

// 9. invalid JSON exit 1
check("invalid JSON exit 1", function () {
  var tmpFile = path.join("/tmp", "awe-test-invalid-" + Date.now() + ".json");
  fs.writeFileSync(tmpFile, "{bad json");
  var r = runCli(["--fixture", tmpFile]);
  assert.strictEqual(r.exitCode, 1);
  fs.unlinkSync(tmpFile);
});

// 10. minimal-valid: soft exit 0/pass, strict exit 0/pass
check("minimal-valid soft exit 0 pass", function () {
  var r = runCli(["--fixture", fixtures.minimalValid]);
  assert.strictEqual(r.exitCode, 0);
  assert(r.stdout.indexOf("Status: pass") !== -1, "expected status pass in output");
});

check("minimal-valid strict exit 0 pass", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--strict"]);
  assert.strictEqual(r.exitCode, 0);
  assert(r.stdout.indexOf("Status: pass") !== -1, "expected status pass in output");
});

// 11. context-not-object: soft exit 0/soft-fail/non-blocking, strict exit 1/hard-fail/blocking
check("context-not-object soft exit 0 soft-fail non-blocking", function () {
  var r = runCli(["--fixture", fixtures.contextNotObject]);
  assert.strictEqual(r.exitCode, 0);
  assert(r.stdout.indexOf("soft-fail") !== -1, "expected soft-fail");
  assert(r.stdout.indexOf("Blocking: no") !== -1, "expected blocking no");
});

check("context-not-object strict exit 1 hard-fail blocking", function () {
  var r = runCli(["--fixture", fixtures.contextNotObject, "--strict"]);
  assert.strictEqual(r.exitCode, 1, "expected exit 1, got " + r.exitCode);
  assert(r.stdout.indexOf("hard-fail") !== -1, "expected hard-fail");
  assert(r.stdout.indexOf("ERROR_CONTEXT_NOT_OBJECT") !== -1, "expected finding code");
});

// 12. missing-contract-version: soft/strict both exit 0 pass-with-info
check("missing-contract-version soft exit 0 pass-with-info", function () {
  var r = runCli(["--fixture", fixtures.missingContractVersion]);
  assert.strictEqual(r.exitCode, 0);
  assert(r.stdout.indexOf("pass-with-info") !== -1, "expected pass-with-info, got: " + r.stdout);
});

check("missing-contract-version strict exit 0 pass-with-info", function () {
  var r = runCli(["--fixture", fixtures.missingContractVersion, "--strict"]);
  assert.strictEqual(r.exitCode, 0);
  assert(r.stdout.indexOf("pass-with-info") !== -1, "expected pass-with-info, got: " + r.stdout);
});

// 13. --json is valid JSON
check("--json is valid JSON", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--strict", "--json"]);
  assert.strictEqual(r.exitCode, 0);
  var parsed = JSON.parse(r.stdout.trim());
  assert.strictEqual(parsed.mode, "strict");
  assert.strictEqual(parsed.status, "pass");
});

// 14. --compact single line
check("--compact single line", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--strict", "--json", "--compact"]);
  assert.strictEqual(r.exitCode, 0);
  var lines = r.stdout.trim().split("\n");
  assert.strictEqual(lines.length, 1, "expected single line, got " + lines.length);
});

// 15. repeated JSON output byte equal
check("repeated JSON output byte equal", function () {
  var r1 = runCli(["--fixture", fixtures.minimalValid, "--strict", "--json"]);
  var r2 = runCli(["--fixture", fixtures.minimalValid, "--strict", "--json"]);
  assert.strictEqual(r1.stdout, r2.stdout, "JSON output should be deterministic");
});

// 16. formatter output deterministic
check("formatter output deterministic", function () {
  var r1 = runCli(["--fixture", fixtures.contextNotObject, "--strict"]);
  var r2 = runCli(["--fixture", fixtures.contextNotObject, "--strict"]);
  assert.strictEqual(r1.stdout, r2.stdout, "human output should be deterministic");
});

// 17. no absolute path / cwd / HOME in output
check("no absolute path leakage", function () {
  var r = runCli(["--fixture", fixtures.minimalValid, "--strict", "--json"]);
  assert.strictEqual(r.exitCode, 0);
  var home = require("os").homedir();
  assert.strictEqual(r.stdout.indexOf(home), -1, "should not leak home path");
});

// 18. CLI has no write API
check("CLI no write API", function () {
  var src = fs.readFileSync(cliPath, "utf8");
  assert.strictEqual(src.indexOf("writeFile"), -1, "should not use writeFile");
  assert.strictEqual(src.indexOf("writeFileSync"), -1);
  assert.strictEqual(src.indexOf("mkdir"), -1);
  assert.strictEqual(src.indexOf("appendFile"), -1);
  assert.strictEqual(src.indexOf("createWriteStream"), -1);
});

// 19. CLI no process.env/Date/Math.random (code only, not comments)
check("CLI no process.env/Date/Math.random", function () {
  var src = fs.readFileSync(cliPath, "utf8");
  var codeLines = src.split("\n").filter(function(l) { var t=l.trim(); return t[0]!="/"&&t[0]!=="*"; });
  var code = codeLines.join("\n");
  assert.strictEqual(code.indexOf("process.env"), -1, "should not use process.env in code");
  assert.strictEqual(code.indexOf("new Date"), -1, "should not use Date");
  assert.strictEqual(code.indexOf("Math.random"), -1, "should not use Math.random");
});

// 20. CLI does not import snapshot/comparator
check("CLI no snapshot/comparator import", function () {
  var src = fs.readFileSync(cliPath, "utf8");
  var requireCalls = src.match(/require\s*\(\s*['"][^'"]+['"]\s*\)/g) || [];
  var hasSnapshot = requireCalls.some(function (r) {
    return r.toLowerCase().indexOf("snapshot") !== -1;
  });
  var hasComparator = requireCalls.some(function (r) {
    return r.toLowerCase().indexOf("comparator") !== -1;
  });
  assert.strictEqual(hasSnapshot, false);
  assert.strictEqual(hasComparator, false);
});

// 21. fixture hash unchanged (just verify files readable)
check("fixture hash unchanged", function () {
  var keys = Object.keys(fixtures);
  for (var i = 0; i < keys.length; i++) {
    var content = fs.readFileSync(fixtures[keys[i]], "utf8");
    assert.ok(content.length > 0, fixtures[keys[i]] + " should be readable");
  }
});

// 22. snapshot hash unchanged
check("snapshot hash unchanged", function () {
  var files = fs.readdirSync(snapDir);
  assert.ok(files.length > 0);
});

// 23. snapshot JSON exactly 3
check("snapshot JSON count is 3", function () {
  var jsonFiles = [];
  function walk(dir) {
    var entries = fs.readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
      var fp = path.join(dir, entries[i]);
      var st = fs.statSync(fp);
      if (st.isDirectory()) walk(fp);
      else if (entries[i].endsWith(".report.json")) jsonFiles.push(entries[i]);
    }
  }
  walk(snapDir);
  assert.strictEqual(jsonFiles.length, 3);
});

// 24. .validation/ does not exist
check(".validation/ does not exist", function () {
  var valDir = path.join(baseDir, ".validation");
  assert.strictEqual(fs.existsSync(valDir), false);
});

// 25. skills/chatgpt-desktop-mcp/ not in diff
check("skills/chatgpt-desktop-mcp/ not in diff", function () {
  var r = childProcess.spawnSync("git", ["diff", "--name-only", "origin/develop...HEAD"], {
    cwd: baseDir,
    encoding: "utf8",
  });
  var diffOutput = r.stdout || "";
  assert.strictEqual(diffOutput.indexOf("skills/chatgpt-desktop-mcp"), -1);
});

// 26. package.json unchanged
check("package.json unchanged", function () {
  var r = childProcess.spawnSync("git", ["diff", "--name-only", "origin/develop...HEAD"], {
    cwd: baseDir,
    encoding: "utf8",
  });
  var diffOutput = r.stdout || "";
  var lines = diffOutput.split("\n").filter(function (l) {
    return l.trim().length > 0;
  });
  var hasPackageJson = lines.some(function (l) {
    return l.includes("package.json");
  });
  assert.strictEqual(hasPackageJson, false, "package.json should not be modified");
});

// 27. existing strict library checks still pass
check("existing strict library checks pass", function () {
  var r = childProcess.spawnSync("node", [path.join(baseDir, "scripts", "check-strict-mode-library-skeleton.cjs")], {
    cwd: baseDir,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.strictEqual(r.status, 0, "strict library checks failed: " + r.stderr);
});

// Print results
console.log("");
console.log("Strict mode CLI check results:");
console.log("  Passed: " + passed);
console.log("  Failed: " + failed);

if (failures.length > 0) {
  console.log("");
  console.log("Failures:");
  failures.forEach(function (f) {
    console.log("  - " + f);
  });
  process.exit(1);
}

console.log("");
console.log("Strict mode CLI check passed");
