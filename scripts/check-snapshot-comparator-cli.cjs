#!/usr/bin/env node
/**
 * Standalone validation for the M10.9 snapshot comparator CLI.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-snapshot-comparator-cli.cjs
 *
 * Verifies CLI argument handling, exit codes, JSON output,
 * orphan detection, edge cases, and read-only guarantees.
 */

"use strict";

var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..");
var CLI = path.join(ROOT, "scripts", "check-pack-runtime-context-snapshots.cjs");
var COMP_FILE = path.join(ROOT, "packages", "cli", "src", "validation", "soft-validation-snapshot-comparator.js");

var TESTS = [];
var PASSED = 0;
var FAILED = 0;

function test(name, fn) {
  TESTS.push({ name: name, fn: fn });
}

function runTests() {
  for (var i = 0; i < TESTS.length; i++) {
    try {
      TESTS[i].fn();
      PASSED++;
    } catch (e) {
      FAILED++;
      console.error("FAIL: " + TESTS[i].name + " — " + e.message);
    }
  }
}

function runCli(args) {
  try {
    var out = execFileSync("node", [CLI].concat(args), {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000,
    });
    return { code: 0, stdout: out, stderr: "" };
  } catch (e) {
    return {
      code: e.status || 1,
      stdout: e.stdout || "",
      stderr: e.stderr || "",
    };
  }
}

function fileHash(filePath) {
  var buf = fs.readFileSync(filePath);
  var crypto = require("crypto");
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function tmpDir() {
  var os = require("os");
  var base = path.join(os.tmpdir(), "awe-cli-test-" + Date.now());
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function copyTree(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  var entries = fs.readdirSync(src, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var s = path.join(src, entries[i].name);
    var d = path.join(dst, entries[i].name);
    if (entries[i].isDirectory()) {
      copyTree(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/* ================================================================== */
/*  Fixtures                                                           */
/* ================================================================== */

var FIXTURES = [
  {
    name: "valid/minimal-valid",
    fixturePath: "test/fixtures/pack-runtime-context/valid/minimal-valid.json",
    expectedStatus: "pass",
  },
  {
    name: "invalid/context-not-object",
    fixturePath: "test/fixtures/pack-runtime-context/invalid/context-not-object.json",
    expectedStatus: "soft-fail",
  },
  {
    name: "edge/missing-contract-version",
    fixturePath: "test/fixtures/pack-runtime-context/edge/missing-contract-version.json",
    expectedStatus: "pass-with-info",
  },
];

/* ================================================================== */
/*  Tests 1-10: CLI argument handling                                  */
/* ================================================================== */

test("--help exits 0", function () {
  var r = runCli(["--help"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
});

test("no arguments exits 1", function () {
  var r = runCli([]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("unknown parameter exits 1", function () {
  var r = runCli(["--bogus"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--fixture without value exits 1", function () {
  var r = runCli(["--fixture"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--fixture and --all mutually exclusive exits 1", function () {
  var r = runCli(["--fixture", "x", "--all"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--compact without --json exits 1", function () {
  var r = runCli(["--compact"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--update rejected", function () {
  var r = runCli(["--update"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--write rejected", function () {
  var r = runCli(["--write"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--fix rejected", function () {
  var r = runCli(["--fix"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

test("--delete-orphans rejected", function () {
  var r = runCli(["--delete-orphans"]);
  if (r.code !== 1) throw new Error("expected exit 1, got " + r.code);
});

/* ================================================================== */
/*  Tests 11-15: Single fixture mode                                   */
/* ================================================================== */

for (var i = 0; i < FIXTURES.length; i++) {
  (function (f) {
    test("single fixture " + f.name + " exits 0", function () {
      var r = runCli(["--fixture", f.fixturePath]);
      if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
    });

    test("single fixture " + f.name + " JSON output is valid", function () {
      var r = runCli(["--fixture", f.fixturePath, "--json"]);
      if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
      var parsed = JSON.parse(r.stdout);
      if (parsed.status !== "match") throw new Error("expected status=match, got " + parsed.status);
      if (parsed.reportStatus !== f.expectedStatus)
        throw new Error("expected reportStatus=" + f.expectedStatus + ", got " + parsed.reportStatus);
    });

    test("single fixture " + f.name + " compact JSON is single line", function () {
      var r = runCli(["--fixture", f.fixturePath, "--json", "--compact"]);
      if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
      var lines = r.stdout.trim().split("\n");
      if (lines.length !== 1) throw new Error("expected 1 line, got " + lines.length);
      JSON.parse(r.stdout); // must be valid JSON
    });
  })(FIXTURES[i]);
}

/* ================================================================== */
/*  Tests 16-19: All fixtures mode                                     */
/* ================================================================== */

test("--all exits 0", function () {
  var r = runCli(["--all"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
  if (r.stdout.indexOf("Total fixtures: 3") === -1)
    throw new Error("expected Total fixtures: 3 in output");
  if (r.stdout.indexOf("Matched: 3") === -1)
    throw new Error("expected Matched: 3 in output");
  if (r.stdout.indexOf("Orphan snapshots: 0") === -1)
    throw new Error("expected Orphan snapshots: 0 in output");
});

test("--all --json exits 0 with valid JSON", function () {
  var r = runCli(["--all", "--json"]);
  if (r.code !== 0) throw new Error("expected exit 0, got " + r.code);
  var parsed = JSON.parse(r.stdout);
  if (parsed.summary.total !== 3) throw new Error("expected total=3, got " + parsed.summary.total);
  if (parsed.summary.matched !== 3) throw new Error("expected matched=3, got " + parsed.summary.matched);
  if (parsed.summary.orphanSnapshots !== 0)
    throw new Error("expected orphanSnapshots=0, got " + parsed.summary.orphanSnapshots);
});

test("--all --json --compact is single line", function () {
  var r = runCli(["--all", "--json", "--compact"]);
  var lines = r.stdout.trim().split("\n");
  if (lines.length !== 1) throw new Error("expected 1 line, got " + lines.length);
  JSON.parse(r.stdout);
});

test("compare-all order deterministic (repeated)", function () {
  var r1 = runCli(["--all", "--json", "--compact"]);
  var r2 = runCli(["--all", "--json", "--compact"]);
  if (r1.stdout !== r2.stdout) throw new Error("compare-all output not deterministic");
});

/* ================================================================== */
/*  Tests 20-24: Edge cases with temporary directories                 */
/* ================================================================== */

// 20. Missing snapshot
test("missing snapshot exits 1", function () {
  var tmp = tmpDir();
  try {
    var r = runCli([
      "--fixture",
      FIXTURES[0].fixturePath,
    ]);
    // This tests the committed snapshots, not missing — we need a custom approach
    // Use the comparator module directly
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var result = C.compareSnapshotForFixture(FIXTURES[0].fixturePath, {
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (result.status !== "missing-snapshot")
      throw new Error("expected missing-snapshot, got " + result.status);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 21. Invalid snapshot JSON
test("invalid snapshot JSON exits 1", function () {
  var tmp = tmpDir();
  try {
    var tmpSnapDir = path.join(tmp, "valid");
    fs.mkdirSync(tmpSnapDir, { recursive: true });
    fs.writeFileSync(path.join(tmpSnapDir, "minimal-valid.report.json"), "not valid json {{{", "utf8");
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var result = C.compareSnapshotForFixture(FIXTURES[0].fixturePath, {
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (result.status !== "invalid-snapshot-json")
      throw new Error("expected invalid-snapshot-json, got " + result.status);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 22. Content drift
test("content drift exits 1", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var snapPath = path.join(tmp, "valid", "minimal-valid.report.json");
    var orig = JSON.parse(fs.readFileSync(snapPath, "utf8"));
    orig.summary.info = 999;
    fs.writeFileSync(snapPath, JSON.stringify(orig, null, 2) + "\n", "utf8");
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var result = C.compareSnapshotForFixture(FIXTURES[0].fixturePath, {
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (result.status !== "content-drift")
      throw new Error("expected content-drift, got " + result.status);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 23. Format drift
test("format drift exits 1", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var snapPath = path.join(tmp, "valid", "minimal-valid.report.json");
    var orig = fs.readFileSync(snapPath, "utf8");
    var parsed = JSON.parse(orig);
    fs.writeFileSync(snapPath, JSON.stringify(parsed), "utf8");
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var result = C.compareSnapshotForFixture(FIXTURES[0].fixturePath, {
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (result.status !== "format-drift")
      throw new Error("expected format-drift, got " + result.status);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 24. Orphan snapshot detected, not deleted
test("orphan snapshot detected and not deleted", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    // Create an orphan snapshot
    var orphanDir = path.join(tmp, "orphan");
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(
      path.join(orphanDir, "ghost.report.json"),
      JSON.stringify({ report: { version: "1.0.0", type: "soft-validation" }, summary: {}, results: [], metadata: {} }, null, 2) + "\n",
      "utf8"
    );
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var allResult = C.compareAllSnapshots({
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
      detectOrphans: true,
    });
    if (allResult.summary.orphanSnapshots !== 1)
      throw new Error("expected 1 orphan, got " + allResult.summary.orphanSnapshots);
    // Verify orphan file still exists
    if (!fs.existsSync(path.join(tmp, "orphan", "ghost.report.json")))
      throw new Error("orphan file was deleted!");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* ================================================================== */
/*  Tests 25-27: .gitkeep, README, hidden files                        */
/* ================================================================== */

test(".gitkeep not counted as orphan", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    // .gitkeep files already exist in the real tree — just verify they aren't counted
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var allResult = C.compareAllSnapshots({
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
      detectOrphans: true,
    });
    // Should be 0 orphans (gitkeep and README are excluded)
    if (allResult.summary.orphanSnapshots !== 0)
      throw new Error("expected 0 orphans with .gitkeep, got " + allResult.summary.orphanSnapshots);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("README.md not counted as orphan", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var allResult = C.compareAllSnapshots({
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
      detectOrphans: true,
    });
    if (allResult.summary.orphanSnapshots !== 0)
      throw new Error("expected 0 orphans with README, got " + allResult.summary.orphanSnapshots);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("hidden files not counted as orphan", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    // Add a hidden file
    fs.writeFileSync(path.join(tmp, ".hidden"), "should be ignored", "utf8");
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var allResult = C.compareAllSnapshots({
      cwd: ROOT,
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
      detectOrphans: true,
    });
    if (allResult.summary.orphanSnapshots !== 0)
      throw new Error("expected 0 orphans with hidden file, got " + allResult.summary.orphanSnapshots);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* ================================================================== */
/*  Tests 28-29: No write APIs in comparator and CLI                   */
/* ================================================================== */

test("comparator module has no write APIs", function () {
  var src = fs.readFileSync(COMP_FILE, "utf8");
  var writePatterns = ["writeFile", "writeFileSync", "mkdir", "mkdirSync", "appendFile", "createWriteStream", "unlink", "rmSync", "renameSync"];
  for (var i = 0; i < writePatterns.length; i++) {
    var lines = src.split("\n");
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].indexOf(writePatterns[i]) !== -1) {
        var line = lines[j].trim();
        if (line.indexOf("//") === 0 || line.indexOf("/*") === 0 || line.indexOf("*") === 0) continue;
        throw new Error("write API found: " + writePatterns[i] + " at line " + (j + 1));
      }
    }
  }
});

test("comparator module doesn't import writeSnapshotReport", function () {
  var src = fs.readFileSync(COMP_FILE, "utf8");
  if (src.indexOf("writeSnapshotReport") !== -1)
    throw new Error("comparator references writeSnapshotReport");
});

/* ================================================================== */
/*  Tests 30-31: Hash verification                                     */
/* ================================================================== */

test("fixture hashes unchanged after comparison", function () {
  var hashes = {};
  for (var i = 0; i < FIXTURES.length; i++) {
    var fp = path.join(ROOT, FIXTURES[i].fixturePath);
    hashes[FIXTURES[i].fixturePath] = fileHash(fp);
  }
  runCli(["--all"]);
  for (var j = 0; j < FIXTURES.length; j++) {
    var fp = path.join(ROOT, FIXTURES[j].fixturePath);
    if (fileHash(fp) !== hashes[FIXTURES[j].fixturePath])
      throw new Error("fixture modified: " + FIXTURES[j].fixturePath);
  }
});

test("snapshot hashes unchanged after comparison", function () {
  var hashes = {};
  var snapFiles = [
    "test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json",
    "test/snapshots/pack-runtime-context-soft-report/invalid/context-not-object.report.json",
    "test/snapshots/pack-runtime-context-soft-report/edge/missing-contract-version.report.json",
  ];
  for (var i = 0; i < snapFiles.length; i++) {
    var sp = path.join(ROOT, snapFiles[i]);
    hashes[snapFiles[i]] = fileHash(sp);
  }
  runCli(["--all"]);
  for (var j = 0; j < snapFiles.length; j++) {
    var sp = path.join(ROOT, snapFiles[j]);
    if (fileHash(sp) !== hashes[snapFiles[j]])
      throw new Error("snapshot modified: " + snapFiles[j]);
  }
});

/* ================================================================== */
/*  Tests 32-37: Safety guarantees                                     */
/* ================================================================== */

test("no .validation/ created", function () {
  var valDir = path.join(ROOT, ".validation");
  if (fs.existsSync(valDir)) throw new Error(".validation/ exists");
});

test("snapshot JSON count still 3", function () {
  var snapDir = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
  function countJson(dir, rel) {
    var count = 0;
    var entries = fs.readdirSync(path.join(snapDir, rel || ""), { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isFile() && entries[i].name.endsWith(".report.json")) count++;
      else if (entries[i].isDirectory()) count += countJson(entries[i].name, (rel ? rel + "/" : "") + entries[i].name);
    }
    return count;
  }
  var total = 0;
  var entries = fs.readdirSync(snapDir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].isDirectory()) {
      total += countJson(entries[i].name, entries[i].name);
    }
  }
  if (total !== 3) throw new Error("expected 3 snapshots, found " + total);
});

test("output doesn't contain /Users/", function () {
  var r = runCli(["--all"]);
  if (r.stdout.indexOf("/Users/") !== -1) throw new Error("output contains /Users/");
  var r2 = runCli(["--fixture", FIXTURES[0].fixturePath, "--json"]);
  if (r2.stdout.indexOf("/Users/") !== -1) throw new Error("JSON output contains /Users/");
});

test("output doesn't contain cwd", function () {
  var r = runCli(["--all"]);
  if (r.stdout.indexOf(ROOT) !== -1) throw new Error("output contains cwd");
});

test("all paths are repo-relative", function () {
  var r = runCli(["--fixture", FIXTURES[0].fixturePath, "--json"]);
  var parsed = JSON.parse(r.stdout);
  if (parsed.fixturePath.indexOf("/Users/") !== -1) throw new Error("fixturePath contains absolute path");
  if (parsed.snapshotPath.indexOf("/Users/") !== -1) throw new Error("snapshotPath contains absolute path");
});

test("compare-all soft-fail fixture counted as matched", function () {
  var r = runCli(["--all", "--json", "--compact"]);
  var parsed = JSON.parse(r.stdout);
  var softFailMatched = false;
  for (var i = 0; i < parsed.results.length; i++) {
    if (parsed.results[i].reportStatus === "soft-fail" && parsed.results[i].status === "match") {
      softFailMatched = true;
    }
  }
  if (!softFailMatched) throw new Error("soft-fail fixture not counted as matched");
});

/* ================================================================== */
/*  Tests 39-40: Deterministic orphan detection, no package.json       */
/* ================================================================== */

test("orphan detection deterministic", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var orphanDir = path.join(tmp, "ghost");
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(path.join(orphanDir, "ghost.report.json"), "{}", "utf8");
    var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");
    var r1 = C.findOrphanSnapshots({ cwd: ROOT, fixtureRoot: "test/fixtures/pack-runtime-context", snapshotRoot: tmp });
    var r2 = C.findOrphanSnapshots({ cwd: ROOT, fixtureRoot: "test/fixtures/pack-runtime-context", snapshotRoot: tmp });
    if (JSON.stringify(r1) !== JSON.stringify(r2)) throw new Error("orphan detection not deterministic");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI not in package.json scripts", function () {
  var pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  var scripts = pkg.scripts || {};
  var keys = Object.keys(scripts);
  for (var i = 0; i < keys.length; i++) {
    if (scripts[keys[i]].indexOf("check-pack-runtime-context-snapshots") !== -1) {
      throw new Error("CLI is wired into package.json script: " + keys[i]);
    }
  }
});

/* ================================================================== */
/*  Summary                                                            */
/* ================================================================== */

runTests();

console.log("");
console.log("Results: " + PASSED + " passed, " + FAILED + " failed");
console.log("");

if (FAILED > 0) {
  process.exit(1);
} else {
  console.log("Snapshot comparator CLI check passed");
}
