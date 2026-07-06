#!/usr/bin/env node
/**
 * Standalone local validation script for soft validation report writer skeleton.
 *
 * NOT wired into package.json, check:all, CI, or doctor.
 * Run: node scripts/check-soft-validation-report-writer.cjs
 */

"use strict";

var assert = require("assert");
var validator = require("../packages/cli/src/validation/pack-runtime-context-soft-validator.js");
var writer = require("../packages/cli/src/validation/soft-validation-report-writer.js");

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

function assertReportShape(report) {
  assert.strictEqual(typeof report.reportVersion, "string", "reportVersion must be string");
  assert.strictEqual(report.reportVersion, writer.REPORT_VERSION);
  assert.strictEqual(report.reportType, writer.REPORT_TYPE);
  assert.strictEqual(typeof report.validatorId, "string");
  assert.strictEqual(typeof report.contractName, "string");
  // contractVersion can be string or null
  assert(report.contractVersion === null || typeof report.contractVersion === "string", "contractVersion must be string or null");
  assert(Object.values(writer.REPORT_STATUS).indexOf(report.status) !== -1, "status must be valid");
  assert(Object.values(writer.REPORT_SEVERITY).indexOf(report.severity) !== -1, "severity must be valid");
  assert(typeof report.generatedAt === "string", "generatedAt must be string");
  assert(Array.isArray(report.results), "results must be array");
  assert(typeof report.summary === "object", "summary must be object");
  assert(typeof report.summary.total === "number");
  assert(typeof report.summary.info === "number");
  assert(typeof report.summary.warnings === "number");
  assert(typeof report.summary.errors === "number");
  assert(typeof report.summary.gatesChecked === "number");
  assert(typeof report.summary.gatesWithFindings === "number");
  assert(typeof report.metadata === "object");
}

function assertResultShape(r) {
  assert(typeof r.id === "string", "id must be string");
  assert(typeof r.gateId === "string", "gateId must be string");
  assert(typeof r.code === "string", "code must be string");
  assert(Object.values(writer.REPORT_SEVERITY).indexOf(r.severity) !== -1, "severity must be valid");
  assert(typeof r.message === "string", "message must be string");
  // path can be string or null
  assert(r.path === null || typeof r.path === "string");
  assert(r.expected === null || typeof r.expected !== "undefined");
  assert(r.actual === null || typeof r.actual !== "undefined");
  assert(typeof r.migrationHint === "string", "migrationHint must be string");
  assert(r.sourceDocument === null || typeof r.sourceDocument === "string");
  assert(typeof r.introducedIn === "string", "introducedIn must be string");
  assert(typeof r.blocking === "boolean", "blocking must be boolean");
}

// --- Constants check ---

test("REPORT_VERSION is '0.1'", function () {
  assert.strictEqual(writer.REPORT_VERSION, "0.1");
});

test("REPORT_TYPE is 'soft-validation'", function () {
  assert.strictEqual(writer.REPORT_TYPE, "soft-validation");
});

test("REPORT_STATUS has all values", function () {
  assert.strictEqual(writer.REPORT_STATUS.PASS, "pass");
  assert.strictEqual(writer.REPORT_STATUS.PASS_WITH_INFO, "pass-with-info");
  assert.strictEqual(writer.REPORT_STATUS.PASS_WITH_WARNINGS, "pass-with-warnings");
  assert.strictEqual(writer.REPORT_STATUS.SOFT_FAIL, "soft-fail");
  assert.strictEqual(writer.REPORT_STATUS.INTERNAL_ERROR, "internal-error");
});

test("REPORT_SEVERITY has all values", function () {
  assert.strictEqual(writer.REPORT_SEVERITY.INFO, "info");
  assert.strictEqual(writer.REPORT_SEVERITY.WARNING, "warning");
  assert.strictEqual(writer.REPORT_SEVERITY.ERROR, "error");
});

// --- Scenario 1: Minimal valid-ish context (from M9.2) ---

test("Scenario 1: minimal context → report status is pass-with-info or pass-with-warnings", function () {
  var ctx = {
    identity: { packId: "test-pack" },
    metadata: { name: "Test", version: "0.1.0" },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    runtime: { loadedByDefault: false, requiresPackLoader: true },
  };
  var validationResult = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(validationResult);
  assertReportShape(report);
  assert(report.status === writer.REPORT_STATUS.PASS_WITH_INFO ||
         report.status === writer.REPORT_STATUS.PASS_WITH_WARNINGS ||
         report.status === writer.REPORT_STATUS.PASS,
    "status should be pass variant, got: " + report.status);
  assert(report.results.length > 0, "should have findings for missing sections");
  // All results should have blocking=false
  for (var i = 0; i < report.results.length; i++) {
    assert.strictEqual(report.results[i].blocking, false, "result " + i + " blocking should be false");
  }
});

// --- Scenario 2: Missing contractVersion context ---

test("Scenario 2: missing contractVersion → no throw, report generated", function () {
  var ctx = {
    identity: { packId: "test-pack" },
    metadata: { name: "Test" },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    runtime: { loadedByDefault: false, requiresPackLoader: true },
    boundaries: { storyRegistryDefault: true },
    sourceOfTruth: { packsAreDefault: false },
    outputPolicy: {},
    validation: {},
  };
  var validationResult = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(validationResult);
  assertReportShape(report);
  // Should have the contractVersion absent finding
  var cvAbsent = report.results.filter(function (r) {
    return r.code === "INFO_CONTRACT_VERSION_ABSENT";
  });
  assert(cvAbsent.length >= 1, "should include INFO_CONTRACT_VERSION_ABSENT");
});

// --- Scenario 3: Invalid non-object context → soft-fail ---

test("Scenario 3: invalid non-object → report status soft-fail", function () {
  var validationResult = validator.validatePackRuntimeContext("not-an-object");
  var report = writer.createSoftValidationReport(validationResult);
  assertReportShape(report);
  assert.strictEqual(report.status, writer.REPORT_STATUS.SOFT_FAIL, "non-object should be soft-fail");
  assert.strictEqual(report.severity, writer.REPORT_SEVERITY.ERROR);
  assert(report.summary.errors > 0, "should have errors in summary");
  for (var i = 0; i < report.results.length; i++) {
    assertResultShape(report.results[i]);
  }
});

// --- Summary correctness ---

test("Summary total equals results.length", function () {
  var ctx = { identity: {} };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr);
  assert.strictEqual(report.summary.total, report.results.length);
});

test("Summary counts match per-severity", function () {
  var ctx = { identity: {} };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr);
  var infoCount = 0;
  var warnCount = 0;
  var errCount = 0;
  for (var i = 0; i < report.results.length; i++) {
    if (report.results[i].severity === "info") infoCount++;
    else if (report.results[i].severity === "warning") warnCount++;
    else if (report.results[i].severity === "error") errCount++;
  }
  assert.strictEqual(report.summary.info, infoCount);
  assert.strictEqual(report.summary.warnings, warnCount);
  assert.strictEqual(report.summary.errors, errCount);
});

// --- Serialization ---

test("serializeSoftValidationReport returns parseable JSON", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr);
  var jsonStr = writer.serializeSoftValidationReport(report);
  assert.strictEqual(typeof jsonStr, "string");
  var parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.reportVersion, writer.REPORT_VERSION);
  assert.strictEqual(parsed.status, report.status);
});

test("serializeSoftValidationReport pretty=false returns compact JSON", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr);
  var compact = writer.serializeSoftValidationReport(report, { pretty: false });
  assert(compact.indexOf("\n") === -1, "compact should have no newlines");
});

// --- Options ---

test("options.generatedAt overrides timestamp", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr, { generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.strictEqual(report.generatedAt, "2026-01-01T00:00:00.000Z");
});

test("options.includeTimestamp=false omits generatedAt", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr, { includeTimestamp: false });
  assert.strictEqual(report.generatedAt, null);
});

test("options.source is reflected in report", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr, { source: "test-script" });
  assert.strictEqual(report.source, "test-script");
});

test("options.metadata is included in report", function () {
  var ctx = { identity: { packId: "x" } };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr, { metadata: { foo: "bar" } });
  assert.strictEqual(report.metadata.foo, "bar");
});

// --- Result shape ---

test("Every result has all required fields", function () {
  var ctx = { identity: {} };
  var vr = validator.validatePackRuntimeContext(ctx);
  var report = writer.createSoftValidationReport(vr);
  for (var i = 0; i < report.results.length; i++) {
    assertResultShape(report.results[i]);
  }
});

// --- normalizeSoftValidationResult alias ---

test("normalizeSoftValidationResult is exported and callable", function () {
  assert(typeof writer.normalizeSoftValidationResult === "function");
  var results = writer.normalizeSoftValidationResult([{ code: "TEST", severity: "info", message: "t", path: "x", expected: null, actual: null, migrationHint: "", sourceDocument: "" }], []);
  assert(Array.isArray(results));
  assert.strictEqual(results.length, 1);
});

// --- Summary ---

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Soft validation report writer skeleton check passed");
}
