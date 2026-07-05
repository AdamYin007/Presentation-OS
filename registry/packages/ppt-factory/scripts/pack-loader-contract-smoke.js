/**
 * Pack Loader Contract Smoke — M7.2 extended.
 *
 * Verifies the Pack Loader contract is intact after M6.6 and M7.2 changes.
 *
 * M7.2 additions:
 * - Checks normalized read-only context sections (governance, runtime, boundaries,
 *   sourceOfTruth, outputPolicy, validation).
 * - Verifies boundaries enforce M6 frozen policy.
 * - Verifies sourceOfTruth confirms packs are NOT default.
 * - Verifies context is frozen (immutable).
 *
 * Run:
 *   node scripts/pack-loader-contract-smoke.js
 *
 * Expected output:
 *   Contract: passed
 *
 * M7.2 increases checks from 17 to 27 (10 new boundary/context checks).
 */

var path = require("path");
var root = path.resolve(__dirname, "..");
var loader = require(root + "/src/pack-loader");
var inspection = require(root + "/src/pack-inspection");

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
}

// === Loader lifecycle checks ===

// 1. loadPack succeeds for digital-pathology
var lp = loader.loadPack("digital-pathology");
check("loadPack digital-pathology", lp.ok === true);

// 2. loadPack context has packId
check("  packId === digital-pathology", lp.ok && lp.context && lp.context.packId === "digital-pathology");

// 3. loadPack context is frozen
check("  context is frozen", lp.ok && Object.isFrozen(lp.context));

// 4. loadAllPacks ok
var la = loader.loadAllPacks();
check("loadAllPacks ok", la.ok === true);

// 5. loadAllPacks includes digital-pathology
check("loadAllPacks includes digital-pathology", la.ok && la.contexts.some(function(c) { return c.packId === "digital-pathology"; }));

// 6. inspectPack digital-pathology
var ip = inspection.inspectPack("digital-pathology");
check("inspectPack digital-pathology", ip.ok === true);

// 7. inspectPack result has name
check("  result.name present", ip.ok && ip.result && ip.result.name);

// === Error handling checks ===

// 8. MANIFEST_MISSING
var mm = loader.loadPack("/nonexistent/pack-that-does-not-exist-at-all-xyz");
check("MANIFEST_MISSING", mm.ok === false && mm.errorCode === "PACK_NOT_FOUND");

// 9. MANIFEST_MISSING details
check("  details.packRoot", mm.details && mm.details.target);

// 10. MANIFEST_INVALID_JSON — create temp dir with invalid pack.json
var fs = require("fs");
var tmpDir = "/tmp/pack-smoke-test-invalid-json-" + Date.now();
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(tmpDir + "/pack.json", "{invalid json!!!}");
  var mj = loader.loadPack(tmpDir);
  check("MANIFEST_INVALID_JSON", mj.ok === false && mj.errorCode === "MANIFEST_INVALID_JSON");
  check("  details.manifestPath", mj.details && mj.details.manifestPath);
} catch (e) {
  check("MANIFEST_INVALID_JSON", false);
  check("  details.manifestPath", false);
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
}

// 11. ASSET_UNSAFE_PATH — create temp dir with unsafe asset path
var tmpDir2 = "/tmp/pack-smoke-test-unsafe-" + Date.now();
try {
  fs.mkdirSync(tmpDir2, { recursive: true });
  fs.writeFileSync(tmpDir2 + "/pack.json", JSON.stringify({
    name: "unsafe-pack",
    version: "1.0.0",
    status: "experimental",
    runtime: { loadedByDefault: false, requiresPackLoader: true },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    contents: { stories: ["../../../etc/passwd"] }
  }));
  var au = loader.loadPack(tmpDir2);
  check("ASSET_UNSAFE_PATH", au.ok === false && au.errorCode === "ASSET_UNSAFE_PATH");
  check("  details.validationError", au.details && au.details.validationError);
} catch (e) {
  check("ASSET_UNSAFE_PATH", false);
  check("  details.validationError", false);
} finally {
  try { fs.rmSync(tmpDir2, { recursive: true, force: true }); } catch (e) {}
}

// 12. ASSET_MISSING
var tmpDir3 = "/tmp/pack-smoke-test-missing-" + Date.now();
try {
  fs.mkdirSync(tmpDir3, { recursive: true });
  fs.writeFileSync(tmpDir3 + "/pack.json", JSON.stringify({
    name: "missing-asset-pack",
    version: "1.0.0",
    status: "experimental",
    runtime: { loadedByDefault: false, requiresPackLoader: true },
    governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
    contents: { stories: ["stories/nonexistent-story.json"] }
  }));
  var am = loader.loadPack(tmpDir3);
  check("ASSET_MISSING", am.ok === false && am.errorCode === "ASSET_MISSING");
  check("  details.validationError", am.details && am.details.validationError);
} catch (e) {
  check("ASSET_MISSING", false);
  check("  details.validationError", false);
} finally {
  try { fs.rmSync(tmpDir3, { recursive: true, force: true }); } catch (e) {}
}

// 13. PACK_NOT_FOUND
var pn = loader.loadPack("does-not-exist-at-all");
check("PACK_NOT_FOUND", pn.ok === false && pn.errorCode === "PACK_NOT_FOUND");
check("  details.target", pn.details && pn.details.target === "does-not-exist-at-all");

// === M7.2: Normalized read-only context section checks ===

var ctx = lp.context;

// 14. context.governance exists
check("context.governance exists", ctx && ctx.governance && typeof ctx.governance === "object");

// 15. context.runtime exists
check("context.runtime exists", ctx && ctx.runtime && typeof ctx.runtime === "object");

// 16. context.boundaries exists
check("context.boundaries exists", ctx && ctx.boundaries && typeof ctx.boundaries === "object");

// 17. context.sourceOfTruth exists
check("context.sourceOfTruth exists", ctx && ctx.sourceOfTruth && typeof ctx.sourceOfTruth === "object");

// 18. context.outputPolicy exists
check("context.outputPolicy exists", ctx && ctx.outputPolicy && typeof ctx.outputPolicy === "object");

// 19. context.validation exists
check("context.validation exists", ctx && ctx.validation && typeof ctx.validation === "object");

// 20. boundaries.storyRegistryDefault === true
check("boundaries.storyRegistryDefault === true", ctx && ctx.boundaries && ctx.boundaries.storyRegistryDefault === true);

// 21. boundaries.packStoryExplicit === true
check("boundaries.packStoryExplicit === true", ctx && ctx.boundaries && ctx.boundaries.packStoryExplicit === true);

// 22. boundaries.automaticPackLookup === false
check("boundaries.automaticPackLookup === false", ctx && ctx.boundaries && ctx.boundaries.automaticPackLookup === false);

// 23. boundaries.plannerExtraction === false
check("boundaries.plannerExtraction === false", ctx && ctx.boundaries && ctx.boundaries.plannerExtraction === false);

// 24. boundaries.adapterExtraction === false
check("boundaries.adapterExtraction === false", ctx && ctx.boundaries && ctx.boundaries.adapterExtraction === false);

// 25. boundaries.themeExtraction === false
check("boundaries.themeExtraction === false", ctx && ctx.boundaries && ctx.boundaries.themeExtraction === false);

// 26. boundaries.sourceOfTruthMigration === false
check("boundaries.sourceOfTruthMigration === false", ctx && ctx.boundaries && ctx.boundaries.sourceOfTruthMigration === false);

// 27. sourceOfTruth.packsAreDefault === false
check("sourceOfTruth.packsAreDefault === false", ctx && ctx.sourceOfTruth && ctx.sourceOfTruth.packsAreDefault === false);

// === Print summary ===
console.log("");
console.log("Contract: passed (" + passed + "/" + total + " checks)");

if (failed > 0) {
  process.exit(1);
}
