/**
 * PackRuntimeContext Strict Mode Policy Module Skeleton
 *
 * A deterministic, read-only, version-controlled classification layer
 * that maps existing finding codes to mode-specific blocking decisions.
 *
 * This module does NOT:
 * - Re-run validator
 * - Write files
 * - Update snapshots
 * - Call comparator
 * - Read environment variables
 * - Depend on current time
 * - Mutate input data
 *
 * @module pack-runtime-context-strict-policy
 */

"use strict";

/**
 * Policy version constant.
 * Increments only on classification contract changes.
 * @type {number}
 */
var STRICT_POLICY_VERSION = 1;

/**
 * Policy status constants.
 * @enum {string}
 */
var STRICT_POLICY_STATUS = {
  KNOWN_BLOCKING: "known-blocking",
  KNOWN_NON_BLOCKING: "known-non-blocking",
  UNKNOWN_POLICY_RULE: "unknown-policy-rule",
  INVALID_POLICY_RULE: "invalid-policy-rule",
  POLICY_VERSION_MISMATCH: "policy-version-mismatch",
  INTERNAL_POLICY_ERROR: "internal-policy-error"
};

/**
 * Frozen policy rules for all known finding codes.
 * @type {Object}
 */
var STRICT_POLICY_RULES = {
  "ERROR_CONTEXT_NOT_OBJECT": {
    softModeBlocking: false,
    strictModeBlocking: true,
    severity: "error",
    reason: "The PackRuntimeContext root must be an object.",
    introducedInPolicyVersion: 1,
    owner: "validation",
    reviewRequired: true
  },
  "WARN_CONTRACT_SECTION_MISSING": {
    softModeBlocking: false,
    strictModeBlocking: false,
    severity: "warning",
    reason: "Section presence varies by contract maturity.",
    introducedInPolicyVersion: 1,
    owner: "validation",
    reviewRequired: false
  },
  "INFO_CONTRACT_VERSION_ABSENT": {
    softModeBlocking: false,
    strictModeBlocking: false,
    severity: "info",
    reason: "Missing contract version is informational at this stage.",
    introducedInPolicyVersion: 1,
    owner: "validation",
    reviewRequired: false
  },
  "WARN_CONTRACT_VERSION_MALFORMED": {
    softModeBlocking: false,
    strictModeBlocking: false,
    severity: "warning",
    reason: "Malformed version is a data quality concern, not structural failure.",
    introducedInPolicyVersion: 1,
    owner: "validation",
    reviewRequired: false
  },
  "WARN_RESERVED_NAMESPACE_USED": {
    softModeBlocking: false,
    strictModeBlocking: false,
    severity: "warning",
    reason: "Reserved namespace collision is a preventive warning.",
    introducedInPolicyVersion: 1,
    owner: "validation",
    reviewRequired: false
  }
};

// Deep freeze all rules
Object.freeze(STRICT_POLICY_RULES);
var _rk = Object.keys(STRICT_POLICY_RULES);
for (var _i = 0; _i < _rk.length; _i++) {
  Object.freeze(STRICT_POLICY_RULES[_rk[_i]]);
}

/**
 * Look up a policy rule by finding code.
 * @param {string} code - Finding code
 * @returns {Object|null} Frozen rule or null
 */
function getStrictPolicyRule(code) {
  if (typeof code !== "string" || code.length === 0) return null;
  return STRICT_POLICY_RULES.hasOwnProperty(code) ? STRICT_POLICY_RULES[code] : null;
}

/**
 * Classify a single finding for the given mode.
 * @param {Object} finding - Finding object with at least a "code" field
 * @param {Object} [options] - Options
 * @param {string} [options.mode="soft"] - Operating mode
 * @param {number} [options.policyVersion] - Policy version
 * @returns {Object} Classification result
 */
function classifyFindingForMode(finding, options) {
  var opts = options || {};
  var mode = opts.mode || "soft";
  var pv = opts.policyVersion != null ? opts.policyVersion : STRICT_POLICY_VERSION;

  if (mode !== "soft" && mode !== "strict") {
    return { policyVersion: pv, mode: mode, code: null, known: false, severity: null, blocking: false, policyStatus: STRICT_POLICY_STATUS.INVALID_POLICY_RULE, reason: "Invalid mode: " + mode };
  }

  if (!finding || typeof finding.code !== "string" || finding.code.length === 0) {
    return { policyVersion: pv, mode: mode, code: null, known: false, severity: null, blocking: false, policyStatus: STRICT_POLICY_STATUS.INVALID_POLICY_RULE, reason: "Finding missing valid code" };
  }

  var code = finding.code;
  var rule = getStrictPolicyRule(code);
  var isKnown = rule !== null;
  var blocking = false;
  var ps;
  var sev = isKnown ? rule.severity : (finding.severity || null);

  if (isKnown) {
    blocking = (mode === "soft") ? rule.softModeBlocking : rule.strictModeBlocking;
    ps = blocking ? STRICT_POLICY_STATUS.KNOWN_BLOCKING : STRICT_POLICY_STATUS.KNOWN_NON_BLOCKING;
  } else {
    ps = STRICT_POLICY_STATUS.UNKNOWN_POLICY_RULE;
  }

  return {
    policyVersion: pv, mode: mode, code: code, known: isKnown,
    severity: sev, blocking: blocking, policyStatus: ps,
    reason: isKnown ? rule.reason : "No strict policy rule is defined."
  };
}

/**
 * Apply strict policy to a full report.
 * @param {Object} report - Validation report with results/warnings/errors
 * @param {Object} [options] - Options
 * @param {string} [options.mode="strict"] - Operating mode
 * @returns {Object} Strict classification result
 */
function applyStrictPolicy(report, options) {
  var opts = options || {};
  var mode = opts.mode || "strict";
  var pv = STRICT_POLICY_VERSION;
  var findings = [];

  if (report) {
    if (Array.isArray(report.warnings)) {
      for (var _i = 0; _i < report.warnings.length; _i++) {
        findings.push(Object.assign({}, report.warnings[_i]));
      }
    }
    if (Array.isArray(report.errors)) {
      for (var _j = 0; _j < report.errors.length; _j++) {
        findings.push(Object.assign({}, report.errors[_j]));
      }
    }
    if (Array.isArray(report.results) && report.results.length > 0) {
      for (var _k = 0; _k < report.results.length; _k++) {
        findings.push(Object.assign({}, report.results[_k]));
      }
    }
  }

  var classified = [];
  var bc = 0, nb = 0, uc = 0, ec = 0, wc = 0, ic = 0;

  for (var _m = 0; _m < findings.length; _m++) {
    var c = classifyFindingForMode(findings[_m], { mode: mode, policyVersion: pv });
    classified.push(c);
    if (c.blocking) bc++; else nb++;
    if (!c.known) uc++;
    if (c.severity === "error") ec++;
    else if (c.severity === "warning") wc++;
    else if (c.severity === "info") ic++;
  }

  var status, isBlocking;
  if (mode === "soft") {
    status = "pass"; isBlocking = false;
  } else if (bc > 0) {
    status = "hard-fail"; isBlocking = true;
  } else if (ic > 0 || wc > 0) {
    status = "pass-with-info"; isBlocking = false;
  } else {
    status = "pass"; isBlocking = false;
  }

  return {
    domain: "validation", mode: mode, policyVersion: pv,
    status: status, blocking: isBlocking,
    summary: { total: findings.length, blocking: bc, nonBlocking: nb, unknown: uc, errors: ec, warnings: wc, info: ic },
    results: classified
  };
}

/**
 * Validate policy integrity.
 * @returns {Object} Validation result
 */
function validateStrictPolicy() {
  var errors = [];
  if (typeof STRICT_POLICY_VERSION !== "number" || STRICT_POLICY_VERSION < 1) {
    errors.push("Invalid policy version");
  }
  if (typeof STRICT_POLICY_RULES !== "object" || STRICT_POLICY_RULES === null) {
    errors.push("STRICT_POLICY_RULES is not an object");
  }
  var keys = Object.keys(STRICT_POLICY_RULES);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var r = STRICT_POLICY_RULES[k];
    if (typeof r.softModeBlocking !== "boolean") errors.push(k + ": softModeBlocking not boolean");
    if (typeof r.strictModeBlocking !== "boolean") errors.push(k + ": strictModeBlocking not boolean");
    if (typeof r.severity !== "string" || r.severity.length === 0) errors.push(k + ": severity missing");
    if (typeof r.reason !== "string" || r.reason.length === 0) errors.push(k + ": reason missing");
    if (typeof r.introducedInPolicyVersion !== "number") errors.push(k + ": introducedInPolicyVersion not number");
    if (typeof r.owner !== "string" || r.owner.length === 0) errors.push(k + ": owner missing");
    if (typeof r.reviewRequired !== "boolean") errors.push(k + ": reviewRequired not boolean");
    var rk = Object.keys(r);
    for (var j = 0; j < rk.length; j++) {
      if (typeof r[rk[j]] === "function") errors.push(k + ": function value in " + rk[j]);
    }
  }
  return { valid: errors.length === 0, errorCount: errors.length, errors: errors, ruleCount: keys.length };
}

/**
 * Get deterministic policy summary.
 * @returns {Object} Summary
 */
function getStrictPolicySummary() {
  var keys = Object.keys(STRICT_POLICY_RULES).slice().sort();
  var sbc = [], snbc = [], sbc2 = [];
  for (var i = 0; i < keys.length; i++) {
    var r = STRICT_POLICY_RULES[keys[i]];
    if (r.strictModeBlocking) sbc.push(keys[i]); else snbc.push(keys[i]);
    if (r.softModeBlocking) sbc2.push(keys[i]);
  }
  return {
    policyVersion: STRICT_POLICY_VERSION, totalRules: keys.length,
    strictBlockingCodes: sbc, strictNonBlockingCodes: snbc,
    softBlockingCodes: sbc2, unknownDefaultBlocking: false
  };
}

module.exports = {
  STRICT_POLICY_VERSION: STRICT_POLICY_VERSION,
  STRICT_POLICY_RULES: STRICT_POLICY_RULES,
  STRICT_POLICY_STATUS: STRICT_POLICY_STATUS,
  getStrictPolicyRule: getStrictPolicyRule,
  classifyFindingForMode: classifyFindingForMode,
  applyStrictPolicy: applyStrictPolicy,
  validateStrictPolicy: validateStrictPolicy,
  getStrictPolicySummary: getStrictPolicySummary
};
