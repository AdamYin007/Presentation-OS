#!/usr/bin/env node
/**
 * Soft Validation Snapshot Comparator Module Skeleton (M10.8)
 *
 * Read-only, single-fixture comparator. Regenerates deterministic candidate
 * reports from canonical fixtures and compares them against committed snapshots
 * WITHOUT modifying any files.
 *
 * This module is a skeleton — it does NOT implement:
 * - --all, --update, comparator CLI, package script
 * - orphan snapshot scanning
 * - check:all / doctor / CI integration
 *
 * Run: require('./packages/cli/src/validation/soft-validation-snapshot-comparator.js')
 */

"use strict";

var fs = require("fs");
var path = require("path");

/* ------------------------------------------------------------------ */
/*  Dependencies — uses existing snapshot writer module                */
/* ------------------------------------------------------------------ */

var SNAPSHOT_WRITER = require("./soft-validation-snapshot-writer.js");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Frozen status constants for comparator results.
 */
var SNAPSHOT_COMPARE_STATUS = Object.freeze({
  MATCH: "match",
  MISSING_SNAPSHOT: "missing-snapshot",
  INVALID_SNAPSHOT_JSON: "invalid-snapshot-json",
  CONTENT_DRIFT: "content-drift",
  FORMAT_DRIFT: "format-drift",
  FIXTURE_READ_ERROR: "fixture-read-error",
  FIXTURE_JSON_ERROR: "fixture-json-error",
  CANDIDATE_GENERATION_ERROR: "candidate-generation-error",
  INTERNAL_ERROR: "internal-error",
  ORPHAN_SNAPSHOT: "orphan-snapshot",
});

/**
 * Maximum number of difference items to collect per comparison.
 */
var DEFAULT_MAX_DIFFERENCES = 10;

/**
 * Maximum length for string values in difference items.
 */
var DEFAULT_MAX_VALUE_LENGTH = 200;

/* ------------------------------------------------------------------ */
/*  classifySnapshotDifference                                         */
/* ------------------------------------------------------------------ */

/**
 * Classify comparison outcome based on semantic and byte equality.
 *
 * @param {boolean} semanticEqual
 * @param {boolean} byteEqual
 * @returns {string} One of SNAPSHOT_COMPARE_STATUS values
 */
function classifySnapshotDifference(semanticEqual, byteEqual) {
  if (semanticEqual && byteEqual) {
    return SNAPSHOT_COMPARE_STATUS.MATCH;
  }
  if (semanticEqual && !byteEqual) {
    return SNAPSHOT_COMPARE_STATUS.FORMAT_DRIFT;
  }
  if (!semanticEqual && !byteEqual) {
    return SNAPSHOT_COMPARE_STATUS.CONTENT_DRIFT;
  }
  // semanticEqual true but byteEqual false is impossible
  // (semantic equality implies identical content → identical bytes)
  return SNAPSHOT_COMPARE_STATUS.INTERNAL_ERROR;
}

/* ------------------------------------------------------------------ */
/*  collectSnapshotDifferences                                         */
/* ------------------------------------------------------------------ */

/**
 * Collect structured difference items between expected and actual objects.
 *
 * @param {object} expected - Parsed expected (committed snapshot)
 * @param {object} actual - Parsed actual (regenerated candidate)
 * @param {object} [options]
 * @param {number} [options.maxDifferences] - Default: 10
 * @param {number} [options.maxValueLength] - Default: 200
 * @returns {Array<{path: string, expected: *, actual: *, kind: string}>}
 */
function collectSnapshotDifferences(expected, actual, options) {
  options = options || {};
  var maxDiffs = options.maxDifferences || DEFAULT_MAX_DIFFERENCES;
  var maxValLen = options.maxValueLength || DEFAULT_MAX_VALUE_LENGTH;
  var differences = [];

  function truncate(val) {
    if (typeof val === "string" && val.length > maxValLen) {
      return val.substring(0, maxValLen) + "…";
    }
    return val;
  }

  function walk(eObj, aObj, prefix) {
    if (differences.length >= maxDiffs) return;

    // Handle null/undefined
    if (eObj === null || eObj === undefined) {
      if (aObj === null || aObj === undefined) return;
      differences.push({
        path: prefix || "root",
        expected: truncate(eObj),
        actual: truncate(aObj),
        kind: "value-changed",
      });
      return;
    }
    if (aObj === null || aObj === undefined) {
      differences.push({
        path: prefix || "root",
        expected: truncate(eObj),
        actual: truncate(aObj),
        kind: "missing-in-actual",
      });
      return;
    }

    var eType = typeof eObj;
    var aType = typeof aObj;

    // Type mismatch
    if (eType !== aType) {
      differences.push({
        path: prefix || "root",
        expected: truncate(eObj),
        actual: truncate(aObj),
        kind: "type-changed",
      });
      return;
    }

    // Primitives
    if (eType !== "object") {
      if (eObj !== aObj) {
        differences.push({
          path: prefix || "root",
          expected: truncate(eObj),
          actual: truncate(aObj),
          kind: "value-changed",
        });
      }
      return;
    }

    // Arrays
    if (Array.isArray(eObj)) {
      if (!Array.isArray(aObj)) {
        differences.push({
          path: prefix || "root",
          expected: truncate("[array]"),
          actual: truncate(aObj),
          kind: "type-changed",
        });
        return;
      }
      if (eObj.length !== aObj.length) {
        differences.push({
          path: prefix || "root",
          expected: truncate(eObj.length),
          actual: truncate(aObj.length),
          kind: "array-length-changed",
        });
      }
      var len = Math.min(eObj.length, aObj.length);
      for (var i = 0; i < len; i++) {
        var ap = (prefix ? prefix + "[" + i + "]" : "[" + i + "]");
        walk(eObj[i], aObj[i], ap);
      }
      return;
    }

    // Objects
    if (!Array.isArray(eObj) && typeof eObj === "object") {
      var eKeys = Object.keys(eObj).sort();
      var aKeys = Object.keys(aObj).sort();

      // Missing keys in actual
      for (var i = 0; i < eKeys.length; i++) {
        var ek = eKeys[i];
        var found = false;
        for (var j = 0; j < aKeys.length; j++) {
          if (aKeys[j] === ek) { found = true; break; }
        }
        if (!found) {
          differences.push({
            path: (prefix ? prefix + "." : "") + ek,
            expected: truncate(eObj[ek]),
            actual: truncate(undefined),
            kind: "missing-in-actual",
          });
        }
      }

      // Unexpected keys in actual
      for (var i = 0; i < aKeys.length; i++) {
        var ak = aKeys[i];
        var found2 = false;
        for (var j = 0; j < eKeys.length; j++) {
          if (eKeys[j] === ak) { found2 = true; break; }
        }
        if (!found2) {
          differences.push({
            path: (prefix ? prefix + "." : "") + ak,
            expected: truncate(undefined),
            actual: truncate(aObj[ak]),
            kind: "unexpected-in-actual",
          });
        }
      }

      // Common keys
      for (var i = 0; i < eKeys.length; i++) {
        var ek2 = eKeys[i];
        var found3 = false;
        for (var j = 0; j < aKeys.length; j++) {
          if (aKeys[j] === ek2) { found3 = true; break; }
        }
        if (found3) {
          var cp = (prefix ? prefix + "." : "") + ek2;
          walk(eObj[ek2], aObj[ek2], cp);
        }
      }
      return;
    }

    // Fallback: primitives
    if (eObj !== aObj) {
      differences.push({
        path: prefix || "root",
        expected: truncate(eObj),
        actual: truncate(aObj),
        kind: "value-changed",
      });
    }
  }

  walk(expected, actual, "");
  return differences;
}

/* ------------------------------------------------------------------ */
/*  compareSnapshotObjects                                              */
/* ------------------------------------------------------------------ */

/**
 * Perform semantic comparison between expected and actual snapshot objects.
 *
 * @param {object} expected - Parsed committed snapshot
 * @param {object} actual - Parsed regenerated candidate
 * @param {object} [options]
 * @param {number} [options.maxDifferences]
 * @param {number} [options.maxValueLength]
 * @returns {{semanticEqual: boolean, differences: Array}}
 */
function compareSnapshotObjects(expected, actual, options) {
  var diffs = collectSnapshotDifferences(expected, actual, options);
  return {
    semanticEqual: diffs.length === 0,
    differences: diffs,
  };
}

/* ------------------------------------------------------------------ */
/*  formatSnapshotDifference                                            */
/* ------------------------------------------------------------------ */

/**
 * Produce a concise human-readable string for a comparison result.
 *
 * @param {object} result - Result from compareSnapshotForFixture
 * @param {object} [options]
 * @param {number} [options.maxDifferences]
 * @returns {string}
 */
function formatSnapshotDifference(result, options) {
  options = options || {};
  var maxDiffs = options.maxDifferences || DEFAULT_MAX_DIFFERENCES;
  var lines = [];

  if (result.status === SNAPSHOT_COMPARE_STATUS.MATCH) {
    lines.push("Snapshot match");
    lines.push("Fixture: " + result.fixturePath);
    lines.push("Snapshot: " + result.snapshotPath);
    lines.push("Report status: " + (result.reportStatus || "unknown"));
    lines.push("Semantic equal: yes");
    lines.push("Byte equal: yes");
  } else if (result.status === SNAPSHOT_COMPARE_STATUS.MISSING_SNAPSHOT) {
    lines.push("Missing snapshot");
    lines.push("Fixture: " + result.fixturePath);
    lines.push("Expected snapshot: " + result.snapshotPath);
    lines.push("");
    lines.push("Run explicitly to create:");
    lines.push("  node scripts/write-pack-runtime-context-snapshots.cjs --fixture " + result.fixturePath + " --update");
  } else if (result.status === SNAPSHOT_COMPARE_STATUS.INVALID_SNAPSHOT_JSON) {
    lines.push("Invalid snapshot JSON");
    lines.push("Fixture: " + result.fixturePath);
    lines.push("Snapshot: " + result.snapshotPath);
    if (result.differences && result.differences.length > 0) {
      lines.push("Error: " + result.differences[0].message);
    }
  } else if (result.status === SNAPSHOT_COMPARE_STATUS.CONTENT_DRIFT) {
    lines.push("Snapshot content drift");
    lines.push("Fixture: " + result.fixturePath);
    lines.push("Snapshot: " + result.snapshotPath);
    lines.push("Report status: " + (result.reportStatus || "unknown"));
    lines.push("Semantic equal: no");
    lines.push("Byte equal: no");
    var diffCount = result.differences ? result.differences.length : 0;
    lines.push("Differences: " + diffCount);
    var showDiffs = result.differences ? result.differences.slice(0, maxDiffs) : [];
    for (var i = 0; i < showDiffs.length; i++) {
      var d = showDiffs[i];
      var expStr = d.expected === undefined ? "null" : JSON.stringify(d.expected);
      var actStr = d.actual === undefined ? "null" : JSON.stringify(d.actual);
      lines.push("  - " + d.path + ": expected " + expStr + ", actual " + actStr);
    }
    lines.push("");
    lines.push("snapshot verification failed; review required");
  } else if (result.status === SNAPSHOT_COMPARE_STATUS.FORMAT_DRIFT) {
    lines.push("Snapshot format drift");
    lines.push("Fixture: " + result.fixturePath);
    lines.push("Snapshot: " + result.snapshotPath);
    lines.push("Report status: " + (result.reportStatus || "unknown"));
    lines.push("Semantic equal: yes");
    lines.push("Byte equal: no");
    lines.push("");
    lines.push("format drift is not a hard contract failure");
  } else {
    lines.push("Comparison error: " + result.status);
    lines.push("Fixture: " + result.fixturePath);
    if (result.differences && result.differences.length > 0) {
      lines.push("Details: " + result.differences[0].message);
    }
  }

  if (result.migrationHint) {
    lines.push("");
    lines.push("Migration hint: " + result.migrationHint);
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  compareSnapshotForFixture                                           */
/* ------------------------------------------------------------------ */

/**
 * Compare a regenerated candidate report against the committed snapshot
 * for a given fixture.
 *
 * Read-only — never writes, creates, or modifies files.
 *
 * @param {string} fixturePath - Repo-relative path to fixture JSON
 * @param {object} [options]
 * @param {string} [options.cwd] - Default: process.cwd()
 * @param {string} [options.fixtureRoot]
 * @param {string} [options.snapshotRoot]
 * @param {boolean} [options.includeDiff] - Default: true
 * @param {number} [options.maxDifferences] - Default: 10
 * @param {number} [options.maxValueLength] - Default: 200
 * @returns {object} Structured comparison result
 */
function compareSnapshotForFixture(fixturePath, options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  var fixtureRoot = options.fixtureRoot || SNAPSHOT_WRITER.DEFAULT_FIXTURE_ROOT;
  var snapshotRoot = options.snapshotRoot || SNAPSHOT_WRITER.DEFAULT_SNAPSHOT_ROOT;
  var includeDiff = options.includeDiff !== false;
  var maxDiffs = options.maxDifferences || DEFAULT_MAX_DIFFERENCES;
  var maxValLen = options.maxValueLength || DEFAULT_MAX_VALUE_LENGTH;

  var result = {
    fixturePath: fixturePath,
    snapshotPath: null,
    reportStatus: null,
    semanticEqual: false,
    byteEqual: false,
    expectedBytes: 0,
    actualBytes: 0,
    differences: [],
    migrationHint: null,
  };

  // Step 1: Map fixture → snapshot path
  var mapping;
  try {
    mapping = SNAPSHOT_WRITER.mapFixturePathToSnapshotPath(fixturePath, {
      fixtureRoot: fixtureRoot,
      snapshotRoot: snapshotRoot,
      cwd: cwd,
    });
    result.snapshotPath = mapping.snapshotPath;
  } catch (e) {
    result.status = SNAPSHOT_COMPARE_STATUS.FIXTURE_READ_ERROR;
    result.migrationHint = "Fix fixture path: " + e.message;
    return result;
  }

  // Step 2: Generate candidate report
  var candidate;
  try {
    candidate = SNAPSHOT_WRITER.createNormalizedSnapshotReport(fixturePath, {
      fixtureRoot: fixtureRoot,
      snapshotRoot: snapshotRoot,
      cwd: cwd,
    });
    result.reportStatus = candidate.report.status;
    result.actualBytes = candidate.report._snapshotBytes || 0;
  } catch (e) {
    result.status = SNAPSHOT_COMPARE_STATUS.CANDIDATE_GENERATION_ERROR;
    result.migrationHint = "Failed to generate candidate: " + e.message;
    return result;
  }

  // Step 3: Compute actual bytes from serialization
  var serializedCandidate = SNAPSHOT_WRITER.serializeSnapshotReport(candidate.report, {
    pretty: true,
    trailingNewline: true,
  });
  result.actualBytes = Buffer.byteLength(serializedCandidate, "utf8");

  // Step 4: Read committed snapshot
  var absSnapshotPath = path.resolve(cwd, mapping.snapshotPath);
  if (!fs.existsSync(absSnapshotPath)) {
    result.status = SNAPSHOT_COMPARE_STATUS.MISSING_SNAPSHOT;
    result.migrationHint = "Run: node scripts/write-pack-runtime-context-snapshots.cjs --fixture " + fixturePath + " --update";
    return result;
  }

  var snapshotRaw;
  try {
    snapshotRaw = fs.readFileSync(absSnapshotPath, "utf8");
  } catch (e) {
    result.status = SNAPSHOT_COMPARE_STATUS.FIXTURE_READ_ERROR;
    result.migrationHint = "Cannot read snapshot: " + e.message;
    return result;
  }

  var snapshotParsed;
  try {
    snapshotParsed = JSON.parse(snapshotRaw);
  } catch (e) {
    result.status = SNAPSHOT_COMPARE_STATUS.INVALID_SNAPSHOT_JSON;
    result.differences = [{
      path: "root",
      expected: "valid JSON",
      actual: "parse error",
      kind: "type-changed",
      message: e.message,
    }];
    return result;
  }

  // Step 5: Semantic comparison
  var semanticResult;
  if (includeDiff) {
    semanticResult = compareSnapshotObjects(snapshotParsed, candidate.report, {
      maxDifferences: maxDiffs,
      maxValueLength: maxValLen,
    });
    result.differences = semanticResult.differences;
  } else {
    semanticResult = { semanticEqual: true, differences: [] };
    // Still need a quick equality check without collecting diffs
    try {
      var eq = JSON.stringify(snapshotParsed) === JSON.stringify(candidate.report);
      semanticResult.semanticEqual = eq;
    } catch (_) {
      semanticResult.semanticEqual = false;
    }
  }

  result.semanticEqual = semanticResult.semanticEqual;

  // Step 6: Byte comparison
  var serializedCommitted = snapshotRaw;
  result.expectedBytes = Buffer.byteLength(serializedCommitted, "utf8");
  result.byteEqual = (result.expectedBytes === result.actualBytes) &&
    (serializedCommitted === serializedCandidate);

  // Step 7: Classify
  result.status = classifySnapshotDifference(result.semanticEqual, result.byteEqual);

  return result;
}

/* ------------------------------------------------------------------ */
/*  discoverFixtureFiles                                                */
/* ------------------------------------------------------------------ */

/**
 * Recursively discover all .json files under a directory.
 * Ignores hidden files, symlinks, README, .gitkeep.
 * Returns sorted array of repo-relative paths.
 */
function discoverFixtureFiles(fixtureRoot, cwd) {
  var absRoot = path.resolve(cwd, fixtureRoot);
  var results = [];

  function walk(relPrefix) {
    var entries = fs.readdirSync(path.join(absRoot, relPrefix || ""), { withFileTypes: true });
    entries.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry.name.charAt(0) === ".") continue;
      if (entry.name === "README.md" || entry.name === ".gitkeep") continue;
      var rel = relPrefix ? relPrefix + "/" + entry.name : entry.name;
      var abs = path.join(absRoot, rel);
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push(rel);
      }
    }
  }

  walk("");
  // Prepend fixtureRoot to make them repo-relative
  for (var i = 0; i < results.length; i++) {
    results[i] = fixtureRoot + "/" + results[i];
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  findOrphanSnapshots                                                 */
/* ------------------------------------------------------------------ */

/**
 * Find snapshot files with no corresponding fixture.
 * Read-only — never deletes files.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.fixtureRoot]
 * @param {string} [options.snapshotRoot]
 * @returns {Array} Sorted array of orphan snapshot paths
 */
function findOrphanSnapshots(options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  var fixtureRoot = options.fixtureRoot || SNAPSHOT_WRITER.DEFAULT_FIXTURE_ROOT;
  var snapshotRoot = options.snapshotRoot || SNAPSHOT_WRITER.DEFAULT_SNAPSHOT_ROOT;

  // Build set of expected snapshot paths
  var expectedSnapshots = new Set();
  var fixtureFiles = discoverFixtureFiles(fixtureRoot, cwd);
  for (var i = 0; i < fixtureFiles.length; i++) {
    var mapping = SNAPSHOT_WRITER.mapFixturePathToSnapshotPath(fixtureFiles[i], {
      fixtureRoot: fixtureRoot,
      snapshotRoot: snapshotRoot,
      cwd: cwd,
    });
    expectedSnapshots.add(mapping.snapshotPath);
  }

  // Discover actual snapshot files
  var absSnapRoot = path.resolve(cwd, snapshotRoot);
  var orphans = [];

  function walkSnap(relPrefix) {
    var entries = fs.readdirSync(path.join(absSnapRoot, relPrefix || ""), { withFileTypes: true });
    entries.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry.name.charAt(0) === ".") continue;
      if (entry.name === "README.md" || entry.name === ".gitkeep") continue;
      var rel = relPrefix ? relPrefix + "/" + entry.name : entry.name;
      var abs = path.join(absSnapRoot, rel);
      if (entry.isDirectory()) {
        walkSnap(rel);
      } else if (entry.isFile() && entry.name.endsWith(".report.json")) {
        // Prepend snapshotRoot to make repo-relative
        var fullPath = snapshotRoot + "/" + rel;
        if (!expectedSnapshots.has(fullPath)) {
          orphans.push(fullPath);
        }
      }
    }
  }

  walkSnap("");
  orphans.sort();
  return orphans;
}

/* ------------------------------------------------------------------ */
/*  compareAllSnapshots                                                 */
/* ------------------------------------------------------------------ */

/**
 * Compare all fixtures against their committed snapshots.
 *
 * Read-only — never writes files.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.fixtureRoot]
 * @param {string} [options.snapshotRoot]
 * @param {boolean} [options.includeDiff]
 * @param {number} [options.maxDifferences]
 * @param {number} [options.maxValueLength]
 * @param {boolean} [options.detectOrphans]
 * @returns {object} Structured comparison result
 */
function compareAllSnapshots(options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  var fixtureRoot = options.fixtureRoot || SNAPSHOT_WRITER.DEFAULT_FIXTURE_ROOT;
  var snapshotRoot = options.snapshotRoot || SNAPSHOT_WRITER.DEFAULT_SNAPSHOT_ROOT;
  var includeDiff = options.includeDiff !== false;
  var maxDiffs = options.maxDifferences || DEFAULT_MAX_DIFFERENCES;
  var maxValLen = options.maxValueLength || DEFAULT_MAX_VALUE_LENGTH;
  var detectOrphans = options.detectOrphans !== false;

  var fixtureFiles = discoverFixtureFiles(fixtureRoot, cwd);
  var results = [];
  var summary = {
    total: fixtureFiles.length,
    matched: 0,
    missingSnapshots: 0,
    invalidSnapshots: 0,
    contentDrift: 0,
    formatDrift: 0,
    fixtureErrors: 0,
    candidateErrors: 0,
    orphanSnapshots: 0,
    failed: 0,
  };

  for (var i = 0; i < fixtureFiles.length; i++) {
    var r = compareSnapshotForFixture(fixtureFiles[i], {
      cwd: cwd,
      fixtureRoot: fixtureRoot,
      snapshotRoot: snapshotRoot,
      includeDiff: includeDiff,
      maxDifferences: maxDiffs,
      maxValueLength: maxValLen,
    });

    results.push(r);

    if (r.status === SNAPSHOT_COMPARE_STATUS.MATCH) {
      summary.matched++;
    } else if (r.status === SNAPSHOT_COMPARE_STATUS.MISSING_SNAPSHOT) {
      summary.missingSnapshots++;
      summary.failed++;
    } else if (r.status === SNAPSHOT_COMPARE_STATUS.INVALID_SNAPSHOT_JSON) {
      summary.invalidSnapshots++;
      summary.failed++;
    } else if (r.status === SNAPSHOT_COMPARE_STATUS.CONTENT_DRIFT) {
      summary.contentDrift++;
      summary.failed++;
    } else if (r.status === SNAPSHOT_COMPARE_STATUS.FORMAT_DRIFT) {
      summary.formatDrift++;
      summary.failed++;
    } else if (r.status === SNAPSHOT_COMPARE_STATUS.CANDIDATE_GENERATION_ERROR) {
      summary.candidateErrors++;
      summary.failed++;
    } else {
      summary.fixtureErrors++;
      summary.failed++;
    }
  }

  var orphans = [];
  if (detectOrphans) {
    orphans = findOrphanSnapshots({ cwd: cwd, fixtureRoot: fixtureRoot, snapshotRoot: snapshotRoot });
    summary.orphanSnapshots = orphans.length;
    if (orphans.length > 0) summary.failed++;
  }

  var overallStatus = summary.failed === 0 ? SNAPSHOT_COMPARE_STATUS.MATCH : SNAPSHOT_COMPARE_STATUS.CONTENT_DRIFT;

  return {
    status: overallStatus,
    ok: summary.failed === 0,
    fixtureRoot: fixtureRoot,
    snapshotRoot: snapshotRoot,
    summary: summary,
    results: results,
    orphans: orphans.map(function (p) {
      return {
        status: SNAPSHOT_COMPARE_STATUS.ORPHAN_SNAPSHOT,
        snapshotPath: p,
        fixturePath: null,
        migrationHint: "Review and remove intentionally in a dedicated PR.",
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Exports                                                             */
/* ------------------------------------------------------------------ */

module.exports = {
  SNAPSHOT_COMPARE_STATUS: SNAPSHOT_COMPARE_STATUS,
  DEFAULT_MAX_DIFFERENCES: DEFAULT_MAX_DIFFERENCES,
  DEFAULT_MAX_VALUE_LENGTH: DEFAULT_MAX_VALUE_LENGTH,
  classifySnapshotDifference: classifySnapshotDifference,
  collectSnapshotDifferences: collectSnapshotDifferences,
  compareSnapshotObjects: compareSnapshotObjects,
  formatSnapshotDifference: formatSnapshotDifference,
  compareSnapshotForFixture: compareSnapshotForFixture,
  compareAllSnapshots: compareAllSnapshots,
  findOrphanSnapshots: findOrphanSnapshots,
};
