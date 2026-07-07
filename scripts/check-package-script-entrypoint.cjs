#!/usr/bin/env node
/**
 * Standalone validation for the M9.9 package script entrypoint.
 *
 * NOT wired into package.json scripts, check:all, CI, or doctor.
 * Run: node scripts/check-package-script-entrypoint.cjs
 *
 * Verifies:
 *  - pack-context:soft-report exists and has the correct value
 *  - No forbidden scripts were added
 *  - check:all does not reference the new script
 *  - Actual npm run execution produces valid soft-validation report
 */

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var { execFileSync } = require("child_process");

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error("FAIL: " + name);
    console.error("  " + e.message);
  }
}

var ROOT = path.resolve(__dirname, "..");
var PKG_PATH = path.join(ROOT, "package.json");
var PKG = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
var SCRIPTS = PKG.scripts || {};

/* ---- Forbidden script names ---- */

var FORBIDDEN = [
  "check:soft-report",
  "validate:pack-context",
  "check:pack-context",
  "doctor:soft-validation",
];

/* ---- Expected values ---- */

var EXPECTED_NAME = "pack-context:soft-report";
var EXPECTED_VALUE = "node scripts/generate-pack-runtime-context-soft-report.cjs";

/* ---- Temp helpers ---- */

var tmpDir = null;

function mktmp() {
  if (!tmpDir) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "awe-m99-"));
  }
  return tmpDir;
}

function writeTmpFile(name, content) {
  var dir = mktmp();
  var fp = path.join(dir, name);
  fs.writeFileSync(fp, content, "utf8");
  return fp;
}

/* ================================================================== */
/* TESTS                                                              */
/* ================================================================== */

/* 1. Script name exists */

test("pack-context:soft-report exists in package.json scripts", function () {
  assert.ok(
    EXPECTED_NAME in SCRIPTS,
    "Missing script: " + EXPECTED_NAME
  );
});

/* 2. Script value is exact */

test("pack-context:soft-report value is correct", function () {
  assert.strictEqual(
    SCRIPTS[EXPECTED_NAME],
    EXPECTED_VALUE,
    "Expected '" + EXPECTED_VALUE + "', got '" + SCRIPTS[EXPECTED_NAME] + "'"
  );
});

/* 3. No forbidden scripts added */

test("no forbidden scripts were added", function () {
  for (var i = 0; i < FORBIDDEN.length; i++) {
    assert.ok(
      !(FORBIDDEN[i] in SCRIPTS),
      "Forbidden script should not exist: " + FORBIDDEN[i]
    );
  }
});

/* 4. check:all does not reference the new script */

test("check:all does not reference pack-context:soft-report", function () {
  var checkAll = SCRIPTS["check:all"] || "";
  assert.strictEqual(
    checkAll.indexOf("pack-context:soft-report"),
    -1,
    "check:all must not reference pack-context:soft-report"
  );
});

test("check:all does not reference generate-pack-runtime-context-soft-report.cjs", function () {
  var checkAll = SCRIPTS["check:all"] || "";
  assert.strictEqual(
    checkAll.indexOf("generate-pack-runtime-context-soft-report.cjs"),
    -1,
    "check:all must not reference the standalone script"
  );
});

/* 5. Verify check:all and doctor are unchanged */

test("check:all still equals original", function () {
  assert.strictEqual(
    SCRIPTS["check:all"],
    "npm run check:m8-docs && npm run doctor",
    "check:all should be unchanged"
  );
});

test("doctor still equals original", function () {
  assert.strictEqual(
    SCRIPTS["doctor"],
    "node packages/cli/src/index.js doctor",
    "doctor should be unchanged"
  );
});

/* 6. Create a minimal valid PackRuntimeContext input */

var VALID_INPUT = JSON.stringify({
  identity: { packId: "test-pack" },
  metadata: { name: "Test", version: "0.1.0" },
  governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
  runtime: { loadedByDefault: false, requiresPackLoader: true },
});

var INPUT_FILE = writeTmpFile("valid-input.json", VALID_INPUT);

/* Helper: strip npm wrapper lines (> script-name / > command) from stdout */

function stripNpmWrapper(stdout) {
  var lines = stdout.split("\n");
  var start = 0;
  // Skip leading blank line (npm prepends \n before wrapper)
  while (start < lines.length && (lines[start].trim() === "" || lines[start].match(/^>\s*/))) {
    start++;
  }
  return lines.slice(start).join("\n").trim();
}

/* 7. Run via npm script: basic (stdout JSON) */

test("npm run pack-context:soft-report -- --input exits 0", function () {
  var result = execFileSync("npm", [
    "run",
    "pack-context:soft-report",
    "--",
    "--input",
    INPUT_FILE,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15000,
    env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
  });
  var extracted = stripNpmWrapper(result);
  assert(extracted.length > 0, "stdout should not be empty after stripping npm wrapper");
  var report = JSON.parse(extracted);
  assert.strictEqual(report.reportType, "soft-validation");
});

/* 8. Verify no .validation/ directory created by stdout-only run */

test("no .validation/ directory created after stdout run", function () {
  // Run in ROOT (has package.json), then check ROOT for .validation/
  execFileSync("npm", [
    "run",
    "pack-context:soft-report",
    "--",
    "--input",
    INPUT_FILE,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15000,
    env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
  });
  assert(
    !fs.existsSync(path.join(ROOT, ".validation")),
    ".validation/ should not be created in project root"
  );
});

/* 9. Run via npm script: --compact */

test("npm run pack-context:soft-report -- --compact exits 0", function () {
  var result = execFileSync("npm", [
    "run",
    "pack-context:soft-report",
    "--",
    "--input",
    INPUT_FILE,
    "--compact",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15000,
    env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
  });
  var extracted = stripNpmWrapper(result);
  assert(extracted.indexOf("\n") === -1, "compact output should have no newlines, got: " + extracted.substring(0, 80));
  var report = JSON.parse(extracted);
  assert.strictEqual(report.reportType, "soft-validation");
});

/* 10. Run via npm script: --out writes file */

var OUT_FILE = path.join(mktmp(), "nested", "deep", "report.json");

test("npm run pack-context:soft-report -- --out writes file", function () {
  var result = execFileSync("npm", [
    "run",
    "pack-context:soft-report",
    "--",
    "--input",
    INPUT_FILE,
    "--out",
    OUT_FILE,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15000,
    env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
  });
  assert(fs.existsSync(OUT_FILE), "Output file should exist at " + OUT_FILE);
  var content = fs.readFileSync(OUT_FILE, "utf8");
  var report = JSON.parse(content);
  assert.strictEqual(report.reportType, "soft-validation");
});

/* 11. --help works via npm script */

test("npm run pack-context:soft-report -- --help exits 0", function () {
  var result = execFileSync("npm", [
    "run",
    "pack-context:soft-report",
    "--",
    "--help",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 15000,
    env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
  });
  assert(result.indexOf("Usage:") !== -1, "--help should print Usage");
});

/* ================================================================== */
/* SUMMARY                                                            */
/* ================================================================== */

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Package script entrypoint check passed");
}
