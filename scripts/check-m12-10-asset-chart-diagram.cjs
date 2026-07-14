#!/usr/bin/env node
/**
 * M12.10 Asset, Chart, and Diagram Enhancement Checker
 *
 * Validates the M12.10 thin slice: chart/diagram rendering in PPTX output.
 * Checks required files, module exports, fixture validity, and generates
 * a real .pptx with all 5 visual types.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REQUIRED_FILES = [
  "docs/M12_10_ASSET_CHART_DIAGRAM_ENHANCEMENT_SPEC.md",
  "fixtures/m12-10/bar-chart-example.json",
  "fixtures/m12-10/line-chart-example.json",
  "fixtures/m12-10/metric-cards-example.json",
  "fixtures/m12-10/process-diagram-example.json",
  "fixtures/m12-10/timeline-example.json",
  "tests/chart-diagram/chart-diagram.test.js",
  "packages/pptx-renderer/src/renderer.js",
];

const VISUAL_FIXTURES = [
  "bar-chart-example.json",
  "line-chart-example.json",
  "metric-cards-example.json",
  "process-diagram-example.json",
  "timeline-example.json",
];

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function checkRequiredFiles() {
  console.log("Checking required files...");
  for (const file of REQUIRED_FILES) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) {
      fail(`Required file missing: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }
}

function checkFixtures() {
  console.log("\nChecking fixture files...");
  const { validateSlideSpec } = require(path.join(ROOT, "packages/slidespec/src/schema.js"));
  const fixturesDir = path.join(ROOT, "fixtures", "m12-10");

  for (const fname of VISUAL_FIXTURES) {
    const fp = path.join(fixturesDir, fname);
    const spec = JSON.parse(fs.readFileSync(fp, "utf8"));
    const v = validateSlideSpec(spec);
    if (!v.ok) {
      fail(`${fname}: invalid SlideSpec: ${v.errors.join(", ")}`);
    }
    console.log(`  ✓ ${fname}: valid SlideSpec, visualType=${spec.visualType}, role=${spec.role}`);

    // Verify required fields
    if (!spec.visualType) fail(`${fname}: missing visualType`);
    if (!spec.visualSpec) fail(`${fname}: missing visualSpec`);
    if (!spec.speakerNotes || spec.speakerNotes.trim().length === 0) {
      fail(`${fname}: missing speaker notes`);
    }
    if (!spec.sourceRefs || spec.sourceRefs.length === 0) {
      fail(`${fname}: missing sourceRefs`);
    }
  }
}

async function checkPptxGeneration() {
  console.log("\nGenerating PPTX with all visual types...");
  const { renderPptx, generateBuffer } = require(path.join(ROOT, "packages/pptx-renderer/src/index.js"));

  const specs = VISUAL_FIXTURES.map((fname) => {
    const fp = path.join(ROOT, "fixtures", "m12-10", fname);
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  });

  const layoutPlan = {
    layouts: specs.map((s) => ({
      slideId: s.id,
      colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280" },
      spacing: { padding: 32, margin: 16, gap: 12 },
      fontSize: { heading: 24, body: 14 },
      maxWidth: 800,
    })),
  };

  const pptx = renderPptx(specs, layoutPlan);
  const buf = await generateBuffer(pptx);

  if (!buf || buf.length === 0) {
    fail("PPTX buffer is empty");
  }
  console.log(`  ✓ Generated PPTX: ${buf.length} bytes, ${pptx._slides.length} slides`);

  // Verify PK signature
  if (buf.readUInt32BE(0) !== 0x504b0304) {
    fail("PPTX does not start with PK signature");
  }
  console.log("  ✓ PPTX has valid ZIP/PK signature");

  // Save example output
  const outputPath = path.join(ROOT, "examples", "m12-10-chart-diagram.pptx");
  fs.writeFileSync(outputPath, buf);
  console.log(`  ✓ Saved example: ${outputPath}`);
}

async function checkRegression() {
  console.log("\nRegression check: existing M12.7 pipeline still works...");
  const { renderPptx, generateBuffer } = require(path.join(ROOT, "packages/pptx-renderer/src/index.js"));

  // Simple content slide (no visualType)
  const spec = {
    id: "regression-test",
    index: 1,
    section: "Test",
    role: "content",
    title: "Regression Test",
    body: ["Point 1", "Point 2", "Point 3"],
    visualType: "none",
    visualSpec: {},
    layout: "title-and-bullets",
    speakerNotes: "Speaker notes for regression test",
    sourceRefs: [],
  };

  const layoutPlan = {
    layouts: [{
      slideId: "regression-test",
      colors: { accent: "#3B82F6", text: "#111827", background: "#FFFFFF" },
      fontSize: { heading: 24, body: 14 },
      maxWidth: 800,
    }],
  };

  try {
    const pptx = renderPptx([spec], layoutPlan);
    const buf = await generateBuffer(pptx);
    if (buf && buf.length > 0) {
      console.log(`  ✓ Regression: existing pipeline produces ${buf.length} bytes`);
    } else {
      fail("Regression: empty PPTX buffer");
    }
  } catch (e) {
    fail(`Regression: threw ${e.message}`);
  }
}

async function checkSpecDocument() {
  console.log("\nChecking spec document...");
  const specPath = path.join(ROOT, "docs", "M12_10_ASSET_CHART_DIAGRAM_ENHANCEMENT_SPEC.md");
  const content = fs.readFileSync(specPath, "utf8");

  const requiredSections = [
    "Overview", "Architecture", "Quality Gates", "Files Changed", "Testing", "Next Steps",
  ];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      fail(`Spec missing required section: ${section}`);
    }
    console.log(`  ✓ Spec contains section: ${section}`);
  }
}

async function main() {
  console.log("M12.10 Asset, Chart, and Diagram Enhancement Checker");
  console.log("====================================================\n");

  checkRequiredFiles();
  checkFixtures();
  await checkPptxGeneration();
  await checkRegression();
  await checkSpecDocument();

  console.log("\n====================================================");
  console.log("M12.10 check passed!\n");
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
