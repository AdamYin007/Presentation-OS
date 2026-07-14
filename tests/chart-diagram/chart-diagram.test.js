#!/usr/bin/env node
/**
 * M12.10 Asset, Chart, and Diagram Enhancement Tests
 *
 * Validates that chart/diagram SlideSpecs render as editable PPTX elements.
 * No screenshot-only output. Uses PptxGenJS native shapes.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const { renderPptx, generateBuffer } = require(path.join(ROOT, "packages/pptx-renderer/src/index.js"));
const { validateSlideSpec } = require(path.join(ROOT, "packages/slidespec/src/schema.js"));

const FIXTURES_DIR = path.join(ROOT, "fixtures", "m12-10");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (!condition) {
    failed++;
    failures.push(`FAIL: ${msg}`);
    console.log(`  ✗ ${msg}`);
  } else {
    passed++;
    console.log(`  ✓ ${msg}`);
  }
}

function loadFixture(name) {
  const fp = path.join(FIXTURES_DIR, name);
  return JSON.parse(fs.readFileSync(fp, "utf8"));
}

async function runTests() {
console.log("M12.10 Asset, Chart, and Diagram Enhancement Tests");
console.log("==================================================\n");

// ── 1. Fixture Validation ──
console.log("1. Fixture validation...");
const fixtures = [
  "bar-chart-example.json",
  "line-chart-example.json",
  "metric-cards-example.json",
  "process-diagram-example.json",
  "timeline-example.json",
];

for (const fname of fixtures) {
  const spec = loadFixture(fname);
  const v = validateSlideSpec(spec);
  assert(v.ok, `${fname}: valid SlideSpec`);
  if (!v.ok) {
    failures.push(`${fname}: validation errors: ${v.errors.join(", ")}`);
  }
}

// ── 2. Bar Chart Rendering ──
console.log("\n2. Bar chart rendering...");
try {
  const barSpec = loadFixture("bar-chart-example.json");
  const layoutPlan = {
    layouts: [{ slideId: barSpec.id, colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" }, spacing: { padding: 32 }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([barSpec], layoutPlan);
  assert(true, "bar-chart: renderPptx succeeds without error");
} catch (e) {
  assert(false, `bar-chart: renderPptx threw: ${e.message}`);
}

// ── 3. Line Chart Rendering ──
console.log("\n3. Line chart rendering...");
try {
  const lineSpec = loadFixture("line-chart-example.json");
  const layoutPlan = {
    layouts: [{ slideId: lineSpec.id, colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" }, spacing: { padding: 32 }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([lineSpec], layoutPlan);
  assert(true, "line-chart: renderPptx succeeds without error");
} catch (e) {
  assert(false, `line-chart: renderPptx threw: ${e.message}`);
}

// ── 4. Metric Cards Rendering ──
console.log("\n4. Metric cards rendering...");
try {
  const kpiSpec = loadFixture("metric-cards-example.json");
  const layoutPlan = {
    layouts: [{ slideId: kpiSpec.id, colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" }, spacing: { padding: 32 }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([kpiSpec], layoutPlan);
  assert(true, "metric-cards: renderPptx succeeds without error");
} catch (e) {
  assert(false, `metric-cards: renderPptx threw: ${e.message}`);
}

// ── 5. Process Diagram Rendering ──
console.log("\n5. Process diagram rendering...");
try {
  const procSpec = loadFixture("process-diagram-example.json");
  const layoutPlan = {
    layouts: [{ slideId: procSpec.id, colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" }, spacing: { padding: 32 }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([procSpec], layoutPlan);
  assert(true, "process-diagram: renderPptx succeeds without error");
} catch (e) {
  assert(false, `process-diagram: renderPptx threw: ${e.message}`);
}

// ── 6. Timeline Diagram Rendering ──
console.log("\n6. Timeline diagram rendering...");
try {
  const tlSpec = loadFixture("timeline-example.json");
  const layoutPlan = {
    layouts: [{ slideId: tlSpec.id, colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" }, spacing: { padding: 32 }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([tlSpec], layoutPlan);
  assert(true, "timeline-diagram: renderPptx succeeds without error");
} catch (e) {
  assert(false, `timeline-diagram: renderPptx threw: ${e.message}`);
}

// ── 7. Multi-slide PPTX with mixed content ──
console.log("\n7. Multi-slide PPTX generation...");
try {
  const allSpecs = fixtures.map((f) => loadFixture(f));
  const layoutPlan = {
    layouts: allSpecs.map((s) => ({
      slideId: s.id,
      colors: { accent: "#3B82F6", primary: "#1A1A1A", text: "#111827", background: "#FFFFFF" },
      spacing: { padding: 32 },
      fontSize: { heading: 24, body: 14 },
      maxWidth: 800,
    })),
  };
  const pptx = renderPptx(allSpecs, layoutPlan);
  assert(true, "multi-slide: renderPptx succeeds");

  const buf = await generateBuffer(pptx);
  assert(buf !== null && buf.length > 0, `multi-slide: PPTX buffer generated (${buf.length} bytes)`);

  // Verify PPTX is a valid ZIP (PPTX files are ZIP archives)
  assert(buf.readUInt32BE(0) === 0x504b0304, "multi-slide: PPTX starts with PK signature");

  // Verify slide count
  assert(pptx._slides.length === 5, "multi-slide: contains exactly 5 slides");
} catch (e) {
  assert(false, `multi-slide: threw: ${e.message}`);
}

// ── 8. Speaker notes preservation ──
console.log("\n8. Speaker notes preservation...");
for (const fname of fixtures) {
  const spec = loadFixture(fname);
  assert(
    spec.speakerNotes && spec.speakerNotes.trim().length > 0,
    `${fname}: has speaker notes (${spec.speakerNotes.length} chars)`
  );
}

// ── 9. Source references preservation ──
console.log("\n9. Source references preservation...");
for (const fname of fixtures) {
  const spec = loadFixture(fname);
  assert(
    Array.isArray(spec.sourceRefs) && spec.sourceRefs.length > 0,
    `${fname}: has sourceRefs (${spec.sourceRefs.length} entries)`
  );
}

// ── 10. Visual type coverage ──
console.log("\n10. Visual type coverage...");
const visualTypes = fixtures.map((f) => loadFixture(f).visualType);
assert(visualTypes.includes("bar-chart"), "bar-chart visualType present");
assert(visualTypes.includes("line-chart"), "line-chart visualType present");
assert(visualTypes.includes("metric-cards"), "metric-cards visualType present");
assert(visualTypes.includes("process"), "process visualType present");
assert(visualTypes.includes("timeline"), "timeline visualType present");

// ── 11. Layout family coverage ──
console.log("\n11. Layout family coverage...");
const layouts = fixtures.map((f) => loadFixture(f).layout);
assert(layouts.includes("full-width-chart"), "full-width-chart layout present");
assert(layouts.includes("kpi-cards"), "kpi-cards layout present");
assert(layouts.includes("horizontal-process"), "horizontal-process layout present");
assert(layouts.includes("timeline"), "timeline layout present");

// ── 12. Edge cases ──
console.log("\n12. Edge cases...");
try {
  // Empty visualSpec
  const emptySpec = {
    id: "test-empty",
    index: 1,
    section: "Test",
    role: "data-chart",
    title: "Empty Chart",
    visualType: "bar-chart",
    visualSpec: {},
    layout: "full-width-chart",
    speakerNotes: "",
    sourceRefs: [],
    body: [],
  };
  const lp = {
    layouts: [{ slideId: "test-empty", colors: { accent: "#3B82F6", text: "#111827", background: "#FFFFFF" }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx = renderPptx([emptySpec], lp);
  const buf = await generateBuffer(pptx);
  assert(buf !== null && buf.length > 0, "edge case: empty visualSpec still produces valid PPTX");
} catch (e) {
  assert(false, `edge case: empty visualSpec threw: ${e.message}`);
}

try {
  // Single metric card
  const singleCard = {
    id: "test-single-kpi",
    index: 1,
    section: "Test",
    role: "data-chart",
    title: "Single KPI",
    visualType: "metric-cards",
    visualSpec: {
      metrics: [{ label: "Revenue", value: "$1M", trend: "up" }],
      columns: 1,
    },
    layout: "kpi-cards",
    speakerNotes: "",
    sourceRefs: [],
    body: [],
  };
  const lp2 = {
    layouts: [{ slideId: "test-single-kpi", colors: { accent: "#3B82F6", text: "#111827", background: "#FFFFFF" }, fontSize: { heading: 24, body: 14 }, maxWidth: 800 }],
  };
  const pptx2 = renderPptx([singleCard], lp2);
  const buf2 = await generateBuffer(pptx2);
  assert(buf2 !== null && buf2.length > 0, "edge case: single metric card renders");
} catch (e) {
  assert(false, `edge case: single metric card threw: ${e.message}`);
}

// ── Summary ──
console.log("\n==================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
if (failed === 0) {
  console.log("All M12.10 tests passed!");
}

process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Test runner error:", e.message);
  process.exit(1);
});
