#!/usr/bin/env node
/**
 * Pack Runtime Boundary Smoke Checks — M7.4
 *
 * Validates frozen Pack Runtime Boundary assumptions from M7.0-M7.3.
 *
 * Run:
 *   node scripts/pack-runtime-boundary-smoke.js
 *
 * Output: PASS/FAIL style. Exits non-zero on any failure.
 * No external dependencies — Node built-ins only.
 *
 * This smoke does NOT:
 * - Replace unit tests.
 * - Implement CI.
 * - Make packs default source of truth.
 * - Change CLI behavior.
 * - Change rendering behavior.
 * - Implement resolver/loader consolidation.
 *
 * This smoke IS a manual regression guard for M7 frozen boundaries.
 */

var path = require("path");
var fs = require("fs");
var { spawnSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..", "..", "..", "..");
var BIN = path.join(ROOT, "registry", "packages", "ppt-factory", "bin", "run.js");
var SRC = path.join(ROOT, "registry", "packages", "ppt-factory", "src");
var PKG_JSON = path.join(ROOT, "registry", "packages", "ppt-factory", "package.json");
var RUN_JS = path.join(ROOT, "registry", "packages", "ppt-factory", "bin", "run.js");

var passed = 0;
var failed = 0;
var total = 0;

function check(name, condition) {
  total++;
  if (condition) {
    passed++;
    console.log("PASS " + name);
  } else {
    failed++;
    console.log("FAIL " + name);
  }
  return condition;
}

// ====================================================================
// A. Pack loader/context boundary
// ====================================================================
console.log("");
console.log("=== A. Pack loader/context boundary ===");

var loader = require(SRC + "/pack-loader");
var lp = loader.loadPack("digital-pathology");
check("loadPack digital-pathology returns ok", lp.ok === true);

var ctx = lp.ok ? lp.context : null;
check("context exists", !!ctx);

if (ctx) {
  check("context is frozen", Object.isFrozen(ctx));
  check("context.governance exists", !!ctx.governance);
  check("context.runtime exists", !!ctx.runtime);
  check("context.boundaries exists", !!ctx.boundaries);
  check("context.sourceOfTruth exists", !!ctx.sourceOfTruth);
  check("context.outputPolicy exists", !!ctx.outputPolicy);
  check("context.validation exists", !!ctx.validation);

  // Required boundary values
  check("boundaries.storyRegistryDefault === true", ctx.boundaries && ctx.boundaries.storyRegistryDefault === true);
  check("boundaries.packStoryExplicit === true", ctx.boundaries && ctx.boundaries.packStoryExplicit === true);
  check("boundaries.automaticPackLookup === false", ctx.boundaries && ctx.boundaries.automaticPackLookup === false);
  check("boundaries.plannerExtraction === false", ctx.boundaries && ctx.boundaries.plannerExtraction === false);
  check("boundaries.adapterExtraction === false", ctx.boundaries && ctx.boundaries.adapterExtraction === false);
  check("boundaries.themeExtraction === false", ctx.boundaries && ctx.boundaries.themeExtraction === false);
  check("boundaries.sourceOfTruthMigration === false", ctx.boundaries && ctx.boundaries.sourceOfTruthMigration === false);
  check("sourceOfTruth.packsAreDefault === false", ctx.sourceOfTruth && ctx.sourceOfTruth.packsAreDefault === false);
  check("runtime.loadedByDefault === false", ctx.runtime && ctx.runtime.loadedByDefault === false);
  check("runtime.requiresPackLoader === true", ctx.runtime && ctx.runtime.requiresPackLoader === true);
  check("governance.coreChangesAllowed === false", ctx.governance && ctx.governance.coreChangesAllowed === false);
}

// ====================================================================
// B. CLI output compatibility smoke
// ====================================================================
console.log("");
console.log("=== B. CLI output compatibility smoke ===");

function runCli(args) {
  return spawnSync("node", [BIN].concat(args), {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
  });
}

// --list-packs
var lpOut = runCli(["--list-packs"]);
check("--list-packs exit code 0", lpOut.status === 0);
var lpStdout = lpOut.stdout || "";
check("--list-packs includes 'Available Presentation Packs:'", lpStdout.indexOf("Available Presentation Packs:") !== -1);
check("--list-packs includes '- digital-pathology'", lpStdout.indexOf("- digital-pathology") !== -1);
check("--list-packs includes 'validation: passed'", lpStdout.indexOf("validation: passed") !== -1);
check("--list-packs does NOT include 'boundaries:'", lpStdout.indexOf("boundaries:") === -1);
check("--list-packs does NOT include 'sourceOfTruth:'", lpStdout.indexOf("sourceOfTruth:") === -1);
check("--list-packs does NOT include 'outputPolicy:'", lpStdout.indexOf("outputPolicy:") === -1);

// --inspect-pack digital-pathology
var ipOut = runCli(["--inspect-pack", "digital-pathology"]);
check("--inspect-pack exit code 0", ipOut.status === 0);
var ipStdout = ipOut.stdout || "";
check("--inspect-pack includes 'Presentation Pack: digital-pathology'", ipStdout.indexOf("Presentation Pack: digital-pathology") !== -1);
check("--inspect-pack includes 'validation: passed'", ipStdout.indexOf("validation: passed") !== -1);
check("--inspect-pack includes 'runtime:'", ipStdout.indexOf("runtime:") !== -1);
check("--inspect-pack includes 'governance:'", ipStdout.indexOf("governance:") !== -1);
check("--inspect-pack does NOT include 'boundaries:'", ipStdout.indexOf("boundaries:") === -1);
check("--inspect-pack does NOT include 'sourceOfTruth:'", ipStdout.indexOf("sourceOfTruth:") === -1);
check("--inspect-pack does NOT include 'outputPolicy:'", ipStdout.indexOf("outputPolicy:") === -1);

// ====================================================================
// C. --story boundary smoke
// ====================================================================
console.log("");
console.log("=== C. --story boundary smoke ===");

var storyOut = runCli(["--story", "digital-pathology-15"]);
check("--story exit code 0", storyOut.status === 0);
var storyStdout = storyOut.stdout || "";
check("--story includes 'PPT generated'", storyStdout.indexOf("PPT generated") !== -1);
check("--story does NOT include 'Pack Story Resolution:'", storyStdout.indexOf("Pack Story Resolution:") === -1);
check("--story does NOT include 'Loaded pack story from:'", storyStdout.indexOf("Loaded pack story from:") === -1);
check("--story does NOT include 'presentation-packs/digital-pathology/stories'", storyStdout.indexOf("presentation-packs/digital-pathology/stories") === -1);

// ====================================================================
// D. --pack-story boundary smoke
// ====================================================================
console.log("");
console.log("=== D. --pack-story boundary smoke ===");

var psOut = runCli(["--pack-story", "digital-pathology/digital-pathology-15"]);
check("--pack-story exit code 0", psOut.status === 0);
var psStdout = psOut.stdout || "";
check("--pack-story includes 'Pack Story Resolution:'", psStdout.indexOf("Pack Story Resolution:") !== -1);
check("--pack-story includes 'pack: digital-pathology'", psStdout.indexOf("pack: digital-pathology") !== -1);
check("--pack-story includes 'story: digital-pathology-15'", psStdout.indexOf("story: digital-pathology-15") !== -1);
check("--pack-story includes 'Loaded pack story from:'", psStdout.indexOf("Loaded pack story from:") !== -1);
check("--pack-story includes 'presentation-packs/digital-pathology/stories/digital-pathology-15.json'", psStdout.indexOf("presentation-packs/digital-pathology/stories/digital-pathology-15.json") !== -1);
check("--pack-story includes pack output path", psStdout.indexOf("output/ppt-factory/packs/digital-pathology/digital-pathology-15.pptx") !== -1);

// ====================================================================
// E. Parity smoke
// ====================================================================
console.log("");
console.log("=== E. Parity smoke ===");

var pvOut = runCli(["--validate-pack-story-parity", "digital-pathology/digital-pathology-15"]);
check("--validate-pack-story-parity exit code 0", pvOut.status === 0);
var pvStdout = pvOut.stdout || "";
check("Parity includes 'Parity: passed'", pvStdout.indexOf("Parity: passed") !== -1);
check("Parity includes 'identical slide plans'", pvStdout.indexOf("identical slide plans") !== -1);

// ====================================================================
// F. Help / unknown flag smoke
// ====================================================================
console.log("");
console.log("=== F. Help / unknown flag smoke ===");

var helpOut = runCli(["--help"]);
check("--help exit code 0", helpOut.status === 0);
var helpStdout = helpOut.stdout || "";
check("--help includes '--story <id>'", helpStdout.indexOf("--story <id>") !== -1);
check("--help includes '--pack-story <pack-id>/<story-id>'", helpStdout.indexOf("--pack-story <pack-id>/<story-id>") !== -1);
check("--help includes registry story source note", helpStdout.indexOf("Default --story still uses registry story sources.") !== -1);
check("--help includes source-of-truth note", helpStdout.indexOf("does not make packs the default source of truth") !== -1);

var ufOut = runCli(["--unknown-flag"]);
check("--unknown-flag exit code non-zero", ufOut.status !== 0);
var ufOutput = (ufOut.stdout || "") + (ufOut.stderr || "");
check("--unknown-flag includes 'Unsupported option: --unknown-flag'", ufOutput.indexOf("Unsupported option: --unknown-flag") !== -1);

// ====================================================================
// G. Source file boundary smoke
// ====================================================================
console.log("");
console.log("=== G. Source file boundary smoke ===");

// Read bin/run.js
var runJs = "";
try {
  runJs = fs.readFileSync(RUN_JS, "utf8");
} catch (e) {
  runJs = "";
}
check("bin/run.js contains --pack-story", runJs.indexOf("--pack-story") !== -1);
check("bin/run.js contains --story", runJs.indexOf("--story") !== -1);
check("bin/run.js contains registry story source note", runJs.indexOf("Default --story still uses registry story sources.") !== -1);

// ====================================================================
// Summary
// ====================================================================
console.log("");
console.log("===========================================");
if (failed > 0) {
  console.log("Boundary smoke: FAILED (" + passed + "/" + total + " checks, " + failed + " failures)");
  process.exit(1);
} else {
  console.log("Boundary smoke: passed (" + passed + "/" + total + " checks)");
  process.exit(0);
}
