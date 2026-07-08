#!/usr/bin/env node
"use strict";

/**
 * PackRuntimeContext validation CLI
 *
 * Standalone, read-only, developer-facing CLI for validating PackRuntimeContext
 * fixtures using the strict mode library.
 *
 * This CLI does NOT:
 * - Write files (fs)
 * - Read process.env
 * - Use Date, Math.random, or network
 * - Import snapshot, comparator, or report writer
 * - Modify validator or policy modules
 * - Add package.json scripts or CI integration
 * - Support update/write/fix/delete/repair/all modes
 *
 * Usage:
 *   node scripts/validate-pack-runtime-context.cjs --fixture <path> [--strict|--soft] [--json] [--compact]
 *   node scripts/validate-pack-runtime-context.cjs --help
 */

var fs = require("fs");
var path = require("path");

var strictValidator = require("../packages/cli/src/validation/pack-runtime-context-strict-validator.js");

// ---- Argument parsing ----

var args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write("Error: --fixture is required (use --help for usage)\n");
  process.exit(1);
}

var fixturePath = null;
var mode = "soft";
var jsonOutput = false;
var compactOutput = false;
var showHelp = false;

var DENIED_ARGS = ["--update", "--write", "--fix", "--delete", "--repair", "--all"];
var UNKNOWN_ARGS = [];

for (var i = 0; i < args.length; i++) {
  var arg = args[i];

  // Denied arguments
  for (var d = 0; d < DENIED_ARGS.length; d++) {
    if (arg === DENIED_ARGS[d]) {
      process.stderr.write("Error: '" + arg + "' is not supported. This CLI is read-only.\n");
      process.exit(1);
    }
  }

  if (arg === "--help") {
    showHelp = true;
    continue;
  }

  if (arg === "--strict") {
    mode = "strict";
    continue;
  }

  if (arg === "--soft") {
    if (mode === "strict") {
      process.stderr.write("Error: --strict and --soft are mutually exclusive\n");
      process.exit(1);
    }
    mode = "soft";
    continue;
  }

  if (arg === "--json") {
    jsonOutput = true;
    continue;
  }

  if (arg === "--compact") {
    if (!jsonOutput) {
      process.stderr.write("Error: --compact requires --json\n");
      process.exit(1);
    }
    compactOutput = true;
    continue;
  }

  if (arg === "--fixture") {
    if (i + 1 >= args.length) {
      process.stderr.write("Error: --fixture requires a value\n");
      process.exit(1);
    }
    fixturePath = args[i + 1];
    i++; // skip next arg
    continue;
  }

  // Unknown argument
  UNKNOWN_ARGS.push(arg);
}

// Show help only for --help flag; unknown args get error
if (showHelp) {
  var helpText =
    "Usage:\n" +
    "  node scripts/validate-pack-runtime-context.cjs [OPTIONS]\n" +
    "\n" +
    "Options:\n" +
    "  --fixture <path>   Path to a PackRuntimeContext fixture JSON file (required)\n" +
    "  --strict           Enable strict mode (default: soft)\n" +
    "  --soft             Explicitly enable soft mode\n" +
    "  --json             Output structured JSON result\n" +
    "  --compact          Compact JSON (single line, only with --json)\n" +
    "  --help             Show this help and exit\n" +
    "\n" +
    "Examples:\n" +
    "  node scripts/validate-pack-runtime-context.cjs --fixture test/fixtures/pack-runtime-context/valid/minimal-valid.json\n" +
    "  node scripts/validate-pack-runtime-context.cjs --fixture test/fixtures/pack-runtime-context/invalid/context-not-object.json --strict\n" +
    "  node scripts/validate-pack-runtime-context.cjs --fixture test/fixtures/pack-runtime-context/edge/missing-contract-version.json --strict --json --compact\n" +
    "\n" +
    "Safety: This CLI is read-only. It never writes, updates, deletes, or creates files.\n";
  process.stdout.write(helpText);
  process.exit(0);
}

if (UNKNOWN_ARGS.length > 0) {
  process.stderr.write("Error: unknown option: " + UNKNOWN_ARGS[0] + "\n");
  process.exit(1);
}

// Validate fixture path
if (!fixturePath) {
  process.stderr.write("Error: --fixture is required (use --help for usage)\n");
  process.exit(1);
}

// Resolve path
var resolvedPath = path.resolve(fixturePath);

// Check file exists
if (!fs.existsSync(resolvedPath)) {
  process.stderr.write("Error: input file not found: " + resolvedPath + "\n");
  process.exit(1);
}

// Read and parse fixture
var raw;
try {
  raw = fs.readFileSync(resolvedPath, "utf8");
} catch (err) {
  process.stderr.write("Error: cannot read file: " + resolvedPath + "\n");
  process.exit(1);
}

var input;
try {
  input = JSON.parse(raw);
} catch (err) {
  process.stderr.write("Error: JSON parse error in " + resolvedPath + ": " + err.message + "\n");
  process.exit(1);
}

// Run validation
var result;
try {
  if (mode === "strict") {
    result = strictValidator.validatePackRuntimeContextStrict(input, { includeTimestamp: false });
  } else {
    result = strictValidator.validatePackRuntimeContext(input, { includeTimestamp: false });
  }
} catch (err) {
  var errorResult = {
    domain: "validation",
    mode: mode,
    status: "internal-error",
    blocking: false,
    policyVersion: 0,
    summary: { total: 0, blocking: 0, nonBlocking: 0, unknown: 0, errors: 0, warnings: 0, info: 0 },
    results: [],
    error: "Internal validation error",
  };
  var output = compactOutput
    ? JSON.stringify(errorResult)
    : JSON.stringify(errorResult, null, 2);
  process.stdout.write(output + "\n");
  process.exit(1);
}

// Output
if (jsonOutput) {
  var jsonStr = compactOutput
    ? JSON.stringify(result)
    : JSON.stringify(result, null, 2);
  process.stdout.write(jsonStr + "\n");
} else {
  var humanOutput = strictValidator.formatStrictValidationResult(result);
  // Override the header for soft mode
  if (mode === "soft" && result.status !== "hard-fail") {
    var lines = humanOutput.split("\n");
    if (lines.length > 0) {
      if (result.status === "soft-fail") {
        lines[0] = "PackRuntimeContext soft validation completed";
      } else if (result.status === "pass-with-info") {
        lines[0] = "PackRuntimeContext soft validation passed with informational findings";
      } else {
        lines[0] = "PackRuntimeContext soft validation completed";
      }
    }
    // Replace "Blocking findings:" with "Blocking:"
    for (var l = 0; l < lines.length; l++) {
      if (lines[l].indexOf("Blocking findings:") === 0) {
        lines[l] = "Blocking: " + (result.blocking ? "yes" : "no");
      }
    }
    humanOutput = lines.join("\n");
  }
  process.stdout.write(humanOutput + "\n");
}

// Exit code
if (mode === "soft") {
  // Soft mode always exits 0
  process.exit(0);
} else {
  // Strict mode: hard-fail exits 1
  if (result.status === "hard-fail") {
    process.exit(1);
  }
  process.exit(0);
}
