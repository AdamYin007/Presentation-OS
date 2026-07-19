#!/usr/bin/env node
/**
 * M12.20 — Brand Template Profile Packs Tests
 *
 * Focused fixtures covering:
 *   1. Built-in profiles (minimal-modern, business-consulting, academic-clean)
 *   2. Custom JSON profile loading
 *   3. Invalid profile rejection (missing file, bad JSON, bad schema)
 *   4. Profile influence on logo safe-area and visual design gate
 *
 * Usage:
 *   node tests/m12-20-brand-template-profile-packs.test.js
 *   npm run check:m12-20-brand-template-profile-packs
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
  loadProfile,
  resolveBrandConfig,
  validateProfile,
  getBuiltInProfiles,
  isBuiltinProfile,
  BUILTINS,
} = require("../packages/brand-profiles/src/index.js");
const { checkLogoSafeArea, DEFAULT_SAFE_AREA, SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX } = require("../packages/logo-safe-area-gate/src/index.js");

const ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT, "fixtures", "m12-20");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}: expected "${expected}", got "${actual}"`);
  }
}

// ─── Test Helpers ────────────────────────────────────────────────

function makeSlideSpec(logoBox) {
  return {
    id: "s1", index: 1, section: "Intro", role: "title-slide", title: "Title",
    keyMessage: "", body: [], visualType: "none", layout: "title-slide",
    speakerNotes: "", sourceRefs: [],
    designHints: logoBox ? { logo: { boundingBox: logoBox } } : {},
  };
}

const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };

// ─── Tests ───────────────────────────────────────────────────────

function testModuleExports() {
  console.log("\n[Test] Module exports");
  assert(typeof loadProfile === "function", "loadProfile is exported");
  assert(typeof resolveBrandConfig === "function", "resolveBrandConfig is exported");
  assert(typeof validateProfile === "function", "validateProfile is exported");
  assert(typeof getBuiltInProfiles === "function", "getBuiltInProfiles is exported");
  assert(typeof isBuiltinProfile === "function", "isBuiltinProfile is exported");
  assert(typeof BUILTINS === "object", "BUILTINS map is exported");
  assert(typeof BUILTINS["minimal-modern"] === "object", "BUILTINS has minimal-modern");
  assert(typeof BUILTINS["business-consulting"] === "object", "BUILTINS has business-consulting");
  assert(typeof BUILTINS["academic-clean"] === "object", "BUILTINS has academic-clean");
}

function testGetBuiltInProfiles() {
  console.log("\n[Test] getBuiltInProfiles");
  const names = getBuiltInProfiles();
  assert(Array.isArray(names), "Returns an array");
  assertEqual(names.length, 3, "Has exactly 3 built-in profiles");
  assert(names.includes("minimal-modern"), "Contains minimal-modern");
  assert(names.includes("business-consulting"), "Contains business-consulting");
  assert(names.includes("academic-clean"), "Contains academic-clean");
}

function testIsBuiltinProfile() {
  console.log("\n[Test] isBuiltinProfile");
  assert(isBuiltinProfile("minimal-modern") === true, "minimal-modern is builtin");
  assert(isBuiltinProfile("business-consulting") === true, "business-consulting is builtin");
  assert(isBuiltinProfile("academic-clean") === true, "academic-clean is builtin");
  assert(isBuiltinProfile("unknown-profile") === false, "unknown-profile is not builtin");
}

function testValidateProfile() {
  console.log("\n[Test] validateProfile");
  // Valid profile
  const valid = validateProfile({ name: "Test", logoSafeArea: { top: 10, bottom: 10, left: 10, right: 10 } });
  assert(valid.valid === true, "Valid profile passes validation");
  assertEqual(valid.errors.length, 0, "No errors for valid profile");

  // Missing required fields
  const invalid = validateProfile({});
  assert(invalid.valid === false, "Empty object fails validation");
  assert(invalid.errors.length > 0, "Reports at least one error");

  // Bad logoSafeArea
  const badSa = validateProfile({ name: "Test", logoSafeArea: "not-an-object" });
  assert(badSa.valid === false, "Bad logoSafeArea type fails");

  // Bad footerConvention
  const badFc = validateProfile({ name: "Test", footerConvention: "invalid" });
  assert(badFc.valid === false, "Invalid footerConvention fails");

  // Good minimal profile
  const minimal = validateProfile({ id: "test" });
  assert(minimal.valid === true, "Minimal profile with just id passes");
}

function testLoadBuiltins() {
  console.log("\n[Test] Load built-in profiles by name");
  const r1 = loadProfile("minimal-modern");
  assertEqual(r1.source, "builtin", "Source is 'builtin'");
  assertEqual(r1.profile.id, "minimal-modern", "Profile id matches");
  assertEqual(r1.profile.name, "Minimal Modern", "Profile name matches");
  assert(r1.profile.logoSafeArea.top === 40, "Default top margin is 40px");

  const r2 = loadProfile("business-consulting");
  assertEqual(r2.source, "builtin", "Business consulting source is 'builtin'");
  assertEqual(r2.profile.logoSafeArea.top, 50, "Business consulting top margin is 50px");
  assertEqual(r2.profile.footerConvention, "brand-name", "Business consulting uses brand-name footer");
  assert(r2.profile.allowedPalette.length > 0, "Has allowed palette");

  const r3 = loadProfile("academic-clean");
  assertEqual(r3.source, "builtin", "Academic clean source is 'builtin'");
  assertEqual(r3.profile.logoSafeArea.top, 30, "Academic clean top margin is 30px");
}

function testLoadCustomJsonProfile() {
  console.log("\n[Test] Load custom JSON profile from file");
  const customPath = path.join(FIXTURES_DIR, "custom-brand-profile.json");
  assert(fs.existsSync(customPath), "Custom fixture exists");

  const r = loadProfile(customPath);
  assertEqual(r.source.startsWith("file:"), true, "Source starts with 'file:'");
  assertEqual(r.profile.name, "Custom Client Brand", "Custom profile name loaded correctly");
  assertEqual(r.profile.logoSafeArea.top, 60, "Custom logo safe area top margin is 60px");
  assert(r.profile.allowedPalette.length === 4, "Custom palette has 4 colors");
  assertEqual(r.profile.footerConvention, "brand-name", "Custom footer convention applied");
  assertEqual(r.profile.titlePlacement, "center", "Custom title placement is center");
  assertEqual(r.profile.requiredSlides.titleSlide, true, "Custom requires title slide");
}

function testLoadMissingFile() {
  console.log("\n[Test] Reject missing profile file");
  try {
    loadProfile("/nonexistent/path/to/profile.json");
    assert(false, "Should have thrown for missing file");
  } catch (err) {
    assert(err.message.includes("not found"), "Error mentions 'not found'");
    assert(err.message.includes("Available built-ins"), "Error lists available built-ins");
  }
}

function testLoadInvalidJson() {
  console.log("\n[Test] Reject invalid JSON file");
  const invalidPath = path.join(FIXTURES_DIR, "invalid-profile.json");
  if (!fs.existsSync(invalidPath)) {
    // Create it if missing
    fs.writeFileSync(invalidPath, "{ not valid json !!!\n");
  }
  try {
    loadProfile(invalidPath);
    assert(false, "Should have thrown for invalid JSON");
  } catch (err) {
    assert(err.message.includes("Invalid JSON") || err.message.includes("JSON"), "Error mentions JSON issue");
  }
}

function testLoadBadSchema() {
  console.log("\n[Test] Reject profile with invalid schema");
  const badPath = path.join(FIXTURES_DIR, "bad-schema-profile.json");
  assert(fs.existsSync(badPath), "Bad schema fixture exists");

  try {
    loadProfile(badPath);
    assert(false, "Should have thrown for bad schema");
  } catch (err) {
    assert(err.message.includes("validation failed") || err.message.includes("Validation"), "Error mentions validation failure");
    assert(err.message.includes("logoSafeArea"), "Error mentions logoSafeArea field");
  }
}

function testResolveBrandConfig() {
  console.log("\n[Test] resolveBrandConfig flattens profile");
  const r = loadProfile("business-consulting");
  const config = resolveBrandConfig(r.profile);

  assert(config.logoSafeArea !== undefined, "logoSafeArea present in config");
  assertEqual(config.logoSafeArea.top, 50, "Top margin preserved");
  assertEqual(config.logoSafeArea.bottom, 50, "Bottom margin preserved");
  assertEqual(config.logoSafeArea.left, 50, "Left margin preserved");
  assertEqual(config.logoSafeArea.right, 50, "Right margin preserved");

  assert(Array.isArray(config.allowedPalette), "allowedPalette preserved as array");
  assertEqual(config.footerConvention, "brand-name", "footerConvention preserved");
  assertEqual(config.titlePlacement, "top", "titlePlacement preserved");
  assertEqual(config.requiredTitleSlide, true, "requiredTitleSlide resolved to boolean");
  assertEqual(config.requiredClosingSlide, true, "requiredClosingSlide defaults true");
  assertEqual(config.maxSlidesPerSection, 8, "maxSlidesPerSection preserved");
}

function testLogoSafeAreaInfluence() {
  console.log("\n[Test] Profile influences logo safe-area checker");
  // A logo that passes with default margins should fail with tight margins from a profile
  const specs = [makeSlideSpec({ x: 50, y: 50, width: 80, height: 30 })];

  // With default margins: should pass
  const defaultResult = checkLogoSafeArea(specs, layoutPlan);
  assertEqual(defaultResult.verdict, "PASS", "Logo passes with default margins");

  // With business-consulting margins (50px all sides): same logo should still pass
  const bcR = loadProfile("business-consulting");
  const bcConfig = resolveBrandConfig(bcR.profile);
  const bcResult = checkLogoSafeArea(specs, layoutPlan, bcConfig);
  assertEqual(bcResult.verdict, "PASS", "Logo passes at business-consulting 50px margin boundary");
  assert(bcResult.margins.top === 50, "Business consulting margins applied (top=50)");

  // With very tight margins from custom profile: should fail
  const tightConfig = { logoSafeArea: { top: 200, bottom: 200, left: 200, right: 200 } };
  const tightResult = checkLogoSafeArea(specs, layoutPlan, tightConfig);
  assertEqual(tightResult.verdict, "FAIL", "Tight margins cause FAIL");
  assert(tightResult.failCount === 1, "One failure with tight margins");
}

function testDeliverPptxIntegration() {
  console.log("\n[Test] deliver-pptx.js integration");
  const scriptPath = path.join(ROOT, "scripts", "deliver-pptx.js");
  assert(fs.existsSync(scriptPath), "deliver-pptx.js exists");

  const content = fs.readFileSync(scriptPath, "utf8");
  assert(content.includes("--brand-profile"), "--brand-profile flag in help text");
  assert(content.includes("loadProfile"), "Uses loadProfile function");
  assert(content.includes("resolveBrandConfig"), "Uses resolveBrandConfig function");
  assert(content.includes("brandConfig"), "brandConfig variable used");
  assert(content.includes("profileSource"), "profileSource tracked for reporting");
}

function testNpmScriptsRegistered() {
  console.log("\n[Test] NPM scripts registered in package.json");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert(pkg.scripts["check:m12-20-brand-template-profile-packs"] !== undefined,
    "npm script check:m12-20-brand-template-profile-packs is registered");
}

function testPackageExists() {
  console.log("\n[Test] Package directory exists");
  const pkgPath = path.join(ROOT, "packages", "brand-profiles", "src", "index.js");
  assert(fs.existsSync(pkgPath), "packages/brand-profiles/src/index.js exists");
  assert(fs.existsSync(path.join(ROOT, "packages", "brand-profiles", "package.json")),
    "packages/brand-profiles/package.json exists");
  assert(fs.existsSync(path.join(ROOT, "packages", "brand-profiles", "src", "schema.js")),
    "packages/brand-profiles/src/schema.js exists");
  assert(fs.existsSync(path.join(ROOT, "packages", "brand-profiles", "src", "builtins.js")),
    "packages/brand-profiles/src/builtins.js exists");
  assert(fs.existsSync(path.join(ROOT, "packages", "brand-profiles", "src", "loader.js")),
    "packages/brand-profiles/src/loader.js exists");
}

function testSpecDocumentExists() {
  console.log("\n[Test] Spec document exists");
  const specPath = path.join(ROOT, "docs", "M12_20_BRAND_TEMPLATE_PROFILE_PACKS_SPEC.md");
  assert(fs.existsSync(specPath), "M12_20_BRAND_TEMPLATE_PROFILE_PACKS_SPEC.md exists");
}

// ─── Run All Tests ──────────────────────────────────────────────

console.log("=".repeat(65));
console.log("M12.20 — Brand Template Profile Packs Tests");
console.log("=".repeat(65));

try {
  testModuleExports();
  testGetBuiltInProfiles();
  testIsBuiltinProfile();
  testValidateProfile();
  testLoadBuiltins();
  testLoadCustomJsonProfile();
  testLoadMissingFile();
  testLoadInvalidJson();
  testLoadBadSchema();
  testResolveBrandConfig();
  testLogoSafeAreaInfluence();
  testDeliverPptxIntegration();
  testNpmScriptsRegistered();
  testPackageExists();
  testSpecDocumentExists();
} catch (err) {
  console.error("\nUnexpected error during tests:", err.message);
  console.error(err.stack);
  failedTests++;
}

console.log("\n" + "=".repeat(65));
console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
console.log("=".repeat(65));

if (failedTests > 0) process.exit(1);
process.exit(0);
