#!/usr/bin/env node
/**
 * Standalone PackRuntimeContext Soft Validation Report Generator
 *
 * Combines the soft validator and report writer into a runnable script.
 * Usage:
 *   node scripts/generate-pack-runtime-context-soft-report.cjs --input <path> [--out <path>] [--compact] [--help]
 *
 * NOT wired into doctor, CLI, CI, or package.json.
 * Default: prints report JSON to stdout.
 * --out: writes report to specified file path.
 *
 * @module generate-pack-runtime-context-soft-report
 */

"use strict";

var fs = require("fs");
var path = require("path");
var validator = require("../packages/cli/src/validation/pack-runtime-context-soft-validator.js");
var writer = require("../packages/cli/src/validation/soft-validation-report-writer.js");

/* ------------------------------------------------------------------ */
/*  Argument Parsing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse CLI arguments.
 * @param {string[]} argv
 * @returns {{input?: string, out?: string, compact?: boolean, help?: boolean}}
 */
function parseArgs(argv) {
  var args = { help: false, compact: false };
  var i = 2; // skip node + script path
  while (i < argv.length) {
    var arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      i++;
    } else if (arg === "--compact" || arg === "-c") {
      args.compact = true;
      i++;
    } else if (arg === "--input" || arg === "-i") {
      i++;
      if (i >= argv.length) {
        process.stderr.write("Error: --input requires a value\n");
        process.exit(1);
      }
      args.input = argv[i];
      i++;
    } else if (arg === "--out" || arg === "-o") {
      i++;
      if (i >= argv.length) {
        process.stderr.write("Error: --out requires a value\n");
        process.exit(1);
      }
      args.out = argv[i];
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
/*  File I/O Helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read and parse a JSON file.
 * @param {string} filePath
 * @returns {object}
 */
function readJsonFile(filePath) {
  var resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    process.stderr.write("Error: input file not found: " + resolved + "\n");
    process.exit(1);
  }
  var content = fs.readFileSync(resolved, "utf8");
  try {
    return JSON.parse(content);
  } catch (e) {
    process.stderr.write("Error: JSON parse error in " + resolved + ": " + e.message + "\n");
    process.exit(1);
  }
}

/**
 * Ensure parent directory exists.
 * @param {string} filePath
 */
function ensureParentDir(filePath) {
  var parent = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
}

/* ------------------------------------------------------------------ */
/*  Report Generation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Generate a soft validation report from a JSON file.
 * @param {string} inputPath
 * @param {object} [options]
 * @param {boolean} [options.compact]
 * @param {string} [options.source]
 * @returns {string} Report JSON string
 */
function generateReportFromFile(inputPath, options) {
  options = options || {};
  var ctx = readJsonFile(inputPath);

  // Pass the raw value directly to the validator so that non-object inputs
  // (arrays, strings, null) trigger ERROR_CONTEXT_NOT_OBJECT naturally.
  var validationResult = validator.validatePackRuntimeContext(ctx, {
    includeTimestamp: true,
    source: options.source || inputPath,
  });

  var report = writer.createSoftValidationReport(validationResult, {
    includeTimestamp: true,
    source: options.source || inputPath,
    metadata: { inputFile: path.resolve(inputPath) },
  });

  return writer.serializeSoftValidationReport(report, { pretty: !options.compact });
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
      "  node scripts/generate-pack-runtime-context-soft-report.cjs [OPTIONS]",
      "",
      "Options:",
      "  --input, -i <path>   Path to PackRuntimeContext JSON file (required)",
      "  --out,    -o <path>  Write report to file (default: stdout)",
      "  --compact, -c        Compact JSON output (no indentation)",
      "  --help,   -h         Show this help and exit",
      "",
      "Examples:",
      "  node scripts/generate-pack-runtime-context-soft-report.cjs --input context.json",
      "  node scripts/generate-pack-runtime-context-soft-report.cjs --input context.json --out report.json",
      "  node scripts/generate-pack-runtime-context-soft-report.cjs --input context.json --compact",
    ];
    console.log(help.join("\n"));
    process.exit(0);
  }

  if (!args.input) {
    process.stderr.write("Error: --input is required (use --help for usage)\n");
    process.exit(1);
  }

  try {
    var reportJson = generateReportFromFile(args.input, {
      compact: args.compact,
      source: "standalone-script",
    });

    if (args.out) {
      ensureParentDir(args.out);
      fs.writeFileSync(args.out, reportJson, "utf8");
      console.log("Soft validation report written to " + path.resolve(args.out));
    } else {
      console.log(reportJson);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write("Internal error: " + e.message + "\n");
    process.exit(1);
  }
}

// Export for testability
module.exports = {
  parseArgs: parseArgs,
  readJsonFile: readJsonFile,
  ensureParentDir: ensureParentDir,
  generateReportFromFile: generateReportFromFile,
  main: main,
};

// Run when invoked directly
main(process.argv);
