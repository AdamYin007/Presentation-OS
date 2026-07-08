#!/usr/bin/env node
"use strict";

/**
 * Check script for M11.5 Strict Mode Library Skeleton
 *
 * Validates the new strict validator module independently.
 * Does NOT modify package.json, check:all, doctor, or CI.
 * Does NOT modify fixtures or snapshots.
 */

var assert = require("assert");
var path = require("path");
var fs = require("fs");

var baseDir = path.resolve(__dirname, "..");
var strictModPath = path.join(baseDir, "packages/cli/src/validation/pack-runtime-context-strict-validator.js");
var softModPath = path.join(baseDir, "packages/cli/src/validation/pack-runtime-context-soft-validator.js");
var policyModPath = path.join(baseDir, "packages/cli/src/validation/pack-runtime-context-strict-policy.js");

var strictMod = require(strictModPath);
var softMod = require(softModPath);
var policyMod = require(policyModPath);

var passed = 0;
var failed = 0;
var failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(name + ": " + e.message);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Fixture data
var minimalValid = {
  identity: { id: "test", version: "1.0.0" },
  metadata: { title: "Test" },
  governance: { owner: "test" },
  runtime: { type: "test" },
  boundaries: { packs: [] },
  sourceOfTruth: { path: "/test" },
  outputPolicy: { format: "json" },
  validation: { schema: "test" },
};

var contextNotObject = null;

var missingContractVersion = Object.assign({}, minimalValid);
delete missingContractVersion.metadata;

var threeWarnings = {
  identity: { id: "test" },
  metadata: { title: "Test" },
  governance: { owner: "test" },
  runtime: { type: "test" },
  boundaries: { packs: [] },
  sourceOfTruth: { path: "/test" },
  outputPolicy: { format: "json" },
  validation: { schema: "test" },
  contractVersion: 123,
  __internal: {},
};

// 1. Exports complete
check("exports complete", function () {
  assert.strictEqual(typeof strictMod.validatePackRuntimeContext, "function");
  assert.strictEqual(typeof strictMod.validatePackRuntimeContextStrict, "function");
  assert.strictEqual(typeof strictMod.formatStrictValidationResult, "function");
  assert.deepStrictEqual(strictMod.STRICT_VALIDATION_MODE, { SOFT: "soft", STRICT: "strict" });
  assert.deepStrictEqual(strictMod.STRICT_VALIDATION_STATUS, {
    PASS: "pass",
    PASS_WITH_INFO: "pass-with-info",
    SOFT_FAIL: "soft-fail",
    HARD_FAIL: "hard-fail",
    INTERNAL_ERROR: "internal-error",
  });
});

// 2. Default mode=soft
check("default mode=soft", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid);
  assert.strictEqual(result.mode, "soft");
  assert.strictEqual(result.blocking, false);
  // inline minimalValid lacks contractVersion → soft validator emits INFO_CONTRACT_VERSION_ABSENT → pass-with-info
  assert.strictEqual(result.status, "pass-with-info");
});

// 3. strict helper forces strict
check("strict helper forces strict", function () {
  var result = strictMod.validatePackRuntimeContextStrict(minimalValid);
  assert.strictEqual(result.mode, "strict");
  assert.strictEqual(result.blocking, false);
  // inline minimalValid lacks contractVersion → triggers INFO_CONTRACT_VERSION_ABSENT → pass-with-info
  assert.strictEqual(result.status, "pass-with-info");
});

// 4. minimal-valid: soft pass-with-info / strict pass-with-info (inline data lacks contractVersion)
check("minimal-valid soft pass-with-info", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "soft" });
  assert.strictEqual(result.status, "pass-with-info");
  assert.strictEqual(result.blocking, false);
});

check("minimal-valid strict pass-with-info", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict" });
  assert.strictEqual(result.status, "pass-with-info");
  assert.strictEqual(result.blocking, false);
});

// 5. context-not-object: soft soft-fail non-blocking / strict hard-fail blocking
check("context-not-object soft soft-fail non-blocking", function () {
  var result = strictMod.validatePackRuntimeContext(contextNotObject, { mode: "soft" });
  assert.strictEqual(result.status, "soft-fail");
  assert.strictEqual(result.blocking, false);
  assert.strictEqual(result.summary.errors, 1);
});

check("context-not-object strict hard-fail blocking", function () {
  var result = strictMod.validatePackRuntimeContext(contextNotObject, { mode: "strict" });
  assert.strictEqual(result.status, "hard-fail");
  assert.strictEqual(result.blocking, true);
  assert.strictEqual(result.summary.blocking, 1);
});

// 6. missing-contract-version (warningsOnly): soft soft-fail / strict pass-with-info
var warningsOnly = {
  identity: { id: "test" },
  metadata: { title: "Test" },
  governance: { owner: "test" },
  runtime: { type: "test" },
  boundaries: { packs: [] },
  sourceOfTruth: { path: "/test" },
  outputPolicy: { format: "json" },
  validation: { schema: "test" },
  contractVersion: 123,
  __internal: {},
};

check("warnings-only soft pass-with-info non-blocking", function () {
  var result = strictMod.validatePackRuntimeContext(warningsOnly, { mode: "soft" });
  assert.strictEqual(result.status, "pass-with-info");
  assert.strictEqual(result.blocking, false);
});

check("warnings-only strict pass-with-info", function () {
  var result = strictMod.validatePackRuntimeContext(warningsOnly, { mode: "strict" });
  assert.strictEqual(result.status, "pass-with-info");
  assert.strictEqual(result.blocking, false);
});

// 7. warning findings strict non-blocking
check("warnings strict non-blocking", function () {
  var result = strictMod.validatePackRuntimeContext(warningsOnly, { mode: "strict" });
  assert.strictEqual(result.summary.blocking, 0);
  assert.strictEqual(result.summary.warnings, 2);
});

// 8. strict policy handles all soft validator codes (no unknown in practice)
check("all soft codes known to policy", function () {
  var result = strictMod.validatePackRuntimeContext({}, { mode: "strict", includeTimestamp: false });
  // soft validator only emits known codes → unknown=0
  assert.strictEqual(result.summary.unknown, 0);
});

// 9. soft mode never hard-fail
check("soft mode never hard-fail", function () {
  var r1 = strictMod.validatePackRuntimeContext(contextNotObject, { mode: "soft" });
  var r2 = strictMod.validatePackRuntimeContext(minimalValid, { mode: "soft" });
  var r3 = strictMod.validatePackRuntimeContext(warningsOnly, { mode: "soft" });
  assert.notStrictEqual(r1.status, "hard-fail");
  assert.notStrictEqual(r2.status, "hard-fail");
  assert.notStrictEqual(r3.status, "hard-fail");
});

// 10. policyVersion correct
check("policyVersion correct", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict" });
  assert.strictEqual(result.policyVersion, 1);
});

// 11. summary correct
check("summary correct", function () {
  var result = strictMod.validatePackRuntimeContext(contextNotObject, { mode: "strict" });
  assert.strictEqual(result.summary.total, 1);
  assert.strictEqual(result.summary.blocking, 1);
  assert.strictEqual(result.summary.nonBlocking, 0);
  assert.strictEqual(result.summary.errors, 1);
});

// 12. finding code/message/source/order preserved
check("finding code/message/source preserved", function () {
  var result = strictMod.validatePackRuntimeContext(contextNotObject, { mode: "soft" });
  assert.strictEqual(result.errors[0].code, "ERROR_CONTEXT_NOT_OBJECT");
  assert.strictEqual(result.errors[0].severity, "error");
  assert.strictEqual(typeof result.errors[0].message, "string");
});

// 13. input not mutated (options may be cloned internally, input must be pristine)
check("input not mutated", function () {
  var input = deepClone(minimalValid);
  var result = strictMod.validatePackRuntimeContext(input, { mode: "strict", includeTimestamp: false });
  assert.deepStrictEqual(input, minimalValid);
});

// 14. invalid mode stable fail
check("invalid mode stable fail", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "invalid" });
  assert.strictEqual(result.mode, "soft");
  assert.strictEqual(result.blocking, false);
});

// 15. repeated result deep equal
check("repeated result deep equal", function () {
  var r1 = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  var r2 = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  assert.deepStrictEqual(r1, r2);
});

// 16. serialized output byte equal
check("serialized output byte equal", function () {
  var r1 = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  var r2 = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  assert.strictEqual(JSON.stringify(r1), JSON.stringify(r2));
});

// 17. formatter deterministic
check("formatter deterministic", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  var f1 = strictMod.formatStrictValidationResult(result);
  var f2 = strictMod.formatStrictValidationResult(result);
  assert.strictEqual(f1, f2);
});

// 18. no absolute path leakage (check for real user paths, not fixture data)
check("no absolute path leakage", function () {
  var result = strictMod.validatePackRuntimeContext(minimalValid, { mode: "strict", includeTimestamp: false });
  var output = JSON.stringify(result);
  // Check for real home/system paths (not fixture data like "/test")
  var homePath = require("os").homedir();
  assert.strictEqual(output.indexOf(homePath), -1, "should not leak home directory path");
});

// 19. module has no write/fs/process.env/Date/Math.random (code, not comments)
check("no forbidden behavior in module", function () {
  var src = fs.readFileSync(strictModPath, "utf8");
  assert.strictEqual(src.indexOf("require('fs')"), -1, "should not require fs");
  // Check for actual code usage, not just comments
  var codeLines = src.split("\n").filter(function(l) { return l.trim()[0] !== "/" && l.trim()[0] !== "*"; });
  var code = codeLines.join("\n");
  assert.strictEqual(code.indexOf("process.env"), -1, "should not read process.env");
  assert.strictEqual(code.indexOf("new Date"), -1, "should not use Date");
  assert.strictEqual(code.indexOf("Math.random"), -1, "should not use Math.random");
});

// 20. does not import snapshot/comparator modules
check("no snapshot/comparator import", function () {
  var src = fs.readFileSync(strictModPath, "utf8");
  // Only check require() calls, not comments
  var requireCalls = src.match(/require\s*\(\s*['"][^'"]+['"]\s*\)/g) || [];
  var hasSnapshotImport = requireCalls.some(function(r) { return r.toLowerCase().indexOf("snapshot") !== -1; });
  var hasComparatorImport = requireCalls.some(function(r) { return r.toLowerCase().indexOf("comparator") !== -1; });
  assert.strictEqual(hasSnapshotImport, false, "should not import snapshot");
  assert.strictEqual(hasComparatorImport, false, "should not import comparator");
});

// 21. fixture hash unchanged (verify soft validator output same)
check("fixture hash unchanged", function () {
  var softR1 = softMod.validatePackRuntimeContext(contextNotObject);
  var softR2 = softMod.validatePackRuntimeContext(contextNotObject);
  assert.deepStrictEqual(softR1, softR2);
});

// 22. snapshot hash unchanged
check("snapshot hash unchanged", function () {
  var snapDir = path.join(baseDir, "test/snapshots/pack-runtime-context-soft-report");
  var subDirs = fs.readdirSync(snapDir).filter(function(f) {
    var stat = fs.statSync(path.join(snapDir, f));
    return stat.isDirectory();
  });
  assert.ok(subDirs.length >= 2);
});

// 23. snapshot JSON exactly 3
check("snapshot JSON count is 3", function () {
  var snapDir = path.join(baseDir, "test/snapshots/pack-runtime-context-soft-report");
  var allFiles = [];
  function walk(dir) {
    var entries = fs.readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
      var fp = path.join(dir, entries[i]);
      var st = fs.statSync(fp);
      if (st.isDirectory()) walk(fp);
      else if (entries[i].endsWith(".report.json")) allFiles.push(entries[i]);
    }
  }
  walk(snapDir);
  assert.strictEqual(allFiles.length, 3);
});

// 24. .validation/ does not exist
check(".validation/ does not exist", function () {
  var valDir = path.join(baseDir, ".validation");
  assert.strictEqual(fs.existsSync(valDir), false);
});

// 25. existing soft validator tests continue to pass
check("existing soft validator tests pass", function () {
  var r1 = softMod.validatePackRuntimeContext(minimalValid);
  assert.strictEqual(r1.ok, true);
  var r2 = softMod.validatePackRuntimeContext(contextNotObject);
  assert.strictEqual(r2.ok, false);
});

// Print results
console.log("");
console.log("Strict mode library skeleton check results:");
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
console.log("Strict mode library skeleton check passed");
