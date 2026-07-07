#!/usr/bin/env node
/**
 * Soft Validation Snapshot Writer Skeleton (M10.5)
 *
 * Generates deterministic, normalized soft validation report candidates
 * from canonical fixtures. Dry-run only — never writes files.
 *
 * NOT wired into package.json, check:all, doctor, or CI.
 *
 * @module soft-validation-snapshot-writer
 */

"use strict";

var fs = require("fs");
var path = require("path");

/* ------------------------------------------------------------------ */
/*  Imports from existing modules                                      */
/* ------------------------------------------------------------------ */

var validator = require("./pack-runtime-context-soft-validator.js");
var writer = require("./soft-validation-report-writer.js");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fixed timestamp for deterministic snapshots. Replaces wall-clock time.
 * @constant {string}
 */
var FIXED_GENERATED_AT = "1970-01-01T00:00:00.000Z";

/**
 * Suffix appended to snapshot filenames.
 * @constant {string}
 */
var SNAPSHOT_SUFFIX = ".report.json";

/**
 * Default fixture root directory (repo-relative).
 * @constant {string}
 */
var DEFAULT_FIXTURE_ROOT = "test/fixtures/pack-runtime-context";

/**
 * Default snapshot root directory (repo-relative).
 * @constant {string}
 */
var DEFAULT_SNAPSHOT_ROOT = "test/snapshots/pack-runtime-context-soft-report";

/**
 * Severity ranking for stable sorting (lower = higher priority).
 * @readonly
 * @constant {Object<string, number>}
 */
var SEVERITY_RANK = {
  error: 0,
  warning: 1,
  info: 2,
};

/* ------------------------------------------------------------------ */
/*  mapFixturePathToSnapshotPath                                       */
/* ------------------------------------------------------------------ */

/**
 * Map a fixture path to its corresponding snapshot target path.
 *
 * Returns a structured object with category, basename, and both paths.
 * Does NOT create directories or write files.
 *
 * @param {string} fixturePath - Repo-relative fixture path (e.g. "test/fixtures/.../valid/minimal-valid.json")
 * @param {object} [options]
 * @param {string} [options.fixtureRoot] - Base fixture directory
 * @param {string} [options.snapshotRoot] - Base snapshot directory
 * @param {string} [options.cwd] - Current working directory (default: process.cwd())
 * @returns {{fixturePath: string, snapshotPath: string, category: string, basename: string}}
 */
function mapFixturePathToSnapshotPath(fixturePath, options) {
  options = options || {};
  var fixtureRoot = options.fixtureRoot || DEFAULT_FIXTURE_ROOT;
  var snapshotRoot = options.snapshotRoot || DEFAULT_SNAPSHOT_ROOT;
  var cwd = options.cwd || process.cwd();

  // Resolve to absolute for safety checks
  var absFixtureRoot = path.resolve(cwd, fixtureRoot);
  var absFixture = path.resolve(cwd, fixturePath);

  // Reject paths outside fixtureRoot
  if (absFixture.indexOf(absFixtureRoot) !== 0) {
    throw new Error(
      "Fixture path must be within fixtureRoot: expected prefix " +
        absFixtureRoot + ", got " + absFixture
    );
  }

  // Must end with .json
  if (!fixturePath.endsWith(".json")) {
    throw new Error(
      "Non-JSON fixture path rejected: " + fixturePath
    );
  }

  // Get the repo-relative path inside fixtureRoot
  var relative = path.relative(absFixtureRoot, absFixture);

  // Extract category (first directory segment)
  var parts = relative.split(path.sep);
  var category = parts[0]; // valid | invalid | edge
  var basename = parts[parts.length - 1].replace(/\.json$/, "") + SNAPSHOT_SUFFIX;

  // Build snapshot path
  var snapshotRelative = path.join(snapshotRoot, category, basename);

  return {
    fixturePath: fixturePath,
    snapshotPath: snapshotRelative,
    category: category,
    basename: basename,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers for summary/status computation                     */
/* ------------------------------------------------------------------ */

/**
 * Compute summary from results array (mirrors writer internals).
 * @param {Array<object>} results
 * @returns {object}
 */
function _computeSummary(results) {
  var infoCount = 0, warningCount = 0, errorCount = 0, gateSet = {};
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (r.severity === "info") infoCount++;
    else if (r.severity === "warning") warningCount++;
    else if (r.severity === "error") errorCount++;
    if (r.gateId && r.gateId !== "UNKNOWN_GATE") gateSet[r.gateId] = true;
  }
  var gates = Object.keys(gateSet).length;
  return { total: results.length, info: infoCount, warnings: warningCount, errors: errorCount, gatesChecked: gates, gatesWithFindings: gates };
}

/**
 * Compute status from summary.
 * @param {object} summary
 * @returns {string}
 */
function _computeStatus(summary) {
  if (summary.errors > 0) return "soft-fail";
  if (summary.warnings > 0) return "pass-with-warnings";
  if (summary.info > 0) return "pass-with-info";
  return "pass";
}

/**
 * Compute severity from summary.
 * @param {object} summary
 * @returns {string}
 */
function _computeSeverity(summary) {
  if (summary.errors > 0) return "error";
  if (summary.warnings > 0) return "warning";
  if (summary.info > 0) return "info";
  return "info";
}

/* ------------------------------------------------------------------ */
/*  normalizeSnapshotMetadata                                           */
/* ------------------------------------------------------------------ */

/**
 * Remove volatile / machine-specific fields from metadata.
 *
 * @param {object} metadata - Raw metadata from report writer
 * @returns {object} Sanitized metadata
 */
function normalizeSnapshotMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  var safe = {};

  // Remove absolute paths
  if (metadata.inputFile && typeof metadata.inputFile === "string") {
    try {
      var resolved = path.resolve(metadata.inputFile);
      // Only keep if it's inside the project (repo-relative)
      var cwd = process.cwd();
      if (resolved.indexOf(cwd) === 0) {
        safe.inputFile = resolved.replace(cwd + path.sep, "");
      } else {
        safe.inputFile = null;
      }
    } catch (e) {
      safe.inputFile = null;
    }
  }

  // Remove volatile fields
  delete safe.cwd;
  delete safe.hostname;
  delete safe.username;
  delete safe.branch;
  delete safe.commit;

  return safe;
}

/* ------------------------------------------------------------------ */
/*  normalizeSnapshotResult                                             */
/* ------------------------------------------------------------------ */

/**
 * Normalize a single result item for deterministic snapshots.
 * Ensures all required fields are present and no volatile values leak.
 *
 * @param {object} result - Raw result from report writer
 * @param {number} index - Position in sorted array
 * @returns {object} Normalized result
 */
function normalizeSnapshotResult(result, index) {
  if (!result || typeof result !== "object") {
    return {
      id: "UNKNOWN:" + index,
      gateId: "UNKNOWN_GATE",
      code: "UNKNOWN_CODE",
      severity: "info",
      message: "",
      path: null,
      expected: null,
      actual: null,
      migrationHint: "",
      sourceDocument: null,
      introducedIn: null,
      blocking: false,
    };
  }

  return {
    id: result.id || ("UNKNOWN:" + index),
    gateId: result.gateId || "UNKNOWN_GATE",
    code: result.code || "UNKNOWN_CODE",
    severity: result.severity || "info",
    message: result.message || "",
    path: result.path || null,
    expected: result.expected || null,
    actual: result.actual || null,
    migrationHint: result.migrationHint || "",
    sourceDocument: result.sourceDocument || null,
    introducedIn: result.introducedIn || null,
    blocking: result.blocking === true ? true : false,
  };
}

/* ------------------------------------------------------------------ */
/*  sortSnapshotResults                                                 */
/* ------------------------------------------------------------------ */

/**
 * Stable sort of results array for deterministic output.
 *
 * Sort priority:
 * 1. severity rank (error > warning > info)
 * 2. gateId
 * 3. code
 * 4. path
 * 5. id
 *
 * Does NOT mutate the input array.
 *
 * @param {Array<object>} results
 * @returns {Array<object>} New sorted array
 */
function sortSnapshotResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  var copy = results.slice();

  copy.sort(function (a, b) {
    var ra = SEVERITY_RANK[a.severity] || 99;
    var rb = SEVERITY_RANK[b.severity] || 99;
    if (ra !== rb) return ra - rb;

    var ga = a.gateId || "";
    var gb = b.gateId || "";
    if (ga !== gb) return ga < gb ? -1 : 1;

    var ca = a.code || "";
    var cb = b.code || "";
    if (ca !== cb) return ca < cb ? -1 : 1;

    var pa = a.path || "";
    var pb = b.path || "";
    if (pa !== pb) return pa < pb ? -1 : 1;

    var ia = a.id || "";
    var ib = b.id || "";
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });

  return copy;
}

/* ------------------------------------------------------------------ */
/*  regenerateFindingIds                                                */
/* ------------------------------------------------------------------ */

/**
 * Regenerate finding IDs after sorting for stability.
 *
 * Format: `${code}:${normalizedPath}:${occurrenceIndex}`
 *
 * @param {Array<object>} sortedResults
 * @returns {Array<object>} New array with regenerated IDs
 */
function regenerateFindingIds(sortedResults) {
  var result = sortedResults.map(function (r, idx) {
    var norm = normalizeSnapshotResult(r, idx);
    var code = norm.code || "UNKNOWN_CODE";
    var normPath = norm.path || "root";
    norm.path = normPath;

    // Count occurrences of same code+path before this index
    var occCount = 0;
    for (var i = 0; i < idx; i++) {
      if (sortedResults[i].code === code && (sortedResults[i].path || "root") === normPath) {
        occCount++;
      }
    }
    norm.id = code + ":" + normPath + ":" + occCount;
    return norm;
  });

  return result;
}

/* ------------------------------------------------------------------ */
/*  createNormalizedSnapshotReport                                      */
/* ------------------------------------------------------------------ */

/**
 * Generate a deterministic snapshot candidate from a fixture.
 *
 * Pipeline:
 * 1. Read fixture JSON
 * 2. Call validatePackRuntimeContext()
 * 3. Call createSoftValidationReport() with fixed timestamp
 * 4. Apply snapshot normalization (timestamp, source, metadata, sorting, IDs)
 * 5. Return candidate object
 *
 * Does NOT write files. Does NOT call process.exit.
 * soft-fail reports are handled normally (exit 0 behavior).
 *
 * @param {string} fixturePath - Repo-relative fixture path
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.fixtureRoot]
 * @param {string} [options.snapshotRoot]
 * @param {string} [options.fixedGeneratedAt] - Default: FIXED_GENERATED_AT
 * @param {boolean} [options.includeTimestamp] - Default: false (fixed timestamp)
 * @param {string} [options.source] - Default: repo-relative fixture path
 * @param {object} [options.metadata] - Additional metadata
 * @returns {{fixture: object, target: object, report: object}}
 */
function createNormalizedSnapshotReport(fixturePath, options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  var fixtureRoot = options.fixtureRoot || DEFAULT_FIXTURE_ROOT;
  var snapshotRoot = options.snapshotRoot || DEFAULT_SNAPSHOT_ROOT;
  var fixedTs = options.fixedGeneratedAt || FIXED_GENERATED_AT;
  var includeTs = options.includeTimestamp !== undefined ? options.includeTimestamp : false;
  var source = options.source || fixturePath;
  var extraMeta = options.metadata || {};

  // 1. Read fixture
  var absFixture = path.resolve(cwd, fixturePath);
  if (!fs.existsSync(absFixture)) {
    throw new Error("Fixture file not found: " + absFixture);
  }

  var raw;
  try {
    raw = fs.readFileSync(absFixture, "utf8");
  } catch (e) {
    throw new Error("Failed to read fixture: " + e.message);
  }

  var ctx;
  try {
    ctx = JSON.parse(raw);
  } catch (e) {
    throw new Error("JSON parse error in " + fixturePath + ": " + e.message);
  }

  // 2. Validate
  var validationResult = validator.validatePackRuntimeContext(ctx, {
    includeTimestamp: includeTs,
    source: source,
  });

  // 3. Create report with normalized options
  var report = writer.createSoftValidationReport(validationResult, {
    includeTimestamp: includeTs,
    generatedAt: fixedTs,
    source: source,
    metadata: normalizeSnapshotMetadata(Object.assign({}, extraMeta, {
      fixturePath: fixturePath,
    })),
  });

  // 4. Normalize report fields
  report.generatedAt = fixedTs;
  report.source = source;
  report.metadata = normalizeSnapshotMetadata(report.metadata || {});
  report.metadata.fixturePath = fixturePath;

  // 5. Sort and regenerate IDs
  var sorted = sortSnapshotResults(report.results || []);
  report.results = regenerateFindingIds(sorted);

  // 6. Recompute summary from normalized results
  report.summary = _computeSummary(report.results);

  // 7. Recompute status/severity from normalized summary
  report.status = _computeStatus(report.summary);
  report.severity = _computeSeverity(report.summary);

  // 8. Map to snapshot path
  var mapping = mapFixturePathToSnapshotPath(fixturePath, {
    cwd: cwd,
    fixtureRoot: fixtureRoot,
    snapshotRoot: snapshotRoot,
  });

  return {
    fixture: {
      path: fixturePath,
      category: mapping.category,
      basename: mapping.basename,
    },
    target: {
      snapshotPath: mapping.snapshotPath,
    },
    report: report,
  };
}

/* ------------------------------------------------------------------ */
/*  serializeSnapshotReport                                             */
/* ------------------------------------------------------------------ */

/**
 * Serialize a normalized snapshot report to a deterministic JSON string.
 *
 * @param {object} report - Report object (from createNormalizedSnapshotReport.report)
 * @param {object} [options]
 * @param {boolean} [options.pretty] - Default: true (2-space indent)
 * @param {boolean} [options.trailingNewline] - Default: true
 * @returns {string} UTF-8 JSON string, no BOM
 */
function serializeSnapshotReport(report, options) {
  options = options || {};
  var pretty = options.pretty !== false; // default true
  var trailingNewline = options.trailingNewline !== false; // default true

  var space = pretty ? 2 : 0;
  var json = JSON.stringify(report, null, space);

  if (trailingNewline) {
    json += "\n";
  }

  return json;
}

/* ------------------------------------------------------------------ */
/*  Exports                                                             */
/* ------------------------------------------------------------------ */

module.exports = {
  FIXED_GENERATED_AT: FIXED_GENERATED_AT,
  SNAPSHOT_SUFFIX: SNAPSHOT_SUFFIX,
  DEFAULT_FIXTURE_ROOT: DEFAULT_FIXTURE_ROOT,
  DEFAULT_SNAPSHOT_ROOT: DEFAULT_SNAPSHOT_ROOT,
  mapFixturePathToSnapshotPath: mapFixturePathToSnapshotPath,
  normalizeSnapshotMetadata: normalizeSnapshotMetadata,
  normalizeSnapshotResult: normalizeSnapshotResult,
  sortSnapshotResults: sortSnapshotResults,
  regenerateFindingIds: regenerateFindingIds,
  createNormalizedSnapshotReport: createNormalizedSnapshotReport,
  serializeSnapshotReport: serializeSnapshotReport,
};
