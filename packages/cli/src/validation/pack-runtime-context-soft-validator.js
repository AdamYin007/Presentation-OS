/**
 * PackRuntimeContext Soft Validator Skeleton
 *
 * This is the first soft validator skeleton for PackRuntimeContext validation.
 * It implements minimal soft checks only — no hard gates, no CI integration,
 * no CLI wiring, no doctor integration.
 *
 * Required top-level sections derived from M8.2 contract schema:
 * identity, metadata, governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation
 *
 * Source document: docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md
 *
 * @module pack-runtime-context-soft-validator
 */

"use strict";

/**
 * Required top-level sections as defined in M8.2 contract schema.
 * Derived from docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md "Required Top-Level Sections".
 * Subject to future hardening — currently checked as soft warnings only.
 *
 * @readonly
 * @type {string[]}
 */
const REQUIRED_TOP_LEVEL_SECTIONS = [
  "identity",
  "metadata",
  "governance",
  "runtime",
  "boundaries",
  "sourceOfTruth",
  "outputPolicy",
  "validation",
];

/**
 * Reserved namespaces that must not be used as top-level keys.
 * Derived from M8.2 "Reserved Future Namespaces" section.
 *
 * @readonly
 * @type {string[]}
 */
const RESERVED_NAMESPACES = ["__internal", "__reserved", "experimental", "deprecated"];

/**
 * Warning codes emitted by this validator.
 *
 * @readonly
 * @type {Record<string, string>}
 */
const CONTRACT_VERSION_WARNING_CODES = {
  ABSENT: "INFO_CONTRACT_VERSION_ABSENT",
  MALFORMED: "WARN_CONTRACT_VERSION_MALFORMED",
};

module.exports = {
  REQUIRED_TOP_LEVEL_SECTIONS,
  RESERVED_NAMESPACES,
  CONTRACT_VERSION_WARNING_CODES,
};
/**
 * Validate a PackRuntimeContext object using soft checks only.
 *
 * Performs minimal structural validation:
 * - Context is a non-null, non-array object
 * - Required top-level sections are present
 * - contractVersion presence/format (warning only)
 * - Reserved namespace usage (warning only)
 *
 * @param {object|null|undefined} context - The PackRuntimeContext to validate
 * @param {object} [options] - Validation options
 * @param {boolean} [options.includeTimestamp=true] - Whether to include checkedAt timestamp
 * @param {string} [options.source=""] - Source identifier for the report
 * @param {boolean} [options.soft=true] - Always soft (warning-only), never hard fail
 * @returns {{ok: boolean, severity: "info"|"warning"|"error", warnings: Array<object>, errors: Array<object>, report: object}}
 */
function validatePackRuntimeContext(context, options) {
  var opts = Object.assign({ includeTimestamp: true, source: "", soft: true }, options || {});

  var warnings = [];
  var errors = [];
  var gates = [];

  // A. Context object check
  if (context === null || typeof context !== "object" || Array.isArray(context)) {
    errors.push({
      code: "ERROR_CONTEXT_NOT_OBJECT",
      severity: "error",
      message: "PackRuntimeContext must be a non-null, non-array object",
      path: "$",
      expected: "object",
      actual: context === null ? "null" : Array.isArray(context) ? "array" : typeof context,
      migrationHint:
        "Ensure context is constructed as a plain object literal or via Object.create(null).",
      sourceDocument: "docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md",
    });
    return buildResult(false, "error", warnings, errors, opts, gates);
  }

  // B. Required top-level sections check
  var i;
  for (i = 0; i < REQUIRED_TOP_LEVEL_SECTIONS.length; i++) {
    var section = REQUIRED_TOP_LEVEL_SECTIONS[i];
    if (!(section in context)) {
      warnings.push({
        code: "WARN_CONTRACT_SECTION_MISSING",
        severity: "warning",
        message: 'Required section "' + section + '" is missing from PackRuntimeContext',
        path: section,
        expected: section + " to be present",
        actual: "absent",
        migrationHint: 'Add "' + section + '" section per M8.2 contract schema.',
        sourceDocument: "docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md",
      });
    }
  }

  // C. contractVersion check (warning only, no semver)
  if (!("contractVersion" in context)) {
    warnings.push({
      code: CONTRACT_VERSION_WARNING_CODES.ABSENT,
      severity: "info",
      message: "contractVersion field is not present in PackRuntimeContext",
      path: "contractVersion",
      expected: "contractVersion string",
      actual: "absent",
      migrationHint:
        "Consider adding contractVersion for future hard gate eligibility (see M9.0 Contract Version Readiness Design).",
      sourceDocument: "docs/M9_CONTRACT_VERSION_READINESS_DESIGN.md",
    });
  } else if (typeof context.contractVersion !== "string") {
    warnings.push({
      code: CONTRACT_VERSION_WARNING_CODES.MALFORMED,
      severity: "warning",
      message: "contractVersion exists but is not a string",
      path: "contractVersion",
      expected: "string",
      actual: typeof context.contractVersion,
      migrationHint: "contractVersion should be a string (e.g., '1.0.0').",
      sourceDocument: "docs/M9_CONTRACT_VERSION_READINESS_DESIGN.md",
    });
  }

  // D. Reserved namespace check
  var topLevelKeys = Object.keys(context);
  for (i = 0; i < topLevelKeys.length; i++) {
    var key = topLevelKeys[i];
    if (RESERVED_NAMESPACES.indexOf(key) !== -1) {
      warnings.push({
        code: "WARN_RESERVED_NAMESPACE_USED",
        severity: "warning",
        message: 'Reserved namespace "' + key + '" is used as a top-level key',
        path: key,
        expected: "non-reserved key",
        actual: key,
        migrationHint: 'Remove "' + key + '" or rename to a non-reserved identifier.',
        sourceDocument: "docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md",
      });
    }
  }

  var hasErrors = errors.length > 0;
  var hasWarnings = warnings.length > 0;
  var ok = !hasErrors;
  var severity = hasErrors ? "error" : hasWarnings ? "warning" : "info";

  return buildResult(ok, severity, warnings, errors, opts, gates);
}

/**
 * Build the final result object with stable shape.
 *
 * @private
 */
function buildResult(ok, severity, warnings, errors, opts, gates) {
  var checkedAt = opts.includeTimestamp ? new Date().toISOString() : null;

  return {
    ok: ok,
    severity: severity,
    warnings: warnings,
    errors: errors,
    report: {
      validatorId: "pack-runtime-context-soft-validator",
      contractName: "PackRuntimeContext",
      contractVersion: null,
      checkedAt: checkedAt,
      gates: gates,
    },
  };
}

module.exports.validatePackRuntimeContext = validatePackRuntimeContext;
