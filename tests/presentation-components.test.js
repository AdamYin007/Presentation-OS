// Tests for Presentation Component Library v1
// Run: node tests/presentation-components.test.js

const pptxgen = require("pptxgenjs");
const comp = require("../packages/presentation-components");
const assert = require("assert");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

// Create a test pptx instance
function createTestPptx() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  return pptx;
}

function getSlide(pptx) {
  const s = pptx.addSlide();
  s._pptx = pptx;
  s.background = { color: comp.C.white };
  return s;
}

console.log("\n🧪 Presentation Component Library v1 Tests");
console.log("==========================================\n");

// ── Color Palette ──
console.log("Color Palette:");
test("C.navy is defined", () => {
  assert.strictEqual(comp.C.navy, "0F172A");
});
test("C.blue is defined", () => {
  assert.strictEqual(comp.C.blue, "2563EB");
});
test("C.white is defined", () => {
  assert.strictEqual(comp.C.white, "FFFFFF");
});
test("All 12 colors defined", () => {
  const expected = ["navy","blue","lightBlue","gray","lightGray","border","green","orange","red","white","cyan"];
  for (const k of expected) {
    assert.ok(comp.C[k], `Missing color: ${k}`);
  }
});

// ── Card Component ──
console.log("\nCard Component:");
test("card function exists", () => {
  assert.strictEqual(typeof comp.card, "function");
});
test("card renders without error", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.card(slide, 1, 2, 3, 1.5, "Header", "Body text", comp.C.blue, pptx);
  assert.ok(slide.shapes.length > 0, "Card should produce shapes");
});
test("card with icon variant", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.card(slide, 1, 2, 3, 1.5, "Icon Card", "Description", comp.C.green, pptx, {
    variant: "icon",
    iconChar: "◆"
  });
  assert.ok(slide.shapes.length > 0, "Icon card should produce shapes");
});
test("card with badge variant", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.card(slide, 1, 2, 3, 1.5, "Badge Card", "Description", comp.C.orange, pptx, {
    variant: "badge",
    badgeText: "NEW"
  });
  assert.ok(slide.shapes.length > 0, "Badge card should produce shapes");
});
test("card with flat variant", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.card(slide, 1, 2, 3, 1.5, "Flat Card", "Description", comp.C.cyan, pptx, {
    variant: "flat"
  });
  assert.ok(slide.shapes.length > 0, "Flat card should produce shapes");
});

// ── Timeline Component ──
console.log("\nTimeline Component:");
test("timeline function exists", () => {
  assert.strictEqual(typeof comp.timeline, "function");
});
test("timeline renders horizontal without error", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.timeline(slide, [
    { label: "Phase 1", title: "Start", body: "Begin" },
    { label: "Phase 2", title: "Middle", body: "Continue" },
    { label: "Phase 3", title: "End", body: "Finish" }
  ], pptx);
  assert.ok(slide.shapes.length > 0, "Timeline should produce shapes");
});
test("timeline with arrows", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.timeline(slide, [
    { label: "Q1", title: "Plan", body: "Planning phase" },
    { label: "Q2", title: "Build", body: "Development" }
  ], pptx, { showArrows: true });
  assert.ok(slide.shapes.length > 0, "Timelime with arrows should produce shapes");
});
test("timeline vertical mode", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.timeline(slide, [
    { label: "Step 1", title: "First" },
    { label: "Step 2", title: "Second" },
    { label: "Step 3", title: "Third" }
  ], pptx, { vertical: true });
  assert.ok(slide.shapes.length > 0, "Vertical timeline should produce shapes");
});

// ── Platform Hub Component ──
console.log("\nPlatform Hub Component:");
test("platformHub function exists", () => {
  assert.strictEqual(typeof comp.platformHub, "function");
});
test("platformHub manual layout", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.platformHub(slide, "Core Platform", [
    { label: "System A", x: 1, y: 1 },
    { label: "System B", x: 8, y: 1 },
    { label: "System C", x: 4, y: 5 }
  ], pptx);
  assert.ok(slide.shapes.length > 0, "Platform hub should produce shapes");
});
test("platformHub auto layout", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.platformHub(slide, "Auto Hub", [
    { label: "Node 1", icon: "◆" },
    { label: "Node 2", icon: "●" },
    { label: "Node 3", icon: "■" },
    { label: "Node 4" }
  ], pptx, { autoLayout: true });
  assert.ok(slide.shapes.length > 0, "Auto layout hub should produce shapes");
});

// ── Layered Architecture Component ──
console.log("\nLayered Architecture Component:");
test("layeredArchitecture function exists", () => {
  assert.strictEqual(typeof comp.layeredArchitecture, "function");
});
test("layered architecture basic render", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.layeredArchitecture(slide, [
    { name: "App", desc: "Applications", color: comp.C.blue },
    { name: "Platform", desc: "Platform services" },
    { name: "Data", desc: "Data layer" },
    { name: "Connect", desc: "Integration" }
  ], pptx);
  assert.ok(slide.shapes.length > 0, "Layered arch should produce shapes");
});
test("layered architecture with arrows", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.layeredArchitecture(slide, [
    { name: "Top", desc: "Layer 1" },
    { name: "Mid", desc: "Layer 2" },
    { name: "Bot", desc: "Layer 3" }
  ], pptx, { showArrows: true });
  assert.ok(slide.shapes.length > 0, "Layered arch with arrows should produce shapes");
});
test("layered architecture with side panel", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.layeredArchitecture(slide, [
    { name: "App", desc: "Apps", sideLabel: "A" },
    { name: "Data", desc: "Data", sideLabel: "D" }
  ], pptx, { sidePanel: true });
  assert.ok(slide.shapes.length > 0, "Side panel layered arch should produce shapes");
});

// ── Helpers ──
console.log("\nHelpers:");
test("makeTitle function exists", () => {
  assert.strictEqual(typeof comp.makeTitle, "function");
});
test("makeFooter function exists", () => {
  assert.strictEqual(typeof comp.makeFooter, "function");
});
test("makeTitle renders", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.makeTitle(slide, "Title Text", "Subtitle text");
  assert.ok(slide.shapes.length > 0, "makeTitle should produce shapes");
});

// ── Backward Compatibility ──
console.log("\nBackward Compatibility:");
test("existing card signature works", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  // Original 8-param call (no opts)
  comp.card(slide, 1, 2, 3, 1.5, "H", "B", comp.C.blue, pptx);
  assert.ok(slide.shapes.length > 0);
});
test("existing timeline signature works", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.timeline(slide, [{ label: "L", title: "T", body: "B" }], pptx);
  assert.ok(slide.shapes.length > 0);
});
test("existing platformHub signature works", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.platformHub(slide, "Hub", [{ label: "N", x: 1, y: 1 }], pptx);
  assert.ok(slide.shapes.length > 0);
});
test("existing layeredArchitecture signature works", () => {
  const pptx = createTestPptx();
  const slide = getSlide(pptx);
  comp.layeredArchitecture(slide, [{ name: "L", desc: "D" }], pptx);
  assert.ok(slide.shapes.length > 0);
});

// ── Export Integrity ──
console.log("\nExport Integrity:");
test("barrel exports all components", () => {
  assert.ok(comp.C);
  assert.ok(comp.makeFooter);
  assert.ok(comp.makeTitle);
  assert.ok(comp.card);
  assert.ok(comp.timeline);
  assert.ok(comp.platformHub);
  assert.ok(comp.layeredArchitecture);
});

// Summary
console.log("\n==========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("✅ All tests passed!\n");
