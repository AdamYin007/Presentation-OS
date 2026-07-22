/**
 * Presentation Compiler — Focused Test Suite (M12.24)
 *
 * Tests: module exports, fast mode passthrough, standard analysis,
 * overflow detection, pagination, theme resolution, resource deduplication,
 * full compile pipeline, and CLI integration.
 */

"use strict";

const path = require("path");
const assert = require("assert");

const {
  compilePresentation,
  COMPILER_MODES,
} = require("../../packages/presentation-compiler/src/index.js");

// ── Helpers ───────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

// Sample slide specs for tests
function makeSlideSpecs(count, opts = {}) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    specs.push({
      id: `slide-${i}`,
      index: i + 1,
      title: opts.titles ? opts.titles[i] : `Slide ${i + 1}`,
      role: opts.roles ? opts.roles[i] : "content",
      body: opts.bodies ? opts.bodies[i] : [`Bullet ${i + 1}`],
      visualType: opts.visualTypes ? opts.visualTypes[i] : "none",
      visualSpec: opts.visualSpecs ? opts.visualSpecs[i] : {},
      sourceRefs: [],
    });
  }
  return specs;
}

function makeLayoutPlan(slideSpecs, opts = {}) {
  const layouts = slideSpecs.map((spec, i) => ({
    slideId: spec.id,
    colors: { background: "#FFFFFF", text: "#1A1A1A" },
    spacing: { padding: 32, margin: 16, gap: 12 },
    fontSize: { heading: 24, body: 14 },
    maxWidth: 800,
    density: opts.densities ? opts.densities[i] : "medium",
    adapter: `${spec.role || "content"}-adapter`,
    renderMethod: "adapter",
    theme: "default",
  }));
  return {
    layouts,
    themeTokens: { fonts: { heading: "Inter", body: "Inter" } },
  };
}

// ── Module Exports ───────────────────────────────────────────────

console.log("\nModule Exports");
test("compilePresentation is a function", () => {
  assert.strictEqual(typeof compilePresentation, "function");
});
test("COMPILER_MODES exists with FAST/STANDARD/OPTIMIZED", () => {
  assert.ok(COMPILER_MODES.FAST);
  assert.ok(COMPILER_MODES.STANDARD);
  assert.ok(COMPILER_MODES.OPTIMIZED);
});

// ── Fast Mode ────────────────────────────────────────────────────

console.log("\nFast Mode");
test("fast mode returns empty analysis and no warnings", () => {
  const slides = makeSlideSpecs(3);
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.FAST });
  assert.strictEqual(result.mode, "fast");
  assert.deepStrictEqual(result.overflowReport, []);
  assert.strictEqual(result.warnings.length, 0);
});

// ── Standard Mode — Analysis ─────────────────────────────────────

console.log("\nStandard Mode — Analysis");
test("standard mode analyzes slide counts and distributions", () => {
  const slides = makeSlideSpecs(5, {
    roles: ["title", "content", "content", "data-chart", "closing"],
    bodies: [["T1"], ["B1"], ["B2"], ["B3"], ["C1"]],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  assert.strictEqual(result.analysis.totalSlides, 5);
  assert.strictEqual(result.analysis.totalBullets, 5);
  assert.strictEqual(result.analysis.avgBulletsPerSlide, "1.0");
  assert.strictEqual(result.analysis.typeDistribution.title, 1);
  assert.strictEqual(result.analysis.typeDistribution["data-chart"], 1);
});

// ── Overflow Detection ───────────────────────────────────────────

console.log("\nOverflow Detection");
test("detects bullet overload", () => {
  const bullets = [];
  for (let i = 0; i < 10; i++) bullets.push(`Bullet ${i + 1}`);
  const slides = makeSlideSpecs(2, {
    bodies: [bullets, ["Normal bullet"]],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  assert.ok(result.overflowReport.length > 0, "should detect overflow");
  assert.strictEqual(result.overflowReport[0].slideIndex, 1);
});

test("no overflow for normal slides", () => {
  const slides = makeSlideSpecs(3, {
    bodies: [["B1"], ["B2"], ["B3"]],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  assert.strictEqual(result.overflowReport.length, 0);
});

// ── Pagination ───────────────────────────────────────────────────

console.log("\nPagination");
test("optimized mode paginates overloaded slides", () => {
  const bullets = [];
  for (let i = 0; i < 10; i++) bullets.push(`Bullet ${i + 1}`);
  const slides = makeSlideSpecs(1, {
    roles: ["content"],
    bodies: [bullets],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.OPTIMIZED });
  assert.ok(result.paginationDecisions.length > 0, "should have pagination decisions");
  assert.strictEqual(result.paginationDecisions[0].splitCount, 2); // 10 bullets / 5 per page
});

test("standard mode does not paginate", () => {
  const bullets = [];
  for (let i = 0; i < 10; i++) bullets.push(`Bullet ${i + 1}`);
  const slides = makeSlideSpecs(1, {
    roles: ["content"],
    bodies: [bullets],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  assert.strictEqual(result.paginationDecisions.length, 0);
});

// ── Theme Resolution ─────────────────────────────────────────────

console.log("\nTheme Resolution");
test("resolves font map from layout plan", () => {
  const slides = makeSlideSpecs(3);
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.OPTIMIZED });
  assert.strictEqual(result.themeResolution.resolved, true);
  assert.strictEqual(result.themeResolution.fontMap.heading, "Inter");
});

test("warns when many font variants exist", () => {
  const slides = makeSlideSpecs(10);
  const layouts = slides.map((s, i) => ({
    slideId: s.id,
    fontSize: { heading: 24 + i, body: 14 + i },
    density: "medium",
    adapter: "content-adapter",
    renderMethod: "adapter",
    theme: "default",
  }));
  const layout = { layouts, themeTokens: { fonts: { heading: "Arial", body: "Arial" } } };
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.OPTIMIZED });
  const warn = result.warnings.find((w) => w.type === "ThemeResolutionError");
  assert.ok(warn, "should warn about font variance");
});

// ── Resource Optimization ────────────────────────────────────────

console.log("\nResource Optimization");
test("deduplicates repeated bar charts", () => {
  const chartData = { series: [{ name: "Revenue", values: [{ label: "Q1", value: 100 }] }] };
  const slides = makeSlideSpecs(3, {
    visualTypes: ["bar-chart", "bar-chart", "content"],
    visualSpecs: [chartData, chartData, {}],
    bodies: [["B1"], ["B2"], ["B3"]],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.OPTIMIZED });
  assert.ok(result.resourceOptimization.totalCached > 0, "should cache resources");
});

test("fast mode skips resource optimization", () => {
  const slides = makeSlideSpecs(3);
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.FAST });
  assert.strictEqual(result.resourceOptimization.totalCached, 0);
});

// ── Full Compile Pipeline ────────────────────────────────────────

console.log("\nFull Compile Pipeline");
test("standard mode produces complete Render Plan", () => {
  const slides = makeSlideSpecs(4, {
    roles: ["title", "content", "data-chart", "closing"],
    bodies: [["Title"], ["B1"], ["Chart data"], ["Closing"]],
    visualTypes: ["none", "none", "bar-chart", "none"],
    visualSpecs: [{}, {}, { series: [{ name: "X", values: [{ label: "A", value: 1 }] }] }, {}],
  });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  assert.ok(result.renderPlan.meta, "should have meta");
  assert.strictEqual(result.renderPlan.meta.totalSlides, 4);
  assert.ok(Array.isArray(result.renderPlan.slides), "slides should be array");
  assert.strictEqual(result.renderPlan.slides.length, 4);
});

test("render plan entries have correct structure", () => {
  const slides = makeSlideSpecs(1, { roles: ["executive-summary"] });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  const entry = result.renderPlan.slides[0];
  assert.strictEqual(entry.no, 1);
  assert.strictEqual(entry.type, "executive-summary");
  assert.ok(entry.adapter, "should have adapter name");
});

// ── Constraint Solving ───────────────────────────────────────────

console.log("\nConstraint Solving");
test("auto-adjusts sparse layout for high content", () => {
  const slides = makeSlideSpecs(2, {
    roles: ["content", "content"],
    bodies: [["B1", "B2", "B3", "B4", "B5", "B6"], ["B7"]],
  });
  const layout = makeLayoutPlan(slides, { densities: ["sparse", "medium"] });
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  const autoAdjust = result.warnings.find((w) => w.type === "auto-adjust");
  assert.ok(autoAdjust, "should auto-adjust sparse layout");
});

test("warns on long titles", () => {
  const longTitle = "A".repeat(150);
  const slides = makeSlideSpecs(1, { titles: [longTitle] });
  const layout = makeLayoutPlan(slides);
  const result = compilePresentation(slides, layout, { mode: COMPILER_MODES.STANDARD });
  const warn = result.warnings.find((w) => w.slide === 1 && w.type === "ConstraintConflict");
  assert.ok(warn, "should warn about long title");
});

// ── Graceful Degradation ─────────────────────────────────────────

console.log("\nGraceful Degradation");
test("handles null layoutPlan gracefully", () => {
  const slides = makeSlideSpecs(3);
  const result = compilePresentation(slides, null, { mode: COMPILER_MODES.STANDARD });
  assert.ok(result.renderPlan, "should still produce render plan");
  assert.strictEqual(result.renderPlan.meta.totalSlides, 3);
});

test("handles empty slide specs", () => {
  const result = compilePresentation([], {}, { mode: COMPILER_MODES.STANDARD });
  assert.strictEqual(result.renderPlan.meta.totalSlides, 0);
});

// ── Summary ──────────────────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("All tests passed ✓");
