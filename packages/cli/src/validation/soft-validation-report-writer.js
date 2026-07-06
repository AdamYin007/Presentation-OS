/**
 * Soft Validation Report Writer Skeleton
 *
 * Generates normalized report objects from validator results per M9.3 spec.
 * Does NOT write files, does NOT call process.exit, does NOT change doctor/CLI/CI.
 *
 * @module soft-validation-report-writer
 */

"use strict";

/**
 * Report format version. Bump only on breaking field changes.
 * @constant {string}
 */
var REPORT_VERSION = "0.1";

/**
 * Fixed report type identifier.
 * @constant {string}
 */
var REPORT_TYPE = "soft-validation";

/**
 * Status enum values per M9.3 Section 8.
 * @readonly
 * @constant {Object<string, string>}
 */
var REPORT_STATUS = {
  PASS: "pass",
  PASS_WITH_INFO: "pass-with-info",
  PASS_WITH_WARNINGS: "pass-with-warnings",
  SOFT_FAIL: "soft-fail",
  INTERNAL_ERROR: "internal-error",
};

/**
 * Severity enum values per M9.3 Section 9.
 * @readonly
 * @constant {Object<string, string>}
 */
var REPORT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
};

/**
 * Gate ID mapping from validator codes to M9.3 gate IDs.
 * @readonly
 * @constant {Object<string, string>}
 */
var CODE_TO_GATE = {
  "ERROR_CONTEXT_NOT_OBJECT": "CONTEXT_REQUIRED_SECTIONS_GATE",
  "WARN_CONTRACT_SECTION_MISSING": "CONTEXT_REQUIRED_SECTIONS_GATE",
  "INFO_CONTRACT_VERSION_ABSENT": "CONTRACT_VERSION_PRESENT_SOFT_GATE",
  "WARN_CONTRACT_VERSION_MALFORMED": "CONTRACT_VERSION_FORMAT_GATE",
  "WARN_RESERVED_NAMESPACE_USED": "CONTEXT_RESERVED_NAMESPACE_GATE",
};

/**
 * Normalize a validator result into a report result item.
 *
 * @param {object} finding - A single warning or error from the validator
 * @param {number} index - Position index for stable id generation
 * @returns {object}
 */
function normalizeFinding(finding, index) {
  var gateId = CODE_TO_GATE[finding.code] || "UNKNOWN_GATE";
  var id = (finding.code || "FINDING") + ":" + (finding.path || "root") + ":" + index;

  return {
    id: id,
    gateId: gateId,
    code: finding.code || "UNKNOWN_CODE",
    severity: finding.severity || REPORT_SEVERITY.INFO,
    message: finding.message || "",
    path: finding.path || null,
    expected: finding.expected || null,
    actual: finding.actual || null,
    migrationHint: finding.migrationHint || "",
    sourceDocument: finding.sourceDocument || null,
    introducedIn: "M9.2",
    blocking: finding.blocking === true ? true : false,
  };
}

/**
 * Normalize validator warnings and errors into report results array.
 *
 * @param {Array<object>} warnings - Validator warnings
 * @param {Array<object>} errors - Validator errors
 * @returns {Array<object>}
 */
function normalizeResults(warnings, errors) {
  var results = [];
  var i;

  for (i = 0; i < warnings.length; i++) {
    results.push(normalizeFinding(warnings[i], i));
  }
  for (i = 0; i < errors.length; i++) {
    results.push(normalizeFinding(errors[i], i + warnings.length));
  }

  return results;
}

/**
 * Compute summary from results array.
 *
 * @param {Array<object>} results
 * @returns {object}
 */
function computeSummary(results) {
  var infoCount = 0;
  var warningCount = 0;
  var errorCount = 0;
  var gateSet = {};
  var i;

  for (i = 0; i < results.length; i++) {
    var r = results[i];
    if (r.severity === REPORT_SEVERITY.INFO) infoCount++;
    else if (r.severity === REPORT_SEVERITY.WARNING) warningCount++;
    else if (r.severity === REPORT_SEVERITY.ERROR) errorCount++;

    if (r.gateId && r.gateId !== "UNKNOWN_GATE") {
      gateSet[r.gateId] = true;
    }
  }

  return {
    total: results.length,
    info: infoCount,
    warnings: warningCount,
    errors: errorCount,
    gatesChecked: Object.keys(gateSet).length,
    gatesWithFindings: Object.keys(gateSet).length,
  };
}

/**
 * Compute overall status from summary counts.
 *
 * @param {object} summary
 * @returns {string} One of REPORT_STATUS values
 */
function computeStatus(summary) {
  if (summary.errors > 0) return REPORT_STATUS.SOFT_FAIL;
  if (summary.warnings > 0) return REPORT_STATUS.PASS_WITH_WARNINGS;
  if (summary.info > 0) return REPORT_STATUS.PASS_WITH_INFO;
  return REPORT_STATUS.PASS;
}

/**
 * Compute overall severity from summary counts.
 *
 * @param {object} summary
 * @returns {string} One of REPORT_SEVERITY values
 */
function computeSeverity(summary) {
  if (summary.errors > 0) return REPORT_SEVERITY.ERROR;
  if (summary.warnings > 0) return REPORT_SEVERITY.WARNING;
  if (summary.info > 0) return REPORT_SEVERITY.INFO;
  return REPORT_SEVERITY.INFO;
}

/**
 * Normalize a validator result object into a consistent shape.
 *
 * Accepts the output of validatePackRuntimeContext or a similar object.
 *
 * @param {object} result - Validator result with warnings/errors arrays
 * @returns {{warnings: Array<object>, errors: Array<object>, ok: boolean, severity: string}}
 */
function normalizeInput(result) {
  if (!result || typeof result !== "object") {
    return {
      warnings: [{ code: "ERROR_VALIDATOR_INTERNAL", severity: REPORT_SEVERITY.ERROR, message: "Input is null or not an object", path: "$", expected: "object", actual: typeof result, migrationHint: "Pass a valid validator result object.", sourceDocument: "docs/M9_SOFT_VALIDATION_REPORT_FORMAT_DESIGN.md" }],
      errors: [],
      ok: false,
      severity: REPORT_SEVERITY.ERROR,
    };
  }

  return {
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    errors: Array.isArray(result.errors) ? result.errors : [],
    ok: result.ok !== false,
    severity: result.severity || REPORT_SEVERITY.INFO,
  };
}

/**
 * Create a soft validation report from a validator result.
 *
 * @param {object} input - Validator result or plain object with warnings/errors
 * @param {object} [options]
 * @param {boolean} [options.includeTimestamp=true]
 * @param {string} [options.generatedAt]
 * @param {string} [options.source]
 * @param {object} [options.metadata]
 * @returns {object} Report per M9.3 Section 6-7
 */
function createSoftValidationReport(input, options) {
  var opts = Object.assign(
    { includeTimestamp: true, generatedAt: null, source: "", metadata: {} },
    options || {}
  );

  var normalized = normalizeInput(input);
  var results = normalizeResults(normalized.warnings, normalized.errors);
  var summary = computeSummary(results);
  var status = computeStatus(summary);
  var severity = computeSeverity(summary);
  var generatedAt = opts.generatedAt || (opts.includeTimestamp ? new Date().toISOString() : null);

  var validatorId = "";
  var contractName = "PackRuntimeContext";
  var contractVersion = null;

  if (input && input.report) {
    validatorId = input.report.validatorId || "";
    contractName = input.report.contractName || contractName;
    contractVersion = input.report.contractVersion || null;
  }

  return {
    reportVersion: REPORT_VERSION,
    reportType: REPORT_TYPE,
    validatorId: validatorId,
    contractName: contractName,
    contractVersion: contractVersion,
    status: status,
    severity: severity,
    generatedAt: generatedAt,
    source: opts.source || "",
    summary: summary,
    results: results,
    metadata: opts.metadata || {},
  };
}

/**
 * Serialize a report object to a JSON string.
 *
 * @param {object} report - Report object from createSoftValidationReport
 * @param {object} [options]
 * @param {boolean} [options.pretty=true]
 * @returns {string}
 */
function serializeSoftValidationReport(report, options) {
  var opts = Object.assign({ pretty: true }, options || {});
  var space = opts.pretty ? 2 : 0;
  return JSON.stringify(report, null, space);
}

module.exports = {
  createSoftValidationReport,
  serializeSoftValidationReport,
  normalizeSoftValidationResult: normalizeResults,
  REPORT_VERSION: REPORT_VERSION,
  REPORT_TYPE: REPORT_TYPE,
  REPORT_STATUS: REPORT_STATUS,
  REPORT_SEVERITY: REPORT_SEVERITY,
};
