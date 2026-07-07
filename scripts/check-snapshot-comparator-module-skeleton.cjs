#!/usr/bin/env node
/**
 * Standalone validation for the M10.8 snapshot comparator module skeleton.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-snapshot-comparator-module-skeleton.cjs
 *
 * Verifies:
 * - Three committed snapshots all return match
 * - soft-fail snapshot still returns comparator match
 * - missing-snapshot, invalid-json, content-drift, format-drift
 * - semantic comparison rules (key order, array order, types)
 * - deterministic repeated comparisons
 * - no file modifications during comparison
 * - comparator source contains no write APIs
 */

"use strict";

var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..");
var COMP = require(path.join(ROOT, "packages", "cli", "src", "validation", "soft-validation-snapshot-comparator.js"));
var SW = require(path.join(ROOT, "packages", "cli", "src", "validation", "soft-validation-snapshot-writer.js"));

var SCRIPT = path.join(ROOT, "scripts", "write-pack-runtime-context-snapshots.cjs");
var COMP_FILE = path.join(ROOT, "packages", "cli", "src", "validation", "soft-validation-snapshot-comparator.js");

var TESTS = [];
var PASSED = 0;
var FAILED = 0;

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

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

function runScript(args) {
  try {
    var out = execFileSync(args[0], args.slice(1), {
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
  var base = path.join(os.tmpdir(), "awe-comparator-test-" + Date.now());
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

var FIXTURES = {
  valid: {
    fixturePath: "test/fixtures/pack-runtime-context/valid/minimal-valid.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json",
    expectedStatus: "pass",
  },
  invalid: {
    fixturePath: "test/fixtures/pack-runtime-context/invalid/context-not-object.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/invalid/context-not-object.report.json",
    expectedStatus: "soft-fail",
  },
  edge: {
    fixturePath: "test/fixtures/pack-runtime-context/edge/missing-contract-version.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/edge/missing-contract-version.report.json",
    expectedStatus: "pass-with-info",
  },
};

/* ================================================================== */
/*  Tests 1-5: Three committed snapshots return match                  */
/* ================================================================== */

for (var key in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test(k + " comparator status match", function () {
      var r = COMP.compareSnapshotForFixture(f.fixturePath);
      if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.MATCH)
        throw new Error("expected match, got " + r.status);
      if (r.semanticEqual !== true)
        throw new Error("expected semanticEqual=true, got " + r.semanticEqual);
      if (r.byteEqual !== true)
        throw new Error("expected byteEqual=true, got " + r.byteEqual);
    });

    test(k + " reportStatus correct", function () {
      var r = COMP.compareSnapshotForFixture(f.fixturePath);
      if (r.reportStatus !== f.expectedStatus)
        throw new Error("expected reportStatus=" + f.expectedStatus + ", got " + r.reportStatus);
    });
  })(key);
}

// 4. context-not-object: soft-fail → comparator match
test("soft-fail snapshot still returns comparator match", function () {
  var r = COMP.compareSnapshotForFixture(FIXTURES.invalid.fixturePath);
  if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.MATCH)
    throw new Error("soft-fail should still be match, got " + r.status);
  if (r.reportStatus !== "soft-fail")
    throw new Error("expected reportStatus=soft-fail, got " + r.reportStatus);
});

/* ================================================================== */
/*  Tests 6-9: Edge case scenarios                                     */
/* ================================================================== */

// 6. Missing snapshot
test("missing snapshot returns missing-snapshot", function () {
  var tmp = tmpDir();
  try {
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.MISSING_SNAPSHOT)
      throw new Error("expected missing-snapshot, got " + r.status);
    if (!r.snapshotPath) throw new Error("snapshotPath should be set for missing snapshot");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Invalid snapshot JSON
test("invalid snapshot JSON returns invalid-snapshot-json", function () {
  var tmp = tmpDir();
  try {
    var tmpSnapDir = path.join(tmp, "valid");
    fs.mkdirSync(tmpSnapDir, { recursive: true });
    var badSnap = path.join(tmpSnapDir, "minimal-valid.report.json");
    fs.writeFileSync(badSnap, "not valid json {{{", "utf8");
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.INVALID_SNAPSHOT_JSON)
      throw new Error("expected invalid-snapshot-json, got " + r.status);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 8. Content drift
test("content drift detected", function () {
  var tmp = tmpDir();
  try {
    // Copy the snapshot tree to tmp
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var snapPath = path.join(tmp, "valid", "minimal-valid.report.json");
    var orig = JSON.parse(fs.readFileSync(snapPath, "utf8"));
    orig.summary.info = 999; // semantic change
    fs.writeFileSync(snapPath, JSON.stringify(orig, null, 2) + "\n", "utf8");
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.CONTENT_DRIFT)
      throw new Error("expected content-drift, got " + r.status);
    if (r.semanticEqual !== false) throw new Error("expected semanticEqual=false");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 9. Format drift
test("format drift detected (semantic equal, byte different)", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var snapPath = path.join(tmp, "valid", "minimal-valid.report.json");
    var orig = fs.readFileSync(snapPath, "utf8");
    var parsed = JSON.parse(orig);
    fs.writeFileSync(snapPath, JSON.stringify(parsed), "utf8");
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    if (r.status !== COMP.SNAPSHOT_COMPARE_STATUS.FORMAT_DRIFT)
      throw new Error("expected format-drift, got " + r.status);
    if (r.semanticEqual !== true) throw new Error("expected semanticEqual=true for format drift");
    if (r.byteEqual !== false) throw new Error("expected byteEqual=false for format drift");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* ================================================================== */
/*  Tests 10-14: Semantic comparison rules                             */
/* ================================================================== */

// 10. Object key order doesn't affect semantic comparison
test("object key order doesn't affect semantic comparison", function () {
  var a = { foo: 1, bar: 2 };
  var b = { bar: 2, foo: 1 };
  var r = COMP.compareSnapshotObjects(a, b);
  if (!r.semanticEqual) throw new Error("key order should not matter");
  if (r.differences.length > 0) throw new Error("no differences expected");
});

// 10b. Array order DOES affect semantic comparison
test("array order affects semantic comparison", function () {
  var a = [1, 2, 3];
  var b = [3, 2, 1];
  var r = COMP.compareSnapshotObjects(a, b);
  if (r.semanticEqual) throw new Error("array order should matter");
  if (r.differences.length === 0) throw new Error("differences expected for array reorder");
});

// 10c. Number/string type change is drift
test("type change is drift", function () {
  var a = { count: 42 };
  var b = { count: "42" };
  var r = COMP.compareSnapshotObjects(a, b);
  if (r.semanticEqual) throw new Error("type change should be drift");
});

// 10d. null vs missing field is not equal
test("null vs missing field is not equal", function () {
  var a = { field: null };
  var b = {};
  var r = COMP.compareSnapshotObjects(a, b);
  if (r.semanticEqual) throw new Error("null vs missing should not be equal");
});

// 10e. Additive metadata field is drift
test("additive metadata field is drift", function () {
  var a = { metadata: { foo: 1 } };
  var b = { metadata: { foo: 1, bar: 2 } };
  var r = COMP.compareSnapshotObjects(a, b);
  if (r.semanticEqual) throw new Error("additive field should be drift");
});

/* ================================================================== */
/*  Tests 11-13: Difference paths and output                           */
/* ================================================================== */

// 11. Difference paths are deterministic and logical
test("difference paths are deterministic", function () {
  var a = { summary: { info: 0 }, results: [{ code: "A" }] };
  var b = { summary: { info: 1 }, results: [{ code: "B" }] };
  var r = COMP.compareSnapshotObjects(a, b);
  var paths = r.differences.map(function (d) { return d.path; });
  if (paths.indexOf("summary.info") === -1) throw new Error("expected summary.info path");
  if (paths.indexOf("results[0].code") === -1) throw new Error("expected results[0].code path");
});

// 12. All fixture/snapshot paths are repo-relative
test("all paths are repo-relative", function () {
  for (var key in FIXTURES) {
    (function (k) {
      var f = FIXTURES[k];
      var r = COMP.compareSnapshotForFixture(f.fixturePath);
      if (r.fixturePath.indexOf("/Users/") !== -1)
        throw new Error("fixturePath contains absolute path");
      if (r.snapshotPath && r.snapshotPath.indexOf("/Users/") !== -1)
        throw new Error("snapshotPath contains absolute path");
    })(key);
  }
});

// 13. formatSnapshotDifference output doesn't contain /Users/ or cwd
test("formatSnapshotDifference output is clean", function () {
  for (var key in FIXTURES) {
    (function (k) {
      var f = FIXTURES[k];
      var r = COMP.compareSnapshotForFixture(f.fixturePath);
      var formatted = COMP.formatSnapshotDifference(r);
      if (formatted.indexOf("/Users/") !== -1)
        throw new Error("formatSnapshotDifference contains /Users/");
      if (formatted.indexOf(process.cwd()) !== -1)
        throw new Error("formatSnapshotDifference contains cwd");
    })(key);
  }
});

/* ================================================================== */
/*  Tests 14-16: No write APIs in comparator source                    */
/* ================================================================== */

// 14. Comparator source contains no write APIs
test("comparator source has no write APIs", function () {
  var src = fs.readFileSync(COMP_FILE, "utf8");
  var writePatterns = [
    "writeFile", "writeFileSync", "mkdir", "mkdirSync",
    "appendFile", "createWriteStream", "unlink", "rmSync",
    "renameSync",
  ];
  for (var i = 0; i < writePatterns.length; i++) {
    var re = new RegExp(writePatterns[i], "g");
    var matches = src.match(re);
    if (matches) {
      var lines = src.split("\n");
      for (var j = 0; j < lines.length; j++) {
        if (lines[j].indexOf(writePatterns[i]) !== -1) {
          var line = lines[j].trim();
          if (line.indexOf("//") === 0 || line.indexOf("/*") === 0 || line.indexOf("*") === 0) continue;
          throw new Error("write API found: " + writePatterns[i] + " at line " + (j + 1));
        }
      }
    }
  }
});

// 15. Comparator source doesn't import writeSnapshotReport
test("comparator source doesn't import writeSnapshotReport", function () {
  var src = fs.readFileSync(COMP_FILE, "utf8");
  if (src.indexOf("writeSnapshotReport") !== -1)
    throw new Error("comparator imports or references writeSnapshotReport");
});

// 16. Comparison doesn't modify fixture or snapshot files
test("comparison preserves fixture and snapshot hashes", function () {
  var fixtureHashes = {};
  var snapshotHashes = {};
  for (var key in FIXTURES) {
    (function (k) {
      var f = FIXTURES[k];
      var fp = path.join(ROOT, f.fixturePath);
      var sp = path.join(ROOT, f.snapshotPath);
      fixtureHashes[f.fixturePath] = fileHash(fp);
      snapshotHashes[f.snapshotPath] = fileHash(sp);
    })(key);
  }
  for (var key2 in FIXTURES) {
    (function (k) {
      var f = FIXTURES[k];
      COMP.compareSnapshotForFixture(f.fixturePath);
    })(key2);
  }
  for (var key3 in FIXTURES) {
    (function (k) {
      var f = FIXTURES[k];
      var fp = path.join(ROOT, f.fixturePath);
      var sp = path.join(ROOT, f.snapshotPath);
      if (fileHash(fp) !== fixtureHashes[f.fixturePath])
        throw new Error("fixture file was modified: " + f.fixturePath);
      if (fileHash(sp) !== snapshotHashes[f.snapshotPath])
        throw new Error("snapshot file was modified: " + f.snapshotPath);
    })(key3);
  }
});

/* ================================================================== */
/*  Tests 17-20: No .validation/ and snapshot count                    */
/* ================================================================== */

// 17. No .validation/ created
test("no .validation/ directory created", function () {
  var valDir = path.join(ROOT, ".validation");
  if (fs.existsSync(valDir)) throw new Error(".validation/ exists");
});

// 18. Exactly 3 snapshot JSON files
test("exactly 3 snapshot JSON files", function () {
  function findReportFiles(dir) {
    var results = [];
    if (!fs.existsSync(dir)) return results;
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isFile() && entries[i].name.endsWith(".report.json")) {
        results.push(entries[i].name);
      } else if (entries[i].isDirectory()) {
        var sub = findReportFiles(path.join(dir, entries[i].name));
        for (var j = 0; j < sub.length; j++) {
          results.push(entries[i].name + "/" + sub[j]);
        }
      }
    }
    return results;
  }
  var snapDir = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
  var files = findReportFiles(snapDir);
  if (files.length !== 3) throw new Error("expected 3 snapshots, found " + files.length + ": " + files.join(", "));
});

// 19. Deterministic repeated comparison
test("repeated compare returns identical result", function () {
  var r1 = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath);
  var r2 = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath);
  var s1 = JSON.stringify(r1);
  var s2 = JSON.stringify(r2);
  if (s1 !== s2) throw new Error("repeated compare not deterministic");
});

// 20. formatSnapshotDifference output for match, drift, missing
test("formatSnapshotDifference output correct for match", function () {
  var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath);
  var formatted = COMP.formatSnapshotDifference(r);
  if (formatted.indexOf("Snapshot match") === -1)
    throw new Error("expected 'Snapshot match' in output");
  if (formatted.indexOf("Semantic equal: yes") === -1)
    throw new Error("expected 'Semantic equal: yes'");
});

test("formatSnapshotDifference output correct for missing", function () {
  var tmp = tmpDir();
  try {
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    var formatted = COMP.formatSnapshotDifference(r);
    if (formatted.indexOf("Missing snapshot") === -1)
      throw new Error("expected 'Missing snapshot' in output");
    if (formatted.indexOf("--update") === -1)
      throw new Error("expected '--update' hint in output");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("formatSnapshotDifference output correct for drift", function () {
  var tmp = tmpDir();
  try {
    var srcSnap = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
    copyTree(srcSnap, tmp);
    var snapPath = path.join(tmp, "valid", "minimal-valid.report.json");
    var orig = JSON.parse(fs.readFileSync(snapPath, "utf8"));
    orig.summary.info = 999;
    fs.writeFileSync(snapPath, JSON.stringify(orig, null, 2) + "\n", "utf8");
    var r = COMP.compareSnapshotForFixture(FIXTURES.valid.fixturePath, {
      fixtureRoot: "test/fixtures/pack-runtime-context",
      snapshotRoot: tmp,
    });
    var formatted = COMP.formatSnapshotDifference(r);
    if (formatted.indexOf("Snapshot content drift") === -1)
      throw new Error("expected 'Snapshot content drift' in output");
    if (formatted.indexOf("review required") === -1)
      throw new Error("expected 'review required' in output");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
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
  console.log("Snapshot comparator module skeleton check passed");
}
