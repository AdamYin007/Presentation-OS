#!/usr/bin/env node
/**
 * Dry-run-only PackRuntimeContext soft validation snapshot writer script.
 *
 * NOT wired into package.json, check:all, doctor, or CI.
 * Run: node scripts/write-pack-runtime-context-snapshots.cjs --fixture <path>
 *
 * @module write-pack-runtime-context-snapshots
 */

"use strict";

var fs = require("fs");
var path = require("path");
var snapshotWriter = require("../packages/cli/src/validation/soft-validation-snapshot-writer.js");

/* ------------------------------------------------------------------ */
/*  Argument Parsing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse CLI arguments.
 * @param {string[]} argv
 * @returns {{fixture?: string, compact?: boolean, json?: boolean, help?: boolean, update?: boolean, all?: boolean}}
 */
function parseArgs(argv) {
  var args = { help: false, compact: false, json: false, update: false, all: false };
  var i = 2;
  while (i < argv.length) {
    var arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      i++;
    } else if (arg === "--compact" || arg === "-c") {
      args.compact = true;
      i++;
    } else if (arg === "--json") {
      args.json = true;
      i++;
    } else if (arg === "--update") {
      args.update = true;
      i++;
    } else if (arg === "--all") {
      args.all = true;
      i++;
    } else if (arg === "--fixture" || arg === "-f") {
      i++;
      if (i >= argv.length) {
        process.stderr.write("Error: --fixture requires a value\n");
        process.exit(1);
      }
      args.fixture = argv[i];
      i++;
    } else if (arg.startsWith("--")) {
      process.stderr.write("Error: unknown option: " + arg + "\n");
      process.exit(1);
    } else {
      process.stderr.write("Error: unexpected argument: " + arg + "\n");
      process.exit(1);
    }
  }
  return args;
}

/* ------------------------------------------------------------------ */
/*  Dry-Run Runner                                                     */
/* ------------------------------------------------------------------ */

/**
 * Run a dry-run snapshot generation for a single fixture.
 *
 * @param {string} fixturePath - Repo-relative fixture path
 * @param {object} [options]
 * @param {boolean} [options.compact]
 * @param {boolean} [options.json]
 * @returns {{status: string, exitCode: number, output: string}}
 */
function runDryRun(fixturePath, options) {
  options = options || {};
  var compact = options.compact || false;
  var asJson = options.json || false;

  try {
    var result = snapshotWriter.createNormalizedSnapshotReport(fixturePath);

    var report = result.report;
    var snapshotPath = result.target.snapshotPath;
    var status = report.status;

    if (asJson) {
      return {
        status: "success",
        exitCode: 0,
        output: snapshotWriter.serializeSnapshotReport(report, { pretty: !compact }),
      };
    }

    // Text output
    var lines = [
      "Snapshot dry run",
      "Fixture: " + result.fixture.path,
      "Target: " + snapshotPath,
      "Status: " + status,
      "Would write: " + snapshotPath,
    ];

    if (report.results && report.results.length > 0) {
      lines.push("");
      lines.push("Findings: " + report.results.length);
      report.results.forEach(function(r) {
        lines.push("  [" + r.severity + "] " + r.code + ": " + r.message);
      });
    }

    return {
      status: "success",
      exitCode: 0,
      output: lines.join("\n") + "\n",
    };
  } catch (e) {
    return {
      status: "error",
      exitCode: 1,
      output: "Error: " + e.message + "\n",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

/**
 * Entry point.
 * @param {string[]} argv
 */
function main(argv) {
  var args = parseArgs(argv);

  if (args.help) {
    var help = [
      "Usage:",
      "  node scripts/write-pack-runtime-context-snapshots.cjs [OPTIONS]",
      "",
      "Options:",
      "  --fixture, -f <path>   Path to fixture JSON file (required)",
      "  --compact, -c          Compact JSON output (with --json)",
      "  --json                 Output candidate snapshot JSON to stdout",
      "  --help,   -h           Show this help and exit",
      "",
      "Notes:",
      "  --update is NOT supported (dry-run only)",
      "  --all is NOT supported (single fixture only)",
      "",
      "Examples:",
      "  node scripts/write-pack-runtime-context-snapshots.cjs --fixture test/fixtures/pack-runtime-context/valid/minimal-valid.json",
      "  node scripts/write-pack-runtime-context-snapshots.cjs --fixture <path> --json",
      "  node scripts/write-pack-runtime-context-snapshots.cjs --fixture <path> --json --compact",
    ];
    console.log(help.join("\n"));
    process.exit(0);
  }

  // Reject --update
  if (args.update) {
    process.stderr.write("Error: --update is not supported. This script is dry-run only.\n");
    process.exit(1);
  }

  // Reject --all
  if (args.all) {
    process.stderr.write("Error: --all is not supported. Use --fixture for individual fixtures.\n");
    process.exit(1);
  }

  if (!args.fixture) {
    process.stderr.write("Error: --fixture is required (use --help for usage)\n");
    process.exit(1);
  }

  var result = runDryRun(args.fixture, { compact: args.compact, json: args.json });
  process.stdout.write(result.output);
  process.exit(result.exitCode);
}

// Export for testability
module.exports = {
  parseArgs: parseArgs,
  runDryRun: runDryRun,
  main: main,
};

// Run when invoked directly
main(process.argv);
