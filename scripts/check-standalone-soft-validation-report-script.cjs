#!/usr/bin/env node
/**
 * Standalone validation for the soft validation report generation script.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-standalone-soft-validation-report-script.cjs
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

var SCRIPT = path.resolve(__dirname, "generate-pack-runtime-context-soft-report.cjs");
var tmpDir = null;

function mktmp() {
  if (!tmpDir) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "awe-test-"));
  }
  return tmpDir;
}

function writeTmpFile(name, content) {
  var dir = mktmp();
  var fp = path.join(dir, name);
  fs.writeFileSync(fp, content, "utf8");
  return fp;
}

function runScript(args, opts) {
  opts = opts || {};
  var env = Object.assign({}, process.env);
  if (opts.noThrow) env._NO_THROW = "1";
  try {
    var result = execFileSync(process.execPath, [SCRIPT].concat(args), {
      cwd: __dirname,
      env: env,
      timeout: 15000,
      encoding: "utf8",
    });
    return { ok: true, stdout: result, stderr: "", code: 0 };
  } catch (e) {
    var stderr = "";
    var stdout = "";
    if (e.stdout) stdout = e.stdout.toString();
    if (e.stderr) stderr = e.stderr.toString();
    return { ok: false, stdout: stdout, stderr: stderr, code: e.code || 1 };
  }
}

function parseStdout(stdout) {
  try {
    return JSON.parse(stdout.trim());
  } catch (e) {
    // Maybe the output is mixed (e.g. confirmation message)
    var lastBrace = stdout.lastIndexOf("}");
    if (lastBrace !== -1) {
      return JSON.parse(stdout.substring(lastBrace).trim());
    }
    throw new Error("Cannot parse stdout as JSON: " + stdout.substring(0, 200));
  }
}

/* ---- Test: --help exits 0 ---- */

test("--help exits 0 and prints usage", function () {
  var r = runScript(["--help"]);
  assert.strictEqual(r.code, 0, "--help should exit 0, got code " + r.code);
  assert(r.stdout.indexOf("Usage:") !== -1, "--help should print Usage");
});

/* ---- Test: missing --input exits 1 ---- */

test("missing --input exits 1", function () {
  var r = runScript([]);
  assert(r.code !== 0, "missing --input should exit non-zero");
  assert(r.stderr.indexOf("Error") !== -1, "stderr should contain Error");
});

/* ---- Test: unknown option exits 1 ---- */

test("unknown option exits 1", function () {
  var r = runScript(["--bogus"]);
  assert(r.code !== 0, "unknown option should exit non-zero");
});

/* ---- Test: valid-ish context ---- */

test("valid-ish context exits 0, stdout is parseable JSON", function () {
  var input = JSON.stringify({
    identity: { packId: "test-pack" },
    metadata: { name: "Test", version: "0.1.0" },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    runtime: { loadedByDefault: false, requiresPackLoader: true },
  });
  var inputPath = writeTmpFile("valid-ctx.json", input);
  var r = runScript(["--input", inputPath]);
  assert.strictEqual(r.code, 0, "valid context should exit 0, got " + r.code);
  var report = parseStdout(r.stdout);
  assert.strictEqual(report.reportType, "soft-validation");
  assert.strictEqual(report.reportVersion, "0.1");
  assert(Object.values(require("../packages/cli/src/validation/soft-validation-report-writer.js").REPORT_STATUS).indexOf(report.status) !== -1);
});

/* ---- Test: missing contractVersion ---- */

test("missing contractVersion exits 0, report status is pass-with-info or pass-with-warnings", function () {
  var input = JSON.stringify({
    identity: { packId: "test-pack" },
    metadata: { name: "Test" },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    runtime: { loadedByDefault: false, requiresPackLoader: true },
    boundaries: { storyRegistryDefault: true },
    sourceOfTruth: { packsAreDefault: false },
    outputPolicy: {},
    validation: {},
  });
  var inputPath = writeTmpFile("missing-cv.json", input);
  var r = runScript(["--input", inputPath]);
  assert.strictEqual(r.code, 0);
  var report = parseStdout(r.stdout);
  assert(
    report.status === "pass-with-info" || report.status === "pass-with-warnings" || report.status === "pass",
    "status should be pass variant, got: " + report.status
  );
});

/* ---- Test: invalid non-object context ---- */

test("invalid non-object context exits 0, report status soft-fail", function () {
  var inputPath = writeTmpFile("invalid-array.json", JSON.stringify([1, 2, 3]));
  var r = runScript(["--input", inputPath]);
  assert.strictEqual(r.code, 0, "non-object should still exit 0, got " + r.code);
  var report = parseStdout(r.stdout);
  assert.strictEqual(report.status, "soft-fail", "non-object should be soft-fail, got: " + report.status);
});

/* ---- Test: bare string input ---- */

test("bare string JSON exits 0, report status soft-fail", function () {
  var inputPath = writeTmpFile("bad-string.json", JSON.stringify("not-an-object"));
  var r = runScript(["--input", inputPath]);
  assert.strictEqual(r.code, 0);
  var report = parseStdout(r.stdout);
  assert.strictEqual(report.status, "soft-fail");
});

/* ---- Test: --compact produces parseable JSON ---- */

test("--compact output is parseable JSON", function () {
  var input = JSON.stringify({ identity: { packId: "x" } });
  var inputPath = writeTmpFile("compact-test.json", input);
  var r = runScript(["--input", inputPath, "--compact"]);
  assert.strictEqual(r.code, 0);
  var report = parseStdout(r.stdout);
  assert.strictEqual(report.reportType, "soft-validation");
  // Compact should not have newlines (except maybe trailing)
  var trimmed = r.stdout.trim();
  assert(trimmed.indexOf("\n") === -1, "compact output should not contain newlines");
});

/* ---- Test: --out writes file ---- */

test("--out writes report to specified file", function () {
  var input = JSON.stringify({ identity: { packId: "x" } });
  var inputPath = writeTmpFile("out-test.json", input);
  var outPath = path.join(mktmp(), "nested", "deep", "report.json");
  var r = runScript(["--input", inputPath, "--out", outPath]);
  assert.strictEqual(r.code, 0);
  assert(fs.existsSync(outPath), "report file should exist at " + outPath);
  var fileContent = fs.readFileSync(outPath, "utf8");
  var report = JSON.parse(fileContent);
  assert.strictEqual(report.reportType, "soft-validation");
});

/* ---- Test: no --out means no .validation/ created ---- */

test("without --out, no .validation/ directory is created", function () {
  var input = JSON.stringify({ identity: { packId: "x" } });
  var inputPath = writeTmpFile("no-out-test.json", input);
  // Pick a temp dir that definitely has no .validation/
  var scanDir = mktmp();
  var r = runScript(["--input", inputPath]);
  assert.strictEqual(r.code, 0);
  // The script only writes to stdout when no --out, so check no .validation dir appeared
  assert(!fs.existsSync(path.join(scanDir, ".validation")), ".validation/ should not be created without --out");
});

/* ---- Test: nonexistent input file exits 1 ---- */

test("nonexistent input file exits 1", function () {
  var r = runScript(["--input", "/nonexistent/path/context.json"]);
  assert(r.code !== 0);
  assert(r.stderr.indexOf("Error") !== -1);
});

/* ---- Test: invalid JSON input exits 1 ---- */

test("invalid JSON input exits 1", function () {
  var inputPath = writeTmpFile("bad-json.json", "{ this is not json }");
  var r = runScript(["--input", inputPath]);
  assert(r.code !== 0);
  assert(r.stderr.indexOf("Error") !== -1);
});

/* ---- Cleanup ---- */

test("all reports have required top-level fields", function () {
  var input = JSON.stringify({ identity: { packId: "x" } });
  var inputPath = writeTmpFile("fields-test.json", input);
  var r = runScript(["--input", inputPath]);
  var report = parseStdout(r.stdout);
  assert(typeof report.reportVersion === "string");
  assert.strictEqual(report.reportType, "soft-validation");
  assert(typeof report.validatorId === "string");
  assert(typeof report.contractName === "string");
  assert(report.contractVersion === null || typeof report.contractVersion === "string");
  assert(typeof report.status === "string");
  assert(typeof report.severity === "string");
  assert(typeof report.generatedAt === "string");
  assert(Array.isArray(report.results));
  assert(typeof report.summary === "object");
  assert(typeof report.metadata === "object");
});

/* ---- Summary ---- */

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Standalone soft validation report script check passed");
}
