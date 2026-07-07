#!/usr/bin/env node
/**
 * Standalone validation for the M10.6 initial snapshot generation.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-initial-snapshot-generation.cjs
 *
 * Verifies:
 * - Three snapshot files exist
 * - Each is valid JSON with correct structure
 * - Byte-level determinism: regenerated candidate == committed snapshot
 * - Re-running --update returns "unchanged"
 * - Dry-run does not modify snapshot files
 * - No extra .report.json files
 * - No .validation/ directory created
 */

"use strict";

var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..");
var SNAPSHOT_DIR = path.join(ROOT, "test", "snapshots", "pack-runtime-context-soft-report");
var SW = require(path.join(ROOT, "packages", "cli", "src", "validation", "soft-validation-snapshot-writer.js"));

var SCRIPT = path.join(ROOT, "scripts", "write-pack-runtime-context-snapshots.cjs");

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

function readJson(filePath) {
  var raw = fs.readFileSync(filePath, "utf8");
  return { parsed: JSON.parse(raw), raw: raw };
}

function hasAbsPath(obj) {
  var s = JSON.stringify(obj);
  return s.indexOf("/Users/") !== -1 || s.indexOf(process.env.HOME) !== -1;
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

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

var FIXTURES = {
  valid: {
    fixturePath: "test/fixtures/pack-runtime-context/valid/minimal-valid.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json",
    expectedStatus: "pass",
    expectedTotal: 0,
    expectedErrors: 0,
  },
  invalid: {
    fixturePath: "test/fixtures/pack-runtime-context/invalid/context-not-object.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/invalid/context-not-object.report.json",
    expectedStatus: "soft-fail",
    expectedErrors: 1,
    expectedFindingCode: "ERROR_CONTEXT_NOT_OBJECT",
  },
  edge: {
    fixturePath: "test/fixtures/pack-runtime-context/edge/missing-contract-version.json",
    snapshotPath: "test/snapshots/pack-runtime-context-soft-report/edge/missing-contract-version.report.json",
    expectedStatus: "pass-with-info",
    expectedInfo: 1,
    expectedFindingCode: "INFO_CONTRACT_VERSION_ABSENT",
  },
};

var FIXED_TS = "1970-01-01T00:00:00.000Z";

// 1. Three snapshot files exist
for (var key in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("snapshot exists: " + k, function () {
      var fp = path.join(ROOT, f.snapshotPath);
      if (!fs.existsSync(fp)) throw new Error("missing: " + f.snapshotPath);
    });
  })(key);
}

// 2. Each snapshot is valid JSON
for (var key2 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("snapshot is valid JSON: " + k, function () {
      var fp = path.join(ROOT, f.snapshotPath);
      var j = readJson(fp);
      if (!j.parsed) throw new Error("parse error");
    });
  })(key2);
}

// 3. Target paths correct (already validated by existence check)
for (var key3 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("target snapshot path correct: " + k, function () {
      var expected = f.snapshotPath;
      var actual = SW.mapFixturePathToSnapshotPath(f.fixturePath).snapshotPath;
      if (actual !== expected) throw new Error("expected " + expected + ", got " + actual);
    });
  })(key3);
}

// 4. generatedAt fixed
for (var key4 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("generatedAt fixed: " + k, function () {
      var fp = path.join(ROOT, f.snapshotPath);
      var j = readJson(fp);
      if (j.parsed.generatedAt !== FIXED_TS)
        throw new Error("expected " + FIXED_TS + ", got " + j.parsed.generatedAt);
    });
  })(key4);
}

// 5. source is repo-relative fixture path
for (var key5 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("source is repo-relative: " + k, function () {
      var fp = path.join(ROOT, f.snapshotPath);
      var j = readJson(fp);
      if (j.parsed.source !== f.fixturePath)
        throw new Error("expected source=" + f.fixturePath + ", got " + j.parsed.source);
      if (hasAbsPath(j.parsed.source)) throw new Error("source contains absolute path");
    });
  })(key5);
}

// 6. metadata contains no absolute paths or machine info
for (var key6 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("metadata clean: " + k, function () {
      var fp = path.join(ROOT, f.snapshotPath);
      var j = readJson(fp);
      if (hasAbsPath(j.parsed.metadata))
        throw new Error("metadata contains absolute path");
    });
  })(key6);
}

// 7. minimal-valid: pass, 0 findings
test("minimal-valid: status=pass, total=0", function () {
  var fp = path.join(ROOT, FIXTURES.valid.snapshotPath);
  var j = readJson(fp);
  if (j.parsed.status !== "pass") throw new Error("expected pass, got " + j.parsed.status);
  if (j.parsed.summary.total !== 0) throw new Error("expected total=0, got " + j.parsed.summary.total);
  if ((j.parsed.results || []).length !== 0)
    throw new Error("expected 0 results, got " + j.parsed.results.length);
});

// 8. context-not-object: soft-fail, ERROR_CONTEXT_NOT_OBJECT, blocking=false
test("context-not-object: soft-fail, ERROR_CONTEXT_NOT_OBJECT, blocking=false", function () {
  var fp = path.join(ROOT, FIXTURES.invalid.snapshotPath);
  var j = readJson(fp);
  if (j.parsed.status !== "soft-fail")
    throw new Error("expected soft-fail, got " + j.parsed.status);
  if (j.parsed.summary.errors !== 1)
    throw new Error("expected errors=1, got " + j.parsed.summary.errors);
  var found = false;
  var results = j.parsed.results || [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].code === "ERROR_CONTEXT_NOT_OBJECT") {
      found = true;
      if (results[i].blocking !== false)
        throw new Error("expected blocking=false, got " + results[i].blocking);
    }
  }
  if (!found) throw new Error("finding ERROR_CONTEXT_NOT_OBJECT not found");
});

// 9. missing-contract-version: pass-with-info, INFO_CONTRACT_VERSION_ABSENT
test("missing-contract-version: pass-with-info, INFO_CONTRACT_VERSION_ABSENT", function () {
  var fp = path.join(ROOT, FIXTURES.edge.snapshotPath);
  var j = readJson(fp);
  if (j.parsed.status !== "pass-with-info")
    throw new Error("expected pass-with-info, got " + j.parsed.status);
  if (j.parsed.summary.info !== 1)
    throw new Error("expected info=1, got " + j.parsed.summary.info);
  var found = false;
  var results = j.parsed.results || [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].code === "INFO_CONTRACT_VERSION_ABSENT") {
      found = true;
      if (results[i].blocking !== false)
        throw new Error("expected blocking=false, got " + results[i].blocking);
    }
  }
  if (!found) throw new Error("finding INFO_CONTRACT_VERSION_ABSENT not found");
});

// 10. Regenerate candidate for each fixture
// 11. Candidate serialization == committed snapshot (byte-level)
for (var key7 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("regenerate == committed snapshot (byte-level): " + k, function () {
      var candidate = SW.createNormalizedSnapshotReport(f.fixturePath);
      var serialized = SW.serializeSnapshotReport(candidate.report);
      var committed = fs.readFileSync(path.join(ROOT, f.snapshotPath), "utf8");
      if (serialized !== committed) {
        throw new Error(
          "byte mismatch: expected length " +
            committed.length +
            ", got " +
            serialized.length
        );
      }
      if (!Buffer.from(serialized).equals(Buffer.from(committed)))
        throw new Error("Buffer.compare failed");
    });
  })(key7);
}

// 12. Re-running --update returns "unchanged"
for (var key8 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("re-run --update returns unchanged: " + k, function () {
      var r = runScript([
        "node",
        SCRIPT,
        "--fixture",
        f.fixturePath,
        "--update",
      ]);
      if (r.code !== 0)
        throw new Error("exit code " + r.code + ": " + r.stderr);
      if (r.stdout.indexOf("unchanged") === -1)
        throw new Error("expected 'unchanged' in output, got: " + r.stdout);
    });
  })(key8);
}

// 13. Dry-run does not modify snapshot files
for (var key9 in FIXTURES) {
  (function (k) {
    var f = FIXTURES[k];
    test("dry-run does not modify snapshots: " + k, function () {
      var pre = fs.readFileSync(path.join(ROOT, f.snapshotPath));
      var r = runScript(["node", SCRIPT, "--fixture", f.fixturePath]);
      if (r.code !== 0) throw new Error("dry-run exited " + r.code);
      var post = fs.readFileSync(path.join(ROOT, f.snapshotPath));
      if (!pre.equals(post))
        throw new Error("snapshot file was modified by dry-run");
    });
  })(key9);
}

// 14. --all still exits 1
test("--all exits 1", function () {
  var r = runScript(["node", SCRIPT, "--all"]);
  if (r.code === 0) throw new Error("--all should exit 1");
});

// 15. No .validation/ directory created
test("no .validation/ directory created", function () {
  var valDir = path.join(ROOT, ".validation");
  if (fs.existsSync(valDir)) throw new Error(".validation/ exists (unexpected)");
});

// 16. No extra .report.json files
test("no extra .report.json files", function () {
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
  var files = findReportFiles(SNAPSHOT_DIR);
  var expected = [
    "valid/minimal-valid.report.json",
    "invalid/context-not-object.report.json",
    "edge/missing-contract-version.report.json",
  ];
  for (var i = 0; i < expected.length; i++) {
    if (files.indexOf(expected[i]) === -1)
      throw new Error("missing expected: " + expected[i]);
  }
  // Check no extras
  for (var j = 0; j < files.length; j++) {
    if (expected.indexOf(files[j]) === -1)
      throw new Error("unexpected extra: " + files[j]);
  }
});

/* ================================================================== */
/*  Run                                                                */
/* ================================================================== */

runTests();

console.log("");
console.log("Results: " + PASSED + " passed, " + FAILED + " failed");
console.log("");

if (FAILED > 0) {
  process.exit(1);
} else {
  console.log("Initial snapshot generation check passed");
}
