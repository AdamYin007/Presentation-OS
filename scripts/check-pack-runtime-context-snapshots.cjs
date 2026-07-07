#!/usr/bin/env node
/**
 * PackRuntimeContext Snapshot Comparator CLI (M10.9)
 *
 * Developer-facing, read-only, compare-only CLI.
 * Compares regenerated candidate reports against committed snapshots.
 *
 * Usage:
 *   node scripts/check-pack-runtime-context-snapshots.cjs --fixture <path>
 *   node scripts/check-pack-runtime-context-snapshots.cjs --all [--json] [--compact] [--detect-orphans]
 *   node scripts/check-pack-runtime-context-snapshots.cjs --help
 *
 * NOT wired into package.json, check:all, doctor, or CI.
 */

"use strict";

var path = require("path");
var C = require("../packages/cli/src/validation/soft-validation-snapshot-comparator.js");

var ROOT = path.resolve(__dirname, "..");
var FIXTURE_ROOT = "test/fixtures/pack-runtime-context";
var SNAPSHOT_ROOT = "test/snapshots/pack-runtime-context-soft-report";

var USAGE = [
  "Usage:",
  "  node scripts/check-pack-runtime-context-snapshots.cjs [OPTIONS]",
  "",
  "Options:",
  "  --fixture <path>   Compare a single fixture against its committed snapshot",
  "  --all              Compare all fixtures deterministically",
  "  --json             Output structured JSON",
  "  --compact          Compact JSON (single line, only with --json)",
  "  --detect-orphans   Detect orphan snapshots (enabled by default with --all)",
  "  --help             Show this help and exit",
  "",
  "Examples:",
  "  node scripts/check-pack-runtime-context-snapshots.cjs --fixture test/fixtures/pack-runtime-context/valid/minimal-valid.json",
  "  node scripts/check-pack-runtime-context-snapshots.cjs --all",
  "  node scripts/check-pack-runtime-context-snapshots.cjs --all --json --compact",
  "",
  "Safety: This CLI is read-only. It never writes, updates, deletes, or creates files.",
  "",
];

function exitUsage(code) {
  process.stderr.write(USAGE.join("\n") + "\n");
  process.exit(code);
}

/* ================================================================== */
/*  Argument parsing                                                    */
/* ================================================================== */

var args = process.argv.slice(2);
var hasFixture = false;
var fixturePath = null;
var hasAll = false;
var hasJson = false;
var hasCompact = false;
var hasDetectOrphans = false;
var hasHelp = false;

for (var i = 0; i < args.length; i++) {
  var arg = args[i];

  if (arg === "--help") {
    hasHelp = true;
    continue;
  }

  if (arg === "--fixture") {
    hasFixture = true;
    i++;
    if (i >= args.length) {
      process.stderr.write("Error: --fixture requires a value\n");
      exitUsage(1);
    }
    fixturePath = args[i];
    continue;
  }

  if (arg === "--all") {
    hasAll = true;
    continue;
  }

  if (arg === "--json") {
    hasJson = true;
    continue;
  }

  if (arg === "--compact") {
    hasCompact = true;
    continue;
  }

  if (arg === "--detect-orphans") {
    hasDetectOrphans = true;
    continue;
  }

  // Explicitly reject write/update/delete parameters
  if (arg === "--update" || arg === "--write" || arg === "--fix" ||
      arg === "--delete" || arg === "--delete-orphans" || arg === "--repair") {
    process.stderr.write("Error: '" + arg + "' is not supported. This CLI is read-only.\n");
    exitUsage(1);
  }

  // Unknown parameter
  process.stderr.write("Error: unknown option: " + arg + "\n");
  exitUsage(1);
}

// --help
if (hasHelp) {
  process.stdout.write(USAGE.join("\n") + "\n");
  process.exit(0);
}

// No arguments
if (args.length === 0) {
  exitUsage(1);
}

// --compact without --json
if (hasCompact && !hasJson) {
  process.stderr.write("Error: --compact requires --json\n");
  exitUsage(1);
}

// --fixture and --all mutually exclusive
if (hasFixture && hasAll) {
  process.stderr.write("Error: --fixture and --all are mutually exclusive\n");
  exitUsage(1);
}

// Neither --fixture nor --all
if (!hasFixture && !hasAll) {
  exitUsage(1);
}

/* ================================================================== */
/*  Single fixture mode                                                 */
/* ================================================================== */

if (hasFixture) {
  var result = C.compareSnapshotForFixture(fixturePath, {
    cwd: ROOT,
    fixtureRoot: FIXTURE_ROOT,
    snapshotRoot: SNAPSHOT_ROOT,
  });

  if (hasJson) {
    var jsonOut = {
      status: result.status,
      fixturePath: result.fixturePath,
      snapshotPath: result.snapshotPath,
      reportStatus: result.reportStatus,
      semanticEqual: result.semanticEqual,
      byteEqual: result.byteEqual,
      expectedBytes: result.expectedBytes,
      actualBytes: result.actualBytes,
      differences: result.differences || [],
      migrationHint: result.migrationHint,
    };
    if (hasCompact) {
      process.stdout.write(JSON.stringify(jsonOut) + "\n");
    } else {
      process.stdout.write(JSON.stringify(jsonOut, null, 2) + "\n");
    }
  } else {
    process.stdout.write(C.formatSnapshotDifference(result) + "\n");
  }

  if (result.status === C.SNAPSHOT_COMPARE_STATUS.MATCH) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

/* ================================================================== */
/*  All fixtures mode                                                   */
/* ================================================================== */

if (hasAll) {
  var allResult = C.compareAllSnapshots({
    cwd: ROOT,
    fixtureRoot: FIXTURE_ROOT,
    snapshotRoot: SNAPSHOT_ROOT,
    detectOrphans: hasDetectOrphans,
  });

  if (hasJson) {
    var jsonAll = {
      status: allResult.status,
      ok: allResult.ok,
      fixtureRoot: allResult.fixtureRoot,
      snapshotRoot: allResult.snapshotRoot,
      summary: allResult.summary,
      results: allResult.results.map(function (r) {
        return {
          status: r.status,
          fixturePath: r.fixturePath,
          snapshotPath: r.snapshotPath,
          reportStatus: r.reportStatus,
          semanticEqual: r.semanticEqual,
          byteEqual: r.byteEqual,
          expectedBytes: r.expectedBytes,
          actualBytes: r.actualBytes,
          differences: r.differences || [],
          migrationHint: r.migrationHint,
        };
      }),
      orphans: allResult.orphans,
    };
    if (hasCompact) {
      process.stdout.write(JSON.stringify(jsonAll) + "\n");
    } else {
      process.stdout.write(JSON.stringify(jsonAll, null, 2) + "\n");
    }
  } else {
    // Human-readable output
    var lines = [];
    lines.push("Snapshot comparison summary");
    lines.push("Fixture root: " + allResult.fixtureRoot);
    lines.push("Snapshot root: " + allResult.snapshotRoot);
    lines.push("Total fixtures: " + allResult.summary.total);
    lines.push("Matched: " + allResult.summary.matched);
    lines.push("Missing snapshots: " + allResult.summary.missingSnapshots);
    lines.push("Invalid snapshots: " + allResult.summary.invalidSnapshots);
    lines.push("Content drift: " + allResult.summary.contentDrift);
    lines.push("Format drift: " + allResult.summary.formatDrift);
    lines.push("Fixture errors: " + allResult.summary.fixtureErrors);
    lines.push("Candidate errors: " + allResult.summary.candidateErrors);
    lines.push("Orphan snapshots: " + allResult.summary.orphanSnapshots);

    var resultLabel = allResult.ok ? "PASS" : "FAIL";
    lines.push("Result: " + resultLabel);
    lines.push("");

    for (var i = 0; i < allResult.results.length; i++) {
      var r = allResult.results[i];
      var icon = r.status === C.SNAPSHOT_COMPARE_STATUS.MATCH ? "MATCH" : r.status.toUpperCase().replace(/_/g, "-");
      lines.push("  " + icon + " " + r.fixturePath);
      if (r.status !== C.SNAPSHOT_COMPARE_STATUS.MATCH && r.differences && r.differences.length > 0) {
        var showDiffs = r.differences.slice(0, 10);
        for (var j = 0; j < showDiffs.length; j++) {
          lines.push("    - " + showDiffs[j].path + ": " + JSON.stringify(showDiffs[j].expected) + " vs " + JSON.stringify(showDiffs[j].actual));
        }
      }
    }

    if (allResult.orphans.length > 0) {
      lines.push("");
      lines.push("Orphan snapshots:");
      for (var k = 0; k < allResult.orphans.length; k++) {
        lines.push("  ORPHAN " + allResult.orphans[k].snapshotPath);
      }
    }

    process.stdout.write(lines.join("\n") + "\n");
  }

  process.exit(allResult.ok ? 0 : 1);
}