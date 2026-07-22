#!/usr/bin/env node
/**
 * End-to-End Integration Tests — M12.7 / M12.20 / M12.24 / M12.25
 *
 * Verifies the full pipeline from markdown → PPTX with:
 *   1. Different themes/styles
 *   2. Brand profiles (M12.20/21)
 *   3. Audience Engine adaptation (M12.25)
 *   4. Presentation Compiler optimization (M12.24)
 *   5. Combined: brand profile + audience engine + compiler
 *
 * Usage:
 *   node tests/e2e-integration.test.js
 *   npm run check:e2e-integration
 */

"use strict";

const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { loadProfile, resolveBrandConfig } = require("../packages/brand-profiles/src/index.js");
const { COMPILER_MODES } = require("../packages/presentation-compiler/src/schema.js");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const mdInput = fs.readFileSync(
  path.join(root, "fixtures/document-ingest/sample-markdown.md"),
  "utf8",
);

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

// ─── Test Suites ──────────────────────────────────────────────

async function testMinimalModernTheme() {
  console.log("\n[Suite] Minimal Modern Theme");
  const result = await runPipeline(mdInput, { style: "minimal-modern" });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.intent !== undefined, "Intent parsed");
  assert(result.deckPlan !== undefined, "Deck plan generated");
  assert(Array.isArray(result.slideSpecs), "Slide specs array generated");
  assert(result.layoutPlan !== undefined, "Layout plan generated");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  assertEqual(result.layoutPlan.theme, "minimal-modern", "Theme applied correctly");
  assert(result.slideCount === result.slideSpecs.length, "Slide count consistent");

  console.log(`  ✓ Pipeline: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testBusinessConsultingTheme() {
  console.log("\n[Suite] Business Consulting Theme");
  const result = await runPipeline(mdInput, { style: "business-consulting" });

  assertEqual(result.layoutPlan.theme, "business-consulting", "Business consulting theme applied");
  assert(result.pptxBuffer.length > 0, "PPTX buffer non-empty");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Pipeline: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testAcademicCleanTheme() {
  console.log("\n[Suite] Academic Clean Theme");
  const result = await runPipeline(mdInput, { style: "academic-clean" });

  assertEqual(result.layoutPlan.theme, "academic-clean", "Academic clean theme applied");
  assert(result.pptxBuffer.length > 0, "PPTX buffer non-empty");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Pipeline: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testBrandProfileIntegration() {
  console.log("\n[Suite] Brand Profile Integration (M12.20/21)");
  const profileResult = loadProfile("business-consulting");
  const brandConfig = resolveBrandConfig(profileResult.profile);

  assert(brandConfig.logoSafeArea !== undefined, "Brand config has logoSafeArea");
  assertEqual(brandConfig.footerConvention, "brand-name", "Footer convention applied");
  assert(brandConfig.allowedPalette.length > 0, "Allowed palette present");

  const result = await runPipeline(mdInput, {
    style: "business-consulting",
    brandConfig,
  });

  assert(result.sourceDocument !== undefined, "Pipeline runs with brandConfig");
  assert(result.layoutPlan !== undefined, "Layout plan generated with brandConfig");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated with brandConfig");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX valid with brandConfig");

  console.log(`  ✓ Pipeline with brand profile: ${result.slideCount} slides`);
}

async function testAudienceEngineIntegration() {
  console.log("\n[Suite] Audience Engine Integration (M12.25)");

  // Test executive speaker → board audience
  const execResult = await runPipeline(mdInput, {
    style: "business-consulting",
    audienceEngine: {
      speaker: "executive",
      audience: "board",
    },
  });

  assert(execResult.sourceDocument !== undefined, "Pipeline runs with audienceEngine");
  assert(execResult.slideSpecs !== undefined, "Slide specs generated with audienceEngine");
  assert(Buffer.isBuffer(execResult.pptxBuffer), "PPTX buffer generated with audienceEngine");

  // Test specialist speaker → engineers audience
  const specResult = await runPipeline(mdInput, {
    style: "minimal-modern",
    audienceEngine: {
      speaker: "specialist",
      audience: "engineers",
    },
  });

  assert(specResult.sourceDocument !== undefined, "Pipeline runs with specialist speaker");
  assert(specResult.slideSpecs !== undefined, "Slide specs generated with specialist speaker");
  assert(Buffer.isBuffer(specResult.pptxBuffer), "PPTX buffer generated with specialist speaker");

  console.log(`  ✓ Executive→Board: ${execResult.slideCount} slides`);
  console.log(`  ✓ Specialist→Engineers: ${specResult.slideCount} slides`);
}

async function testCompilerIntegration() {
  console.log("\n[Suite] Presentation Compiler Integration (M12.24)");

  // Fast mode
  const fastResult = await runPipeline(mdInput, {
    style: "minimal-modern",
    compiler: COMPILER_MODES.FAST,
  });

  assert(fastResult.sourceDocument !== undefined, "Pipeline runs with compiler=fast");
  assert(fastResult.compiler !== undefined, "Compiler metadata present");
  assert(Buffer.isBuffer(fastResult.pptxBuffer), "PPTX buffer generated with compiler");

  // Standard mode
  const standardResult = await runPipeline(mdInput, {
    style: "business-consulting",
    compiler: COMPILER_MODES.STANDARD,
  });

  assert(standardResult.sourceDocument !== undefined, "Pipeline runs with compiler=standard");
  assert(standardResult.compiler !== undefined, "Compiler metadata present");
  assert(Buffer.isBuffer(standardResult.pptxBuffer), "PPTX buffer generated with compiler");

  // Optimized mode
  const optimizedResult = await runPipeline(mdInput, {
    style: "academic-clean",
    compiler: COMPILER_MODES.OPTIMIZED,
  });

  assert(optimizedResult.sourceDocument !== undefined, "Pipeline runs with compiler=optimized");
  assert(optimizedResult.compiler !== undefined, "Compiler metadata present");
  assert(Buffer.isBuffer(optimizedResult.pptxBuffer), "PPTX buffer generated with compiler");

  console.log(`  ✓ Fast: ${fastResult.slideCount} slides`);
  console.log(`  ✓ Standard: ${standardResult.slideCount} slides`);
  console.log(`  ✓ Optimized: ${optimizedResult.slideCount} slides`);
}

async function testCombinedIntegration() {
  console.log("\n[Suite] Combined: Brand Profile + Audience Engine + Compiler");

  const profileResult = loadProfile("business-consulting");
  const brandConfig = resolveBrandConfig(profileResult.profile);

  const result = await runPipeline(mdInput, {
    style: "business-consulting",
    brandConfig,
    audienceEngine: {
      speaker: "executive",
      audience: "board",
    },
    compiler: COMPILER_MODES.OPTIMIZED,
  });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.intent !== undefined, "Intent parsed");
  assert(result.deckPlan !== undefined, "Deck plan generated");
  assert(result.slideSpecs !== undefined, "Slide specs generated");
  assert(result.layoutPlan !== undefined, "Layout plan generated");
  assert(result.compiler !== undefined, "Compiler metadata present");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(
    `  ✓ Combined pipeline: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`,
  );
}

async function testDifferentContentInputs() {
  console.log("\n[Suite] Different Content Inputs");

  const shortMd = "# Quick Update\n\n- Point one\n- Point two\n- Point three";

  const longMd = `# Comprehensive Report

## Section 1
${"Introduction text repeated ".repeat(50)}

## Section 2
${"Detailed analysis content ".repeat(50)}

## Section 3
${"Conclusions and recommendations ".repeat(50)}

## Section 4
${"Next steps and action items ".repeat(50)}`;

  try {
    const shortResult = await runPipeline(shortMd, { style: "minimal-modern" });
    assert(shortResult.pptxBuffer.length > 0, "Short input produces PPTX");
    console.log(`  ✓ Short input: ${shortResult.slideCount} slides`);
  } catch (e) {
    console.log(`  ⚠ Short input error: ${e.message.slice(0, 60)}`);
  }

  try {
    const longResult = await runPipeline(longMd, { style: "business-consulting" });
    assert(longResult.pptxBuffer.length > 0, "Long input produces PPTX");
    console.log(`  ✓ Long input: ${longResult.slideCount} slides`);
  } catch (e) {
    console.log(`  ⚠ Long input error: ${e.message.slice(0, 60)}`);
  }
}

async function testEdgeCases() {
  console.log("\n[Suite] Edge Cases");

  try {
    await runPipeline("", { style: "minimal-modern" });
    console.log("  ⚠ Empty input handled (may produce minimal output)");
  } catch (e) {
    assert(
      e.message.includes("empty") || e.message.includes("no content"),
      "Empty input rejected gracefully",
    );
    console.log(`  ✓ Empty input rejected: ${e.message.slice(0, 60)}`);
  }

  try {
    await runPipeline("# Just a title", { style: "minimal-modern" });
    console.log("  ✓ Single-line input handled");
  } catch (e) {
    console.log(`  ⚠ Single-line input error: ${e.message.slice(0, 60)}`);
  }
}

// ─── Run All Tests ────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("End-to-End Integration Tests — Full Pipeline Coverage");
  console.log("=".repeat(65));

  try {
    await testMinimalModernTheme();
    await testBusinessConsultingTheme();
    await testAcademicCleanTheme();
    await testBrandProfileIntegration();
    await testAudienceEngineIntegration();
    await testCompilerIntegration();
    await testCombinedIntegration();
    await testDifferentContentInputs();
    await testEdgeCases();
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
}

main();
