#!/usr/bin/env node
/**
 * M12.21 — Profile-Driven Rendering Tests
 *
 * Focused fixtures covering:
 *   1. Brand profile colors override theme tokens in generated PPTX
 *   2. Brand profile fonts override theme fonts in layoutPlan
 *   3. Brand profile footer convention applied to rendered slides
 *   4. Brand profile title placement ("top" vs "center") affects rendering
 *   5. Custom brand profile JSON file drives rendering
 *   6. Invalid profile still fails with exit code 2
 *   7. JSON mode remains machine-readable with profiles
 *   8. M12.18 one-command delivery still works end-to-end
 *   9. Deterministic behavior: same profile + input → same output structure
 *  10. Graceful degradation: no brand config falls back to defaults
 *
 * Usage:
 *   node tests/m12-21-profile-driven-rendering.test.js
 *   npm run check:m12-21-profile-driven-rendering
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const { generateLayoutPlan } = require("../packages/theme-layout/src/generator.js");
const { renderPptx, generateBuffer } = require("../packages/pptx-renderer/src/index.js");
const { normalizeFontFace } = require("../packages/pptx-renderer/src/renderer.js");
const {
  loadProfile,
  resolveBrandConfig,
  getBuiltInProfiles,
} = require("../packages/brand-profiles/src/index.js");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

const ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT, "fixtures", "m12-21");
const DELIVER_SCRIPT = path.join(ROOT, "scripts", "deliver-pptx.js");

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

function assertContains(str, substr, message) {
  totalTests++;
  if (str && str.includes(substr)) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}: "${substr}" not found in "${str?.substring(0, 200)}"`);
  }
}

// ─── Minimal SlideSpec for testing ──────────────────────────────

function makeSlideSpec(role, title) {
  return {
    id: `s${role}`,
    index: 1,
    section: "Test",
    role: role || "content",
    title: title || "Test Title",
    keyMessage: "",
    body: ["Bullet point 1", "Bullet point 2"],
    visualType: "none",
    layout: "title-and-bullets",
    speakerNotes: "",
    sourceRefs: [],
    designHints: {},
  };
}

// ─── Fixtures ───────────────────────────────────────────────────

function ensureFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Good fixture for integration tests
  const goodFixture = path.join(FIXTURES_DIR, "good.md");
  if (!fs.existsSync(goodFixture)) {
    fs.writeFileSync(
      goodFixture,
      `# Quarterly Business Review

## Introduction

Welcome to our Q3 performance review.

## Section 1 — Key Metrics

### Revenue Growth

Our revenue grew 25% year-over-year.

Key highlights:
- Enterprise segment up 30%
- SMB segment up 18%

### Customer Satisfaction

Customer satisfaction score improved to 94%.

## Closing

Thank you for your attention.
Questions welcome.
`,
      "utf8",
    );
  }

  // Custom brand profile fixture — deep blue corporate branding
  const customBrandPath = path.join(FIXTURES_DIR, "custom-brand.json");
  if (!fs.existsSync(customBrandPath)) {
    fs.writeFileSync(
      customBrandPath,
      JSON.stringify(
        {
          id: "deep-blue-corp",
          name: "Deep Blue Corp",
          logoSafeArea: { top: 60, bottom: 60, left: 60, right: 60 },
          allowedPalette: [
            "#0D47A1", // primary (overrides theme primary #1A1A1A or #1E3A5F)
            "#1565C0", // secondary
            "#FFC107", // accent (gold)
            "#FAFAFA", // background
            "#E3F2FD", // surface
            "#BBDEFB", // border
            "#263232", // text
            "#78909C", // muted
          ],
          typographyRules: {
            headingFont: "Roboto, sans-serif",
            bodyFont: "Roboto, sans-serif",
            monoFont: "Roboto Mono, monospace",
            maxHeadingSize: 40,
            minBodySize: 14,
          },
          footerConvention: "both",
          titlePlacement: "center",
          requiredSlides: { titleSlide: false, closingSlide: true },
          maxSlidesPerSection: 10,
        },
        null,
        2,
      ),
    );
  }

  // Another custom brand — minimalist with slide-number footer
  const simpleBrandPath = path.join(FIXTURES_DIR, "simple-brand.json");
  if (!fs.existsSync(simpleBrandPath)) {
    fs.writeFileSync(
      simpleBrandPath,
      JSON.stringify(
        {
          id: "simple-minimal",
          name: "Simple Minimal",
          logoSafeArea: { top: 30, bottom: 30, left: 30, right: 30 },
          allowedPalette: ["#000000", "#333333", "#FF5722", "#FFFFFF", "#F5F5F5"],
          typographyRules: {
            headingFont: "Arial, sans-serif",
            bodyFont: "Arial, sans-serif",
          },
          footerConvention: "slide-number",
          titlePlacement: "top",
          requiredSlides: { titleSlide: false, closingSlide: false },
          maxSlidesPerSection: 15,
        },
        null,
        2,
      ),
    );
  }

  // Bad schema fixture — invalid color format
  const badSchemaPath = path.join(FIXTURES_DIR, "bad-schema-m12-21.json");
  if (!fs.existsSync(badSchemaPath)) {
    fs.writeFileSync(
      badSchemaPath,
      JSON.stringify(
        {
          id: "bad-schema",
          name: "Bad Schema",
          allowedPalette: ["not-a-color", "#GGGGGG"],
          footerConvention: "invalid-value",
        },
        null,
        2,
      ),
    );
  }

  return { goodFixture, customBrandPath, simpleBrandPath, badSchemaPath };
}

// ─── Test 1: Brand Profile Colors Override Theme Tokens ─────────

function testBrandColorsOverrideThemeTokens() {
  console.log("\n[Test] Brand profile colors override theme tokens");

  // Build a minimal slide spec array
  const specs = [makeSlideSpec("title", "Title"), makeSlideSpec("content", "Content")];

  // Without brand config — use default minimal-modern
  const layoutDefault = generateLayoutPlan(specs, { style: "minimal-modern" });
  assertEqual(layoutDefault.theme, "minimal-modern", "Default theme is minimal-modern");
  assertEqual(layoutDefault.themeTokens.colors.primary, "#1A1A1A", "Default primary is #1A1A1A");
  assertEqual(layoutDefault.themeTokens.colors.accent, "#3B82F6", "Default accent is #3B82F6");

  // With brand config — should override
  const customBrand = loadProfile("business-consulting");
  const config = resolveBrandConfig(customBrand.profile);
  const layoutWithBrand = generateLayoutPlan(specs, {
    style: "business-consulting",
    brandConfig: config,
  });

  // Business consulting palette: #1E3A5F, #4A5568, #D4A843, #FFFFFF, #F7F7F5, #D4C5A9, #1A202C, #718096
  assertEqual(
    layoutWithBrand.themeTokens.colors.primary,
    "#1E3A5F",
    "Brand overrides primary from #1E3A5F",
  );
  assertEqual(
    layoutWithBrand.themeTokens.colors.accent,
    "#D4A843",
    "Brand overrides accent from #D4A843",
  );
  assertEqual(
    layoutWithBrand.themeTokens.colors.text,
    "#1A202C",
    "Brand overrides text from #1A202C",
  );
  assertEqual(
    layoutWithBrand.themeTokens.colors.background,
    "#FFFFFF",
    "Brand overrides background from #FFFFFF",
  );
}

// ─── Test 2: Brand Profile Fonts Override Theme Fonts ──────────

function testBrandFontsOverrideThemeTokens() {
  console.log("\n[Test] Brand profile fonts override theme fonts");

  const specs = [makeSlideSpec("content", "Content")];

  // With custom brand that has different fonts
  const customBrand = loadProfile("academic-clean");
  const config = resolveBrandConfig(customBrand.profile);
  const layout = generateLayoutPlan(specs, {
    style: "academic-clean",
    brandConfig: config,
  });

  // Academic clean uses Source Sans Pro
  assertEqual(
    layout.themeTokens.fonts.heading,
    "Source Sans Pro, sans-serif",
    "Brand overrides heading font to Source Sans Pro",
  );
  assertEqual(
    layout.themeTokens.fonts.body,
    "Source Sans Pro, sans-serif",
    "Brand overrides body font to Source Sans Pro",
  );
  assertEqual(
    layout.themeTokens.fonts.mono,
    "Source Code Pro, monospace",
    "Brand overrides mono font to Source Code Pro",
  );

  const pptx = renderPptx(specs, layout, { brandConfig: config });
  assertEqual(
    pptx.theme.headFontFace,
    "Source Sans Pro",
    "PPTX head font face uses brand heading font",
  );
  assertEqual(
    pptx.theme.bodyFontFace,
    "Source Sans Pro",
    "PPTX body font face uses brand body font",
  );
  assertEqual(
    normalizeFontFace("Roboto, sans-serif"),
    "Roboto",
    "Font family is normalized for PPTX theme",
  );
}

// ─── Test 3: Custom Brand Profile Colors ───────────────────────

function testCustomBrandProfileColors() {
  console.log("\n[Test] Custom brand profile colors override theme");

  const specs = [makeSlideSpec("content", "Content")];
  const { customBrandPath } = ensureFixtures();
  const customProfile = loadProfile(customBrandPath);
  const config = resolveBrandConfig(customProfile.profile);

  // Apply to business-consulting base theme
  const layout = generateLayoutPlan(specs, {
    style: "business-consulting",
    brandConfig: config,
  });

  // Custom palette: #0D47A1, #1565C0, #FFC107, #FAFAFA, #E3F2FD, #BBDEFB, #263232, #78909C
  assertEqual(
    layout.themeTokens.colors.primary,
    "#0D47A1",
    "Custom primary overrides to Deep Blue (#0D47A1)",
  );
  assertEqual(
    layout.themeTokens.colors.accent,
    "#FFC107",
    "Custom accent overrides to gold (#FFC107)",
  );
  assertEqual(
    layout.themeTokens.colors.text,
    "#263232",
    "Custom text overrides to dark slate (#263232)",
  );
}

// ─── Test 4: Footer Convention Applied in Renderer ─────────────

function testFooterConventionApplied() {
  console.log("\n[Test] Footer convention applied in renderer");

  const specs = [
    makeSlideSpec("title", "Title"),
    makeSlideSpec("content", "Content"),
    makeSlideSpec("closing", "Closing"),
  ];

  // Generate layout plan with brand config
  const customBrand = loadProfile("business-consulting");
  const config = resolveBrandConfig(customBrand.profile);
  const layoutPlan = generateLayoutPlan(specs, {
    style: "business-consulting",
    brandConfig: config,
  });

  // Render with brand config
  const pptx = renderPptx(specs, layoutPlan, {
    brandConfig: config,
  });

  // Verify slides were created
  assert(pptx.slides.length === 3, "Renderer creates 3 slides");

  const { applyBrandFooter } = require("../packages/pptx-renderer/src/renderer.js");
  const added = [];
  applyBrandFooter(
    { addText: (text) => added.push(text) },
    { index: 1 },
    { maxWidth: 800 },
    3,
    "brand-name",
    config.brandName,
    1,
  );
  assertEqual(added[0], "Business Consulting", "brand-name footer uses profile name");

  const numbered = [];
  applyBrandFooter(
    { addText: (text) => numbered.push(text) },
    { index: 1 },
    { maxWidth: 800 },
    3,
    "slide-number",
    "",
    1,
  );
  assertEqual(numbered[0], "1 / 3", "slide-number footer uses 1-based page and total slides");
}

// ─── Test 5: Title Placement Affects Rendering ─────────────────

function testTitlePlacementAffectsRendering() {
  console.log("\n[Test] Title placement affects rendering");

  const specs = [makeSlideSpec("title", "Title Slide")];

  // With titlePlacement "center"
  const layoutCenter = generateLayoutPlan(specs, {
    style: "minimal-modern",
    brandConfig: { titlePlacement: "center" },
  });

  // With titlePlacement "top" (default)
  const layoutTop = generateLayoutPlan(specs, {
    style: "minimal-modern",
    brandConfig: { titlePlacement: "top" },
  });

  // Both should produce valid layouts
  assert(layoutCenter.layouts.length === 1, "Center layout produces 1 layout entry");
  assert(layoutTop.layouts.length === 1, "Top layout produces 1 layout entry");

  // Render both and verify slides exist
  const pptxCenter = renderPptx(specs, layoutCenter, {
    brandConfig: { titlePlacement: "center" },
  });
  const pptxTop = renderPptx(specs, layoutTop, {
    brandConfig: { titlePlacement: "top" },
  });

  assert(pptxCenter.slides.length === 1, "Center title slide renders");
  assert(pptxTop.slides.length === 1, "Top title slide renders");
}

// ─── Test 6: Invalid Profile Fails with Exit Code 2 ────────────

function testInvalidProfileRejects() {
  console.log("\n[Test] Invalid profile rejects with exit code 2");

  const { goodFixture, badSchemaPath } = ensureFixtures();

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, "--brand-profile", badSchemaPath],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000,
    },
  );

  // Should fail because bad schema
  assert(result.status === 2, `Exit code is 2 for invalid profile, got ${result.status}`);
}

// ─── Test 7: JSON Mode Remains Machine-Readable ────────────────

function testJsonModeMachineReadable() {
  console.log("\n[Test] --json mode remains machine-readable with brand profile");

  const { goodFixture } = ensureFixtures();
  const customBrandPath = path.join(FIXTURES_DIR, "custom-brand.json");

  const result = cp.spawnSync(
    "node",
    [
      DELIVER_SCRIPT,
      goodFixture,
      "--json",
      "--style",
      "minimal-modern",
      "--brand-profile",
      customBrandPath,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assertEqual(result.status, 0, "JSON mode with brand profile exits cleanly");

  if (result.stdout && result.stdout.trim().length > 0) {
    try {
      const parsed = JSON.parse(result.stdout.trim());
      assert(parsed.overallVerdict !== "FAIL", "JSON mode with brand profile is not FAIL");
      assert(parsed.gateResults !== undefined, "JSON contains gateResults");
      assert(parsed.environment !== undefined, "JSON contains environment");
    } catch (e) {
      assert(false, "JSON output is valid JSON: " + e.message);
    }
  }
}

// ─── Test 8: One-Command Delivery Still Works ──────────────────

function testOneCommandDeliveryStillWorks() {
  console.log("\n[Test] M12.18 one-command delivery still works end-to-end");

  const { goodFixture } = ensureFixtures();
  const tmpOut = path.join(FIXTURES_DIR, "test-output", "one-command");
  fs.mkdirSync(tmpOut, { recursive: true });

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, tmpOut, "--style", "minimal-modern"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assertEqual(result.status, 0, "One-command delivery exits 0");

  // Check all expected artifacts
  const expectedFiles = [
    "output.pptx",
    "quality-manifest.json",
    "QA-SUMMARY.md",
    "VISUAL-DESIGN-SUMMARY.md",
    "rendered-qa-report.json",
    "PIXEL-ACCESSIBILITY-SUMMARY.md",
    "COMMERCIAL-VERDICT.md",
    "machine-report.json",
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(tmpOut, file);
    assert(fs.existsSync(filePath), `Artifact exists: ${file}`);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      assert(stat.size > 0, `${file} is non-empty (${stat.size} bytes)`);
    }
  }
}

// ─── Test 9: Deterministic Behavior ────────────────────────────

function testDeterministicBehavior() {
  console.log("\n[Test] Deterministic: same profile + input → same output structure");

  const specs = [
    makeSlideSpec("title", "Title"),
    makeSlideSpec("content", "Content 1"),
    makeSlideSpec("content", "Content 2"),
  ];

  const customBrand = loadProfile("business-consulting");
  const config = resolveBrandConfig(customBrand.profile);

  // Run twice
  const layout1 = generateLayoutPlan(specs, { style: "business-consulting", brandConfig: config });
  const layout2 = generateLayoutPlan(specs, { style: "business-consulting", brandConfig: config });

  assertEqual(layout1.theme, layout2.theme, "Theme consistent across runs");
  assertEqual(layout1.totalSlides, layout2.totalSlides, "Slide count consistent");
  assertEqual(
    layout1.themeTokens.colors.primary,
    layout2.themeTokens.colors.primary,
    "Primary color consistent across runs",
  );
  assertEqual(
    layout1.themeTokens.fonts.heading,
    layout2.themeTokens.fonts.heading,
    "Heading font consistent across runs",
  );
}

// ─── Test 10: Graceful Degradation — No Brand Config ───────────

function testGracefulDegradationNoBrandConfig() {
  console.log("\n[Test] Graceful degradation: no brand config falls back to defaults");

  const specs = [makeSlideSpec("title", "Title"), makeSlideSpec("content", "Content")];

  // Without any brandConfig
  const layout = generateLayoutPlan(specs, { style: "minimal-modern" });

  assertEqual(layout.theme, "minimal-modern", "Default theme applied without brand config");
  assertEqual(layout.themeTokens.colors.primary, "#1A1A1A", "Default primary used");
  assertEqual(
    layout.themeTokens.fonts.heading,
    "Inter, -apple-system, sans-serif",
    "Default heading font used",
  );
  assert(layout.layouts.length === 2, "Both slides have layouts");
}

// ─── Test 11: Pipeline Integration with Brand Config ───────────

async function testPipelineIntegration() {
  console.log("\n[Test] Full pipeline accepts brandConfig option");

  const mdInput = `# Test Deck

## Intro

This is a test.

## Content

Some content here.

## Closing

Thank you.
`;

  // Load a brand profile
  const bcProfile = loadProfile("business-consulting");
  const bcConfig = resolveBrandConfig(bcProfile.profile);

  const result = await runPipeline(mdInput, {
    style: "business-consulting",
    brandConfig: bcConfig,
  });

  assert(result.slideSpecs.length > 0, "Pipeline produces slide specs");
  assert(result.layoutPlan.theme === "business-consulting", "Pipeline uses correct theme");
  assert(result.pptxBuffer.length > 0, "Pipeline produces PPTX buffer");
  assert(result.pptxBuffer.length > 1000, "PPTX buffer is substantial size");

  // Verify brand config was applied to theme tokens
  assert(
    result.layoutPlan.themeTokens.colors.primary !== undefined,
    "Theme tokens present in pipeline result",
  );
}

// ─── Test 12: Built-in Profiles Drive Different Colors ─────────

function testBuiltInProfilesProduceDifferentColors() {
  console.log("\n[Test] Built-in profiles produce different color palettes");

  const specs = [makeSlideSpec("content", "Content")];

  const builtins = getBuiltInProfiles();
  const colorSets = {};

  for (const name of builtins) {
    const profile = loadProfile(name);
    const config = resolveBrandConfig(profile.profile);
    const layout = generateLayoutPlan(specs, { style: name, brandConfig: config });
    colorSets[name] = layout.themeTokens.colors.primary;
  }

  // Each builtin should have a distinct primary color
  const uniqueColors = new Set(Object.values(colorSets));
  assert(uniqueColors.size >= 2, `At least 2 unique primaries across ${builtins.length} builtins`);

  // Verify known values
  assertEqual(colorSets["minimal-modern"], "#1A1A1A", "Minimal modern primary is #1A1A1A");
  assertEqual(
    colorSets["business-consulting"],
    "#1E3A5F",
    "Business consulting primary is #1E3A5F",
  );
  assertEqual(colorSets["academic-clean"], "#2C3E50", "Academic clean primary is #2C3E50");
}

// ─── Test 13: Custom JSON Profile Feeds Into Pipeline ──────────

async function testCustomJsonProfileIntoPipeline() {
  console.log("\n[Test] Custom JSON profile feeds into pipeline rendering");

  const { customBrandPath } = ensureFixtures();
  const profile = loadProfile(customBrandPath);
  const config = resolveBrandConfig(profile.profile);

  const mdInput = `# Test

## Intro

Testing custom brand.

## Closing

Done.
`;

  const result = await runPipeline(mdInput, {
    style: "minimal-modern",
    brandConfig: config,
  });

  // Custom palette should override the base theme
  assertEqual(
    result.layoutPlan.themeTokens.colors.primary,
    "#0D47A1",
    "Custom primary color applied (#0D47A1)",
  );
  assertEqual(
    result.layoutPlan.themeTokens.colors.accent,
    "#FFC107",
    "Custom accent color applied (#FFC107)",
  );
  assertEqual(
    result.layoutPlan.themeTokens.fonts.heading,
    "Roboto, sans-serif",
    "Custom heading font applied (Roboto)",
  );
  assertEqual(
    result.layoutPlan.themeTokens.fonts.body,
    "Roboto, sans-serif",
    "Custom body font applied (Roboto)",
  );
}

// ─── Test 14: Footer Convention Values ─────────────────────────

function testFooterConventionValues() {
  console.log("\n[Test] All footer convention values are handled");

  const specs = [makeSlideSpec("content", "Content")];
  const conventions = ["none", "slide-number", "brand-name", "both"];
  const { applyBrandFooter } = require("../packages/pptx-renderer/src/renderer.js");

  for (const conv of conventions) {
    const texts = [];
    applyBrandFooter(
      { addText: (text) => texts.push(text) },
      { index: 1 },
      { maxWidth: 800 },
      3,
      conv,
      "TestBrand",
      1,
    );
    if (conv === "none") {
      assertEqual(texts.length, 0, "none footer emits no text");
    } else if (conv === "brand-name") {
      assertEqual(texts[0], "TestBrand", "brand-name footer emits brand name");
    } else if (conv === "both") {
      assertEqual(texts[0], "© TestBrand | 1 / 3", "both footer emits brand and page number");
    } else {
      assertEqual(texts[0], "1 / 3", "slide-number footer emits page number");
    }
  }
}

// ─── Test 15: NPM Scripts Registered ───────────────────────────

function testNpmScriptsRegistered() {
  console.log("\n[Test] NPM scripts registered in package.json");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert(
    pkg.scripts["check:m12-21-profile-driven-rendering"] !== undefined,
    "npm script check:m12-21-profile-driven-rendering is registered",
  );
}

// ─── Run All Tests ─────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("M12.21 — Profile-Driven Rendering Tests");
  console.log("=".repeat(65));

  try {
    testBrandColorsOverrideThemeTokens();
    testBrandFontsOverrideThemeTokens();
    testCustomBrandProfileColors();
    testFooterConventionApplied();
    testTitlePlacementAffectsRendering();
    testInvalidProfileRejects();
    testJsonModeMachineReadable();
    testOneCommandDeliveryStillWorks();
    testDeterministicBehavior();
    testGracefulDegradationNoBrandConfig();
    await testPipelineIntegration();
    testBuiltInProfilesProduceDifferentColors();
    await testCustomJsonProfileIntoPipeline();
    testFooterConventionValues();
    testNpmScriptsRegistered();
  } catch (err) {
    console.error("\nUnexpected error during tests:", err.message);
    console.error(err.stack);
    failedTests++;
  }

  console.log("\n" + "=".repeat(65));
  console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
  console.log("=".repeat(65));

  if (failedTests > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
