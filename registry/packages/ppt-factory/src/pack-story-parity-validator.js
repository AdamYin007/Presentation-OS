/**
 * Pack Story Parity Validator — M5.5
 *
 * Renders both registry story and pack story via the existing run.js CLI,
 * captures generated slide plans, compares them, and reports parity result.
 *
 * Does NOT duplicate rendering logic. Does NOT change rendering behavior.
 * Uses subprocess to invoke existing --story and --pack-story commands.
 *
 * Comparison dimensions:
 *   - slide count
 *   - slide order (by type)
 *   - slide titles
 *   - slide text content (title, message, pattern)
 *   - slide plan JSON structure (keys, fields)
 *
 * Does NOT compare PPTX binary identity (zip ordering, timestamps, IDs may differ).
 */

var fs = require("fs");
var path = require("path");
var { execSync } = require("child_process");

// Temp directory for parity comparison outputs
var TEMP_DIR = null;

/**
 * Derive registry story id from pack story format.
 * digital-pathology/digital-pathology-15 => digital-pathology-15
 * Only implements this simple rule for M5.5.
 *
 * @param {string} packStoryValue - The pack story value
 * @returns {string} Registry story id
 */
function deriveRegistryStoryId(packStoryValue) {
  var parts = packStoryValue.split("/");
  if (parts.length !== 2) {
    throw new Error("Invalid pack story value. Expected <pack-id>/<story-id>");
  }
  return parts[1].trim();
}

/**
 * Create a temporary directory for parity comparison outputs.
 * Cleans any previous temp contents before creating fresh dirs.
 * @returns {string} Path to temp directory
 */
function createTempDir() {
  TEMP_DIR = path.join(process.cwd(), "output", "ppt-factory", ".parity-temp");
  // Clean previous temp contents
  if (fs.existsSync(TEMP_DIR)) {
    try {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch (e) {
      // Non-fatal: continue even if cleanup fails
    }
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  return TEMP_DIR;
}

/**
 * Clean up temporary parity directory.
 */
function cleanupTempDir() {
  if (TEMP_DIR && fs.existsSync(TEMP_DIR)) {
    try {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch (e) {
      // Non-fatal: cleanup failure should not affect parity result
    }
  }
  TEMP_DIR = null;
}

/**
 * Run run.js with given args and capture stdout/stderr.
 *
 * @param {string[]} extraArgs - Extra CLI args
 * @returns {object} { stdout, stderr, exitCode }
 */
function runCli(extraArgs) {
  var runJs = path.join(
    process.cwd(),
    "registry/packages/ppt-factory/bin/run.js"
  );
  var cmdArgs = [runJs].concat(extraArgs);
  var cmd = cmdArgs.join(" ");
  try {
    var stdout = execSync(cmd, {
      encoding: "utf8",
      timeout: 120000,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return { stdout: stdout, stderr: "", exitCode: 0 };
  } catch (e) {
    var stderr = "";
    var exitCode = 1;
    if (e.stdout) stderr += e.stdout.toString();
    if (e.stderr) stderr += e.stderr.toString();
    exitCode = e.status || 1;
    return { stdout: e.stdout ? e.stdout.toString() : "", stderr: stderr, exitCode: exitCode };
  }
}

/**
 * Compare two slide plan objects for parity.
 *
 * @param {object} planA - First slide plan (from registry)
 * @param {object} planB - Second slide plan (from pack)
 * @returns {object} Comparison result with pass/fail for each dimension
 */
function compareSlidePlans(planA, planB) {
  var results = {};

  // Compare slide count
  var slidesA = planA.slides || [];
  var slidesB = planB.slides || [];
  results.slideCount = {
    passed: slidesA.length === slidesB.length,
    expected: slidesA.length,
    actual: slidesB.length
  };

  // Compare slide order and titles
  var titlesMatch = true;
  var titleFailures = [];
  for (var i = 0; i < Math.min(slidesA.length, slidesB.length); i++) {
    if (slidesA[i].title !== slidesB[i].title) {
      titlesMatch = false;
      titleFailures.push({
        index: i + 1,
        expected: slidesA[i].title,
        actual: slidesB[i].title
      });
    }
    if (slidesA[i].type !== slidesB[i].type) {
      titlesMatch = false;
      titleFailures.push({
        index: i + 1,
        expected: slidesA[i].type + " (type)",
        actual: slidesB[i].type + " (type)"
      });
    }
    if (slidesA[i].message !== slidesB[i].message) {
      titlesMatch = false;
      titleFailures.push({
        index: i + 1,
        expected: slidesA[i].message,
        actual: slidesB[i].message
      });
    }
  }
  if (slidesA.length !== slidesB.length) {
    titlesMatch = false;
  }
  results.slideTitles = {
    passed: titlesMatch,
    failures: titleFailures
  };

  // Compare text content (titles, messages, patterns)
  var textMatch = true;
  var textFailures = [];
  for (var j = 0; j < Math.min(slidesA.length, slidesB.length); j++) {
    var sa = slidesA[j];
    var sb = slidesB[j];
    var fields = ["title", "message", "pattern"];
    for (var k = 0; k < fields.length; k++) {
      var field = fields[k];
      if (sa[field] !== sb[field]) {
        textMatch = false;
        textFailures.push({
          slide: j + 1,
          field: field,
          expected: sa[field],
          actual: sb[field]
        });
      }
    }
  }
  results.slideText = {
    passed: textMatch,
    failures: textFailures
  };

  // Compare slide plan structure (top-level keys, slide array structure)
  var structMatch = true;
  var structFailures = [];

  // Compare top-level keys (excluding "slides" for structural check)
  var keysA = Object.keys(planA).filter(function(k) { return k !== "slides"; });
  var keysB = Object.keys(planB).filter(function(k) { return k !== "slides"; });
  if (keysA.length !== keysB.length || keysA.sort().join(",") !== keysB.sort().join(",")) {
    structMatch = false;
    structFailures.push("Top-level keys differ");
  }

  // Compare slide array structure
  if (slidesA.length !== slidesB.length) {
    structMatch = false;
    structFailures.push("Slide array length differs: " + slidesA.length + " vs " + slidesB.length);
  } else {
    for (var m = 0; m < slidesA.length; m++) {
      var slideKeysA = Object.keys(slidesA[m]).sort().join(",");
      var slideKeysB = Object.keys(slidesB[m]).sort().join(",");
      if (slideKeysA !== slideKeysB) {
        structMatch = false;
        structFailures.push("Slide " + (m + 1) + " keys differ: " + slideKeysA + " vs " + slideKeysB);
      }
    }
  }

  results.slidePlanStructure = {
    passed: structMatch,
    failures: structFailures
  };

  // Overall
  results.overall = {
    passed: results.slideCount.passed && results.slideTitles.passed &&
            results.slideText.passed && results.slidePlanStructure.passed
  };

  return results;
}

/**
 * Main parity validation function.
 *
 * @param {string} packStoryValue - The pack story value (e.g. "digital-pathology/digital-pathology-15")
 * @param {object} options
 * @param {boolean} [options.useLegacy] - Use legacy renderer for both sides
 * @param {string} [options.packsRoot] - Packs root directory (default: "presentation-packs")
 * @returns {object} Validation result
 */
function validatePackStoryParity(packStoryValue, options) {
  options = options || {};
  var useLegacy = options.useLegacy || false;
  var packsRoot = options.packsRoot || "presentation-packs";

  // Step 1: Resolve pack story
  var { resolvePackStory, printPackStoryResolution } = require("./pack-story-resolver");
  var packResult = resolvePackStory(packStoryValue, { packsRoot: packsRoot });
  var printExit = printPackStoryResolution(packResult);
  if (printExit !== 0) {
    return { ok: false, error: "Pack story resolution failed: " + packResult.error };
  }

  // Step 2: Derive registry story id
  var registryStoryId;
  try {
    registryStoryId = deriveRegistryStoryId(packStoryValue);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  // Step 3: Create temp directories for outputs
  var tempDir = createTempDir();
  var registryDir = path.join(tempDir, "registry");
  var packDir = path.join(tempDir, "pack");

  var legend = useLegacy ? " (legacy)" : "";
  console.log("Pack Story Parity Validation:" + legend);
  console.log("registryStory: " + registryStoryId);
  console.log("packStory: " + packStoryValue);
  console.log("");

  // Step 4: Render registry story via existing CLI
  console.log("Rendering registry story...");
  var registryCmd = ["--story", registryStoryId, "--out", registryDir];
  if (useLegacy) registryCmd.push("--legacy-renderer");
  var registryOutput = runCli(registryCmd);
  if (registryOutput.exitCode !== 0) {
    console.error("  Temp output written to: " + tempDir);
    cleanupTempDir();
    return { ok: false, error: "Registry render failed (exit " + registryOutput.exitCode + "): " + registryOutput.stderr };
  }
  console.log("  PPTX: " + path.join(registryDir, registryStoryId + ".pptx"));
  console.log("  Plan: " + path.join(registryDir, registryStoryId + "-slide-plan.json"));

  // Step 5: Render pack story via existing CLI
  console.log("Rendering pack story...");
  var packCmd = ["--pack-story", packStoryValue, "--out", packDir];
  if (useLegacy) packCmd.push("--legacy-renderer");
  var packOutput = runCli(packCmd);
  if (packOutput.exitCode !== 0) {
    console.error("  Temp output written to: " + tempDir);
    cleanupTempDir();
    return { ok: false, error: "Pack render failed (exit " + packOutput.exitCode + "): " + packOutput.stderr };
  }
  console.log("  PPTX: " + path.join(packDir, registryStoryId + ".pptx"));
  console.log("  Plan: " + path.join(packDir, registryStoryId + "-slide-plan.json"));

  // Step 6: Load slide plans for comparison
  var registryPlanPath = path.join(registryDir, registryStoryId + "-slide-plan.json");
  var packPlanPath = path.join(packDir, registryStoryId + "-slide-plan.json");

  var registryPlan, packPlan;
  try {
    registryPlan = JSON.parse(fs.readFileSync(registryPlanPath, "utf8"));
    packPlan = JSON.parse(fs.readFileSync(packPlanPath, "utf8"));
  } catch (e) {
    cleanupTempDir();
    return { ok: false, error: "Failed to read slide plan files: " + e.message };
  }

  // Step 7: Compare
  console.log("");
  console.log("Comparison:");

  var comparison = compareSlidePlans(registryPlan, packPlan);

  console.log("  slideCount: " + (comparison.slideCount.passed ? "passed" : "FAILED (expected " + comparison.slideCount.expected + ", got " + comparison.slideCount.actual + ")"));
  console.log("  slideTitles: " + (comparison.slideTitles.passed ? "passed" : "FAILED"));
  if (!comparison.slideTitles.passed && comparison.slideTitles.failures.length > 0) {
    comparison.slideTitles.failures.forEach(function(f) {
      console.log("    Slide " + f.index + ": expected '" + f.expected + "', got '" + f.actual + "'");
    });
  }
  console.log("  slideText: " + (comparison.slideText.passed ? "passed" : "FAILED"));
  if (!comparison.slideText.passed && comparison.slideText.failures.length > 0) {
    comparison.slideText.failures.forEach(function(f) {
      console.log("    Slide " + f.slide + "." + f.field + ": expected '" + f.expected + "', got '" + f.actual + "'");
    });
  }
  console.log("  slidePlanStructure: " + (comparison.slidePlanStructure.passed ? "passed" : "FAILED"));
  if (!comparison.slidePlanStructure.passed && comparison.slidePlanStructure.failures.length > 0) {
    comparison.slidePlanStructure.failures.forEach(function(f) {
      console.log("    " + f);
    });
  }

  // Step 8: Report overall result
  console.log("");
  if (comparison.overall.passed) {
    console.log("Parity: passed");
    console.log("");
    console.log("Registry and pack story rendering produce identical slide plans.");
    console.log("(PPTX binary comparison is not performed — zip ordering, timestamps, and internal IDs may differ.)");
    cleanupTempDir();
    return { ok: true, result: comparison };
  } else {
    console.log("Parity: FAILED");
    console.log("");
    console.log("Registry and pack story rendering DO NOT produce identical slide plans.");
    console.log("Temp output written to: " + tempDir);
    cleanupTempDir();
    return { ok: false, error: "Parity validation failed", result: comparison };
  }
}

module.exports = {
  validatePackStoryParity: validatePackStoryParity,
  compareSlidePlans: compareSlidePlans,
  deriveRegistryStoryId: deriveRegistryStoryId,
  cleanupTempDir: cleanupTempDir
};
