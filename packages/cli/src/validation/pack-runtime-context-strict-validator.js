/**
 * PackRuntimeContext Strict Validation Layer
 *
 * A library-only strict validation layer that composes the existing soft validator
 * with the strict policy module for mode-specific blocking classification.
 *
 * This module does NOT:
 * - Modify soft validator
 * - Modify strict policy module
 * - Write files (fs)
 * - Read process.env
 * - Use Date, Math.random, or network
 * - Import snapshot or comparator
 * - Add CLI, package script, or CI integration
 *
 * @module pack-runtime-context-strict-validator
 */

"use strict";

var softValidator = require("./pack-runtime-context-soft-validator");
var strictPolicy = require("./pack-runtime-context-strict-policy");

/**
 * Strict validation mode constants.
 * @enum {string}
 */
var STRICT_VALIDATION_MODE = Object.freeze({
  SOFT: "soft",
  STRICT: "strict",
});

/**
 * Strict validation status constants.
 * @enum {string}
 */
var STRICT_VALIDATION_STATUS = Object.freeze({
  PASS: "pass",
  PASS_WITH_INFO: "pass-with-info",
  SOFT_FAIL: "soft-fail",
  HARD_FAIL: "hard-fail",
  INTERNAL_ERROR: "internal-error",
});

module.exports = {
  STRICT_VALIDATION_MODE: STRICT_VALIDATION_MODE,
  STRICT_VALIDATION_STATUS: STRICT_VALIDATION_STATUS,
};

/**
 * Validate a PackRuntimeContext with configurable mode.
 *
 * Soft mode: delegates to existing soft validator, never blocks.
 * Strict mode: soft validator + policy classification, blocks per policy.
 *
 * @param {object|null|undefined} context - The PackRuntimeContext to validate
 * @param {object} [options] - Options
 * @param {string} [options.mode="soft"] - Operating mode
 * @param {boolean} [options.includeTimestamp=true] - Include checkedAt
 * @returns {object} Structured validation result
 */
function validatePackRuntimeContext(context, options) {
  var opts = Object.assign(
    { mode: "soft", includeTimestamp: true },
    options || {}
  );

  var mode = opts.mode === "strict" ? "strict" : "soft";

  try {
    var softReport = softValidator.validatePackRuntimeContext(context, {
      includeTimestamp: opts.includeTimestamp,
    });

    if (mode === "soft") {
      return buildSoftResult(softReport);
    }

    return buildStrictResult(softReport);
  } catch (err) {
    return {
      domain: "validation",
      mode: mode,
      status: STRICT_VALIDATION_STATUS.INTERNAL_ERROR,
      blocking: false,
      policyVersion: strictPolicy.STRICT_POLICY_VERSION,
      summary: { total: 0, blocking: 0, nonBlocking: 0, unknown: 0, errors: 0, warnings: 0, info: 0 },
      results: [],
      error: "Internal validation error",
    };
  }
}

/**
 * Build soft mode result (always non-blocking).
 */
function buildSoftResult(softReport) {
  var errors = softReport.errors || [];
  var warnings = softReport.warnings || [];
  var totalErrors = errors.length;
  var totalWarnings = warnings.length;

  // Preserve the original soft validator status mapping:
  // - ok=true + severity="warning" → pass-with-info (info-only findings)
  // - ok=true + severity="info" → pass
  // - ok=false → soft-fail
  var status;
  if (!softReport.ok) {
    status = STRICT_VALIDATION_STATUS.SOFT_FAIL;
  } else if (totalErrors > 0 && totalWarnings === 0) {
    // Should not happen per current soft validator, but handle it
    status = STRICT_VALIDATION_STATUS.SOFT_FAIL;
  } else if (totalWarnings > 0 || totalErrors > 0) {
    status = STRICT_VALIDATION_STATUS.PASS_WITH_INFO;
  } else {
    status = STRICT_VALIDATION_STATUS.PASS;
  }

  return {
    domain: "validation",
    mode: "soft",
    status: status,
    blocking: false,
    policyVersion: 0,
    summary: {
      total: totalErrors + totalWarnings,
      blocking: 0,
      nonBlocking: totalErrors + totalWarnings,
      unknown: 0,
      errors: totalErrors,
      warnings: totalWarnings,
      info: 0,
    },
    results: cloneFindings(warnings),
    warnings: warnings,
    errors: errors,
    ok: softReport.ok,
    severity: softReport.severity,
  };
}

/**
 * Build strict mode result (policy-driven blocking).
 */
function buildStrictResult(softReport) {
  var policyResult = strictPolicy.applyStrictPolicy(softReport, { mode: "strict" });
  var summary = policyResult.summary;
  var status = policyResult.blocking
    ? STRICT_VALIDATION_STATUS.HARD_FAIL
    : summary.info > 0 || summary.warnings > 0
    ? STRICT_VALIDATION_STATUS.PASS_WITH_INFO
    : summary.total === 0
    ? STRICT_VALIDATION_STATUS.PASS
    : STRICT_VALIDATION_STATUS.SOFT_FAIL;

  return {
    domain: "validation",
    mode: "strict",
    status: status,
    blocking: policyResult.blocking,
    policyVersion: strictPolicy.STRICT_POLICY_VERSION,
    summary: summary,
    results: policyResult.results || [],
  };
}

/**
 * Clone findings array without mutating originals.
 */
function cloneFindings(arr) {
  if (!Array.isArray(arr)) return [];
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    result.push(Object.assign({}, arr[i]));
  }
  return result;
}

/**
 * Force strict mode — caller cannot override back to soft.
 */
function validatePackRuntimeContextStrict(context, options) {
  return validatePackRuntimeContext(context, Object.assign({}, options || {}, { mode: "strict" }));
}

/**
 * Format a strict validation result as deterministic human-readable text.
 *
 * @param {object} result - The structured result from validatePackRuntimeContext
 * @param {object} [options] - Options
 * @param {number} [options.maxFindings=10] - Maximum findings to display
 * @returns {string} Deterministic formatted output
 */
function formatStrictValidationResult(result, options) {
  var opts = Object.assign({ maxFindings: 10 }, options || {});
  var lines = [];
  var status = result && result.status ? result.status : "unknown";

  if (status === "hard-fail") {
    lines.push("PackRuntimeContext strict validation failed");
  } else if (status === "pass-with-info") {
    lines.push("PackRuntimeContext strict validation passed with informational findings");
  } else if (status === "soft-fail") {
    lines.push("PackRuntimeContext soft validation failed (non-blocking in strict mode)");
  } else if (status === "pass") {
    lines.push("PackRuntimeContext strict validation passed");
  } else {
    lines.push("PackRuntimeContext strict validation: " + status);
  }

  lines.push("Domain: " + (result && result.domain ? result.domain : "validation"));
  lines.push("Mode: " + (result && result.mode ? result.mode : "soft"));
  lines.push("Status: " + status);

  if (result && result.summary) {
    var s = result.summary;
    lines.push("Blocking findings: " + (s.blocking || 0));
    lines.push("Non-blocking findings: " + (s.nonBlocking || 0));
    lines.push("Unknown findings: " + (s.unknown || 0));
  }

  if (result && result.results && Array.isArray(result.results)) {
    var max = Math.min(opts.maxFindings, result.results.length);
    for (var i = 0; i < max; i++) {
      var r = result.results[i];
      if (r && r.code) {
        var reason = r.reason || "";
        lines.push("- " + r.code + (reason ? ": " + reason : ""));
      }
    }
    if (result.results.length > max) {
      lines.push("- ... (" + (result.results.length - max) + " more)");
    }
  }

  return lines.join("\n");
}

module.exports.validatePackRuntimeContext = validatePackRuntimeContext;
module.exports.validatePackRuntimeContextStrict = validatePackRuntimeContextStrict;
module.exports.formatStrictValidationResult = formatStrictValidationResult;
