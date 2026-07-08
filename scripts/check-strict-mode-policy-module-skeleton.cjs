#!/usr/bin/env node
/**
 * Strict mode policy module skeleton check
 * Validates policy module correctness without modifying any other code.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const MOD = require(path.join(__dirname, "..", "packages", "cli", "src", "validation", "pack-runtime-context-strict-policy.js"));
const PASS = [];
const FAIL = [];

function check(name, fn) {
  try { fn(); PASS.push(name); }
  catch (e) { FAIL.push(name + ": " + e.message); }
}

// 1. Required exports exist
check("STRICT_POLICY_VERSION", () => { if (typeof MOD.STRICT_POLICY_VERSION !== "number") throw new Error("missing"); });
check("STRICT_POLICY_RULES", () => { if (typeof MOD.STRICT_POLICY_RULES !== "object") throw new Error("missing"); });
check("STRICT_POLICY_STATUS", () => { if (typeof MOD.STRICT_POLICY_STATUS !== "object") throw new Error("missing"); });
check("getStrictPolicyRule", () => { if (typeof MOD.getStrictPolicyRule !== "function") throw new Error("missing"); });
check("classifyFindingForMode", () => { if (typeof MOD.classifyFindingForMode !== "function") throw new Error("missing"); });
check("applyStrictPolicy", () => { if (typeof MOD.applyStrictPolicy !== "function") throw new Error("missing"); });
check("validateStrictPolicy", () => { if (typeof MOD.validateStrictPolicy !== "function") throw new Error("missing"); });
check("getStrictPolicySummary", () => { if (typeof MOD.getStrictPolicySummary !== "function") throw new Error("missing"); });

// 2. Policy version is 1
check("version is 1", () => { if (MOD.STRICT_POLICY_VERSION !== 1) throw new Error("expected 1"); });

// 3. Rules frozen
check("rules frozen", () => {
  try { MOD.STRICT_POLICY_RULES.FAKE = 1; }
  catch (e) { /* expected: cannot add to frozen object */ return; }
  throw new Error("rules not frozen");
});

// 4. Rules deep frozen
check("rules deep frozen", () => {
  var r = MOD.STRICT_POLICY_RULES["ERROR_CONTEXT_NOT_OBJECT"];
  try { r.strictModeBlocking = false; }
  catch (e) { /* expected: cannot assign to read-only */ return; }
  throw new Error("rules not deep frozen");
});

// 5. All real finding codes have rules
var realCodes = ["ERROR_CONTEXT_NOT_OBJECT", "INFO_CONTRACT_VERSION_ABSENT", "WARN_CONTRACT_SECTION_MISSING", "WARN_CONTRACT_VERSION_MALFORMED", "WARN_RESERVED_NAMESPACE_USED"];
realCodes.forEach(function(code) {
  check("rule for " + code, () => {
    if (MOD.getStrictPolicyRule(code) === null) throw new Error("no rule for " + code);
  });
});

// 6. ERROR_CONTEXT_NOT_OBJECT classification
check("ERROR_CONTEXT_NOT_OBJECT soft non-blocking", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT"}, {mode:"soft"});
  if (r.blocking) throw new Error("should be non-blocking in soft");
});
check("ERROR_CONTEXT_NOT_OBJECT strict blocking", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT"}, {mode:"strict"});
  if (!r.blocking) throw new Error("should be blocking in strict");
});

// 7. INFO_CONTRACT_VERSION_ABSENT non-blocking in both modes
check("INFO_CONTRACT_VERSION_ABSENT soft non-blocking", () => {
  var r = MOD.classifyFindingForMode({code:"INFO_CONTRACT_VERSION_ABSENT"}, {mode:"soft"});
  if (r.blocking) throw new Error("should be non-blocking");
});
check("INFO_CONTRACT_VERSION_ABSENT strict non-blocking", () => {
  var r = MOD.classifyFindingForMode({code:"INFO_CONTRACT_VERSION_ABSENT"}, {mode:"strict"});
  if (r.blocking) throw new Error("should be non-blocking");
});

// 8. Other real finding codes classification
var otherCodes = ["WARN_CONTRACT_SECTION_MISSING", "WARN_CONTRACT_VERSION_MALFORMED", "WARN_RESERVED_NAMESPACE_USED"];
otherCodes.forEach(function(code) {
  check(code + " soft non-blocking", () => {
    var r = MOD.classifyFindingForMode({code: code}, {mode:"soft"});
    if (r.blocking) throw new Error("should be non-blocking");
  });
  check(code + " strict non-blocking", () => {
    var r = MOD.classifyFindingForMode({code: code}, {mode:"strict"});
    if (r.blocking) throw new Error("should be non-blocking");
  });
});

// 9. Unknown finding strict mode non-blocking
check("unknown finding strict non-blocking", () => {
  var r = MOD.classifyFindingForMode({code:"UNKNOWN_FAKE_CODE"}, {mode:"strict"});
  if (r.blocking) throw new Error("unknown should be non-blocking");
  if (r.policyStatus !== "unknown-policy-rule") throw new Error("wrong status");
  if (r.known) throw new Error("should be unknown");
});

// 10. severity=error does not auto-block in soft
check("severity error does not auto-block soft", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT", severity:"error"}, {mode:"soft"});
  if (r.blocking) throw new Error("error severity should not auto-block in soft");
});

// 11. Invalid mode stable failure
check("invalid mode returns structured error", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT"}, {mode:"invalid"});
  if (r.policyStatus !== "invalid-policy-rule") throw new Error("wrong status");
});

// 12. Missing code stable failure
check("missing code returns structured error", () => {
  var r = MOD.classifyFindingForMode({}, {mode:"strict"});
  if (r.policyStatus !== "invalid-policy-rule") throw new Error("wrong status");
});

// 13. Unsupported policy version
check("unsupported policy version handled", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT"}, {mode:"strict", policyVersion: 99});
  if (r.policyVersion !== 99) throw new Error("version not preserved");
});

// 14. applyStrictPolicy does not modify input report
check("applyStrictPolicy input immutability", () => {
  var report = { errors: [{code:"ERROR_CONTEXT_NOT_OBJECT"}], warnings: [], results: [] };
  var before = JSON.stringify(report);
  MOD.applyStrictPolicy(report, {mode:"strict"});
  var after = JSON.stringify(report);
  if (before !== after) throw new Error("input mutated");
});

// 15. applyStrictPolicy does not modify input findings
check("findings not mutated", () => {
  var finding = {code:"ERROR_CONTEXT_NOT_OBJECT", severity:"error"};
  var before = JSON.stringify(finding);
  MOD.applyStrictPolicy({errors: [finding], warnings: [], results: []}, {mode:"strict"});
  var after = JSON.stringify(finding);
  if (before !== after) throw new Error("finding mutated");
});

// 16. Strict blocking report → hard-fail
check("strict blocking → hard-fail", () => {
  var r = MOD.applyStrictPolicy({errors: [{code:"ERROR_CONTEXT_NOT_OBJECT"}], warnings: [], results: []}, {mode:"strict"});
  if (r.status !== "hard-fail") throw new Error("expected hard-fail");
  if (!r.blocking) throw new Error("expected blocking");
});

// 17. Info-only report → pass-with-info
check("info-only → pass-with-info", () => {
  var r = MOD.applyStrictPolicy({warnings: [{code:"INFO_CONTRACT_VERSION_ABSENT"}], errors: [], results: []}, {mode:"strict"});
  if (r.status !== "pass-with-info") throw new Error("expected pass-with-info");
});

// 18. Empty report → pass
check("empty report → pass", () => {
  var r = MOD.applyStrictPolicy({}, {mode:"strict"});
  if (r.status !== "pass") throw new Error("expected pass");
  if (r.summary.total !== 0) throw new Error("expected 0 total");
});

// 19. Soft mode never produces hard-fail
check("soft mode never hard-fail", () => {
  var r = MOD.applyStrictPolicy({errors: [{code:"ERROR_CONTEXT_NOT_OBJECT"}], warnings: [], results: []}, {mode:"soft"});
  if (r.status === "hard-fail") throw new Error("soft mode should never hard-fail");
  if (r.blocking) throw new Error("soft mode should not block");
});

// 20. Summary counting correct
check("summary counting correct", () => {
  var r = MOD.applyStrictPolicy({
    errors: [{code:"ERROR_CONTEXT_NOT_OBJECT"}, {code:"WARN_CONTRACT_SECTION_MISSING"}],
    warnings: [{code:"INFO_CONTRACT_VERSION_ABSENT"}],
    results: []
  }, {mode:"strict"});
  if (r.summary.total !== 3) throw new Error("total: " + r.summary.total);
  if (r.summary.blocking !== 1) throw new Error("blocking: " + r.summary.blocking);
  if (r.summary.info !== 1) throw new Error("info: " + r.summary.info);
  if (r.summary.errors !== 1) throw new Error("errors: " + r.summary.errors);
  if (r.summary.warnings !== 1) throw new Error("warnings: " + r.summary.warnings);
});

// 21. Repeated result deep equal
check("repeated result deep equal", () => {
  var report = { errors: [{code:"ERROR_CONTEXT_NOT_OBJECT"}], warnings: [], results: [] };
  var r1 = MOD.applyStrictPolicy(report, {mode:"strict"});
  var r2 = MOD.applyStrictPolicy(report, {mode:"strict"});
  if (JSON.stringify(r1) !== JSON.stringify(r2)) throw new Error("not deterministic");
});

// 22. Serialized result byte equal
check("serialized result byte equal", () => {
  var report = { warnings: [{code:"INFO_CONTRACT_VERSION_ABSENT"}], errors: [], results: [] };
  var r1 = MOD.applyStrictPolicy(report, {mode:"strict"});
  var r2 = MOD.applyStrictPolicy(report, {mode:"strict"});
  if (JSON.stringify(r1) !== JSON.stringify(r2)) throw new Error("byte mismatch");
});

// 23. Module has no write API
check("no write API", () => {
  var src = fs.readFileSync(path.join(__dirname, "..", "packages", "cli", "src", "validation", "pack-runtime-context-strict-policy.js"), "utf8");
  if (/require\([\'"]fs[\'"]\)/.test(src)) throw new Error("uses fs");
  if (/writeFileSync|createWriteStream|appendFile/.test(src)) throw new Error("has write API");
});

// 24. Module does not read env vars
check("no env reads", () => {
  var src = fs.readFileSync(path.join(__dirname, "..", "packages", "cli", "src", "validation", "pack-runtime-context-strict-policy.js"), "utf8");
  if (/process\.env/.test(src)) throw new Error("reads process.env");
});

// 25. No time/random behavior
check("no time/random", () => {
  var src = fs.readFileSync(path.join(__dirname, "..", "packages", "cli", "src", "validation", "pack-runtime-context-strict-policy.js"), "utf8");
  if (/Date\.now|new Date|Math\.random/.test(src)) throw new Error("has time/random");
});

// 26. No absolute path leakage in classification results
check("no absolute path in classification", () => {
  var r = MOD.classifyFindingForMode({code:"ERROR_CONTEXT_NOT_OBJECT"}, {mode:"strict"});
  if (r.reason.indexOf("/") >= 0) throw new Error("reason contains path");
});

// 27-30. Boundary checks on repo state
var repoRoot = path.join(__dirname, "..");
check("snapshot count is 3", () => {
  var snapDir = path.join(repoRoot, "test", "snapshots", "pack-runtime-context-soft-report");
  var snapshots = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach(function(f) {
      var fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f.endsWith(".report.json")) snapshots.push(f);
    });
  }
  walk(snapDir);
  if (snapshots.length !== 3) throw new Error("found " + snapshots.length);
});
check(".validation/ does not exist", () => {
  if (fs.existsSync(path.join(repoRoot, ".validation"))) throw new Error(".validation/ exists");
});

// Print results
console.log("Results: " + PASS.length + " passed, " + FAIL.length + " failed");
FAIL.forEach(function(f) { console.error("FAIL: " + f); });
if (FAIL.length === 0) console.log("\nStrict mode policy module skeleton check passed");
process.exit(FAIL.length > 0 ? 1 : 0);
