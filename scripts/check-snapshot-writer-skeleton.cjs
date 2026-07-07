#!/usr/bin/env node
/**
 * Standalone validation for the M10.5 snapshot writer skeleton.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-snapshot-writer-skeleton.cjs
 */

"use strict";

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
var SW = require("../packages/cli/src/validation/soft-validation-snapshot-writer.js");
var SW_SCRIPT = path.join(__dirname, "write-pack-runtime-context-snapshots.cjs");

/* ---- Fixture paths ---- */

var FIXTURES = {
  valid: "test/fixtures/pack-runtime-context/valid/minimal-valid.json",
  invalid: "test/fixtures/pack-runtime-context/invalid/context-not-object.json",
  edge: "test/fixtures/pack-runtime-context/edge/missing-contract-version.json",
};

/* ---- Helpers ---- */

function mktmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "awe-m105-"));
}

function writeTmpFile(name, content) {
  var dir = mktmp();
  var fp = path.join(dir, name);
  fs.writeFileSync(fp, content, "utf8");
  return fp;
}

function runScript(args, opts) {
  opts = opts || {};
  try {
    var result = execFileSync(process.execPath, [SW_SCRIPT].concat(args), {
      cwd: ROOT,
      env: Object.assign({}, process.env, { FORCE_COLOR: "0" }),
      timeout: 15000,
      encoding: "utf8",
    });
    return { ok: true, stdout: result, stderr: "", code: 0 };
  } catch (e) {
    var stderr = e.stderr ? e.stderr.toString() : "";
    var stdout = e.stdout ? e.stdout.toString() : "";
    return { ok: false, stdout: stdout, stderr: stderr, code: e.code || 1 };
  }
}

/* ================================================================== */
/*  TESTS: mapFixturePathToSnapshotPath                               */
/* ================================================================== */

test("map valid fixture path", function () {
  var m = SW.mapFixturePathToSnapshotPath(FIXTURES.valid);
  if (m.category !== "valid") throw new Error("expected valid, got " + m.category);
  if (!m.snapshotPath.endsWith(".report.json")) throw new Error("bad suffix: " + m.snapshotPath);
  if (m.snapshotPath.indexOf("/valid/") === -1) throw new Error("missing valid dir: " + m.snapshotPath);
});

test("map invalid fixture path", function () {
  var m = SW.mapFixturePathToSnapshotPath(FIXTURES.invalid);
  if (m.category !== "invalid") throw new Error("expected invalid, got " + m.category);
  if (!m.snapshotPath.includes("/invalid/")) throw new Error("missing invalid dir: " + m.snapshotPath);
});

test("map edge fixture path", function () {
  var m = SW.mapFixturePathToSnapshotPath(FIXTURES.edge);
  if (m.category !== "edge") throw new Error("expected edge, got " + m.category);
  if (!m.snapshotPath.includes("/edge/")) throw new Error("missing edge dir: " + m.snapshotPath);
});

test("rejects fixtureRoot outside path", function () {
  try {
    SW.mapFixturePathToSnapshotPath("/etc/passwd.json");
    throw new Error("should have thrown");
  } catch (e) {
    if (e.message === "should have thrown") throw e;
    // Expected
  }
});

test("rejects non-JSON input", function () {
  try {
    SW.mapFixturePathToSnapshotPath("test/fixtures/foo.txt");
    throw new Error("should have thrown for non-.json");
  } catch (e) {
    if (e.message === "should have thrown for non-.json") throw e;
    // Expected
  }
});

/* ================================================================== */
/*  TESTS: createNormalizedSnapshotReport                             */
/* ================================================================== */

test("minimal-valid: status is pass", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  if (r.report.status !== "pass") throw new Error("expected pass, got " + r.report.status);
});

test("minimal-valid: total is 0", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  if (r.report.summary.total !== 0) throw new Error("expected total 0, got " + r.report.summary.total);
});

test("minimal-valid: generatedAt is fixed", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  if (r.report.generatedAt !== "1970-01-01T00:00:00.000Z") throw new Error("bad generatedAt: " + r.report.generatedAt);
});

test("minimal-valid: source is repo-relative", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  if (r.report.source.indexOf("/Users/") !== -1) throw new Error("absolute path leaked: " + r.report.source);
  if (r.report.source.indexOf(FIXTURES.valid) === -1) throw new Error("source mismatch: " + r.report.source);
});

test("context-not-object: status is soft-fail", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.invalid);
  if (r.report.status !== "soft-fail") throw new Error("expected soft-fail, got " + r.report.status);
});

test("context-not-object: has ERROR_CONTEXT_NOT_OBJECT", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.invalid);
  var found = false;
  for (var i = 0; i < r.report.results.length; i++) {
    if (r.report.results[i].code === "ERROR_CONTEXT_NOT_OBJECT") { found = true; break; }
  }
  if (!found) throw new Error("ERROR_CONTEXT_NOT_OBJECT not found");
});

test("context-not-object: blocking is false", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.invalid);
  for (var i = 0; i < r.report.results.length; i++) {
    if (r.report.results[i].blocking !== false) throw new Error("blocking should be false");
  }
});

test("missing-contract-version: status is pass-with-info", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.edge);
  if (r.report.status !== "pass-with-info") throw new Error("expected pass-with-info, got " + r.report.status);
});

test("missing-contract-version: has INFO_CONTRACT_VERSION_ABSENT", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.edge);
  var found = false;
  for (var i = 0; i < r.report.results.length; i++) {
    if (r.report.results[i].code === "INFO_CONTRACT_VERSION_ABSENT") { found = true; break; }
  }
  if (!found) throw new Error("INFO_CONTRACT_VERSION_ABSENT not found");
});

test("metadata contains no absolute paths", function () {
  var r = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  var metaStr = JSON.stringify(r.report.metadata);
  if (metaStr.indexOf("/Users/") !== -1) throw new Error("absolute path leaked in metadata: " + metaStr);
  if (metaStr.indexOf("/private/") !== -1) throw new Error("absolute path leaked in metadata: " + metaStr);
});

/* ================================================================== */
/*  TESTS: Determinism                                                */
/* ================================================================== */

test("valid fixture: byte-identical on repeated generation", function () {
  var r1 = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  var r2 = SW.createNormalizedSnapshotReport(FIXTURES.valid);
  var s1 = SW.serializeSnapshotReport(r1.report);
  var s2 = SW.serializeSnapshotReport(r2.report);
  if (!Buffer.from(s1).equals(Buffer.from(s2))) throw new Error("outputs differ");
});

test("invalid fixture: byte-identical on repeated generation", function () {
  var r1 = SW.createNormalizedSnapshotReport(FIXTURES.invalid);
  var r2 = SW.createNormalizedSnapshotReport(FIXTURES.invalid);
  var s1 = SW.serializeSnapshotReport(r1.report);
  var s2 = SW.serializeSnapshotReport(r2.report);
  if (!Buffer.from(s1).equals(Buffer.from(s2))) throw new Error("outputs differ");
});

test("edge fixture: byte-identical on repeated generation", function () {
  var r1 = SW.createNormalizedSnapshotReport(FIXTURES.edge);
  var r2 = SW.createNormalizedSnapshotReport(FIXTURES.edge);
  var s1 = SW.serializeSnapshotReport(r1.report);
  var s2 = SW.serializeSnapshotReport(r2.report);
  if (!Buffer.from(s1).equals(Buffer.from(s2))) throw new Error("outputs differ");
});

/* ================================================================== */
/*  TESTS: Dry-run script                                             */
/* ================================================================== */

test("dry-run script: --help exits 0", function () {
  var r = runScript(["--help"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
});

test("dry-run script: missing --fixture exits 1", function () {
  var r = runScript([]);
  if (r.code === 0) throw new Error("expected exit 1, got 0");
});

test("dry-run script: --update exits 1", function () {
  var r = runScript(["--update"]);
  if (r.code === 0) throw new Error("--update should exit 1");
  if (r.stderr.indexOf("not supported") === -1) throw new Error("should mention not supported");
});

test("dry-run script: valid fixture exits 0", function () {
  var r = runScript(["--fixture", FIXTURES.valid]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
  if (r.stdout.indexOf("Status: pass") === -1) throw new Error("expected 'Status: pass'");
});

test("dry-run script: invalid fixture soft-fail exits 0", function () {
  var r = runScript(["--fixture", FIXTURES.invalid]);
  if (r.code !== 0) throw new Error("soft-fail should exit 0, got " + r.code);
  if (r.stdout.indexOf("Status: soft-fail") === -1) throw new Error("expected 'Status: soft-fail'");
});

test("dry-run script: --json stdout is parseable JSON", function () {
  var r = runScript(["--fixture", FIXTURES.valid, "--json"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
  var parsed = JSON.parse(r.stdout.trim());
  if (parsed.reportType !== "soft-validation") throw new Error("wrong reportType");
});

test("dry-run script: --json compact mode", function () {
  var r = runScript(["--fixture", FIXTURES.valid, "--json", "--compact"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
  var parsed = JSON.parse(r.stdout.trim());
  if (parsed.reportType !== "soft-validation") throw new Error("wrong reportType");
});

/* ================================================================== */
/*  TESTS: No files created                                           */
/* ================================================================== */

test("no snapshot JSON files created before", function () {
  var snapDir = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
  var files = findJsonFiles(snapDir);
  if (files.length > 0) throw new Error("unexpected snapshot files: " + files.join(", "));
});

test("no snapshot JSON files created after dry-run", function () {
  // Run dry-run then check
  runScript(["--fixture", FIXTURES.valid]);
  var snapDir = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
  var files = findJsonFiles(snapDir);
  if (files.length > 0) throw new Error("snapshot files created: " + files.join(", "));
});

test("no .validation/ directory created", function () {
  var valDir = path.join(ROOT, ".validation");
  if (fs.existsSync(valDir)) throw new Error(".validation/ exists");
});

/* ================================================================== */
/*  TESTS: Exported API completeness                                   */
/* ================================================================== */

test("exports createNormalizedSnapshotReport", function () {
  if (typeof SW.createNormalizedSnapshotReport !== "function") throw new Error("missing");
});

test("exports mapFixturePathToSnapshotPath", function () {
  if (typeof SW.mapFixturePathToSnapshotPath !== "function") throw new Error("missing");
});

test("exports serializeSnapshotReport", function () {
  if (typeof SW.serializeSnapshotReport !== "function") throw new Error("missing");
});

test("exports normalizeSnapshotResult", function () {
  if (typeof SW.normalizeSnapshotResult !== "function") throw new Error("missing");
});

test("exports normalizeSnapshotMetadata", function () {
  if (typeof SW.normalizeSnapshotMetadata !== "function") throw new Error("missing");
});

test("exports sortSnapshotResults", function () {
  if (typeof SW.sortSnapshotResults !== "function") throw new Error("missing");
});

test("exports FIXED_GENERATED_AT", function () {
  if (SW.FIXED_GENERATED_AT !== "1970-01-01T00:00:00.000Z") throw new Error("wrong value");
});

test("exports SNAPSHOT_SUFFIX", function () {
  if (SW.SNAPSHOT_SUFFIX !== ".report.json") throw new Error("wrong value");
});

/* ================================================================== */
/*  Summary                                                           */
/* ================================================================== */

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Snapshot writer skeleton check passed");
}

function findJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  var files = [];
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].isFile() && entries[i].name.endsWith(".json")) {
      files.push(entries[i].name);
    } else if (entries[i].isDirectory()) {
      var sub = findJsonFiles(path.join(dir, entries[i].name));
      for (var j = 0; j < sub.length; j++) {
        files.push(entries[i].name + "/" + sub[j]);
      }
    }
  }
  return files;
}
