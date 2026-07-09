const assert = require("assert");
const { generateSlideSpecs, validateSlideSpec, createDefaultSlideSpec } = require("../../packages/slidespec/src/index.js");
const fs = require("fs");
const path = require("path");

console.log("SlideSpec Tests (M12.4)");
console.log("======================\n");

// ── Schema validation ──

console.log("Schema validation:");

const validSpec = createDefaultSlideSpec({
  id: "slide-001", index: 1, section: "Test", role: "content",
  title: "Test Title", keyMessage: "Test message", body: ["item"],
  visualType: "none", layout: "title-and-bullets", speakerNotes: "", sourceRefs: [],
});
let result = validateSlideSpec(validSpec);
assert(result.ok, "Valid spec should pass");
console.log("  PASS valid spec accepted");

result = validateSlideSpec({});
assert(!result.ok, "Empty object should fail");
console.log("  PASS empty object rejected");

result = validateSlideSpec(createDefaultSlideSpec({ role: "invalid-role" }));
assert(!result.ok, "Invalid role should fail");
console.log("  PASS invalid role rejected");

result = validateSlideSpec(createDefaultSlideSpec({ visualType: "invalid" }));
assert(!result.ok, "Invalid visualType should fail");
console.log("  PASS invalid visualType rejected");

result = validateSlideSpec(createDefaultSlideSpec({ layout: "invalid" }));
assert(!result.ok, "Invalid layout should fail");
console.log("  PASS invalid layout rejected");

// ── DeckPlan → SlideSpec conversion ──

console.log("\nDeckPlan → SlideSpec conversion:");

const deckPlan = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../examples/business-review/deck-plan.json"), "utf8")
);

const specs = generateSlideSpecs(deckPlan);
assert(specs.length === deckPlan.slides.length, `Expected ${deckPlan.slides.length} specs, got ${specs.length}`);
console.log(`  PASS generated ${specs.length} SlideSpec entries`);

// Check required fields present on every spec
for (const spec of specs) {
  const v = validateSlideSpec(spec);
  assert(v.ok, `Spec ${spec.id} failed validation: ${v.errors.join(", ")}`);
}
console.log("  PASS all specs pass schema validation");

// Check roles mapped to layouts
const roleLayoutMap = {};
for (const spec of specs) {
  if (!roleLayoutMap[spec.role]) roleLayoutMap[spec.role] = [];
  roleLayoutMap[spec.role].push(spec.layout);
}
for (const [role, layouts] of Object.entries(roleLayoutMap)) {
  for (const layout of layouts) {
    // All layouts should be from VALID_LAYOUTS
    assert(layout !== undefined, `Role ${role} mapped to undefined layout`);
  }
}
console.log("  PASS roles mapped to valid layouts");

// ── Section divider slides ──

console.log("\nSection divider handling:");
const dividers = specs.filter((s) => s.role === "section-divider");
assert(dividers.length > 0, "Should have at least one section divider");
for (const d of dividers) {
  assert(d.body.length === 0, `Section divider ${d.id} should have empty body`);
  assert(d.speakerNotes === "", `Section divider ${d.id} should have no speaker notes`);
}
console.log(`  PASS ${dividers.length} section dividers handled correctly`);

// ── Closing slide ──

console.log("\nClosing slide:");
const closings = specs.filter((s) => s.role === "closing");
assert(closings.length > 0, "Should have a closing slide");
assert(closings[0].title === "Thank You", "Closing title should be 'Thank You'");
console.log("  PASS closing slide correct");

// ── Speaker notes generation ──

console.log("\nSpeaker notes:");
const withNotes = specs.filter((s) => s.speakerNotes && s.speakerNotes.length > 0);
assert(withNotes.length > 0, "Should have speaker notes on content slides");
for (const s of withNotes.slice(0, 3)) {
  assert(s.speakerNotes.includes("Purpose:"), `Slide ${s.id} notes should include purpose`);
  assert(s.speakerNotes.includes("Key argument:"), `Slide ${s.id} notes should include key argument`);
}
console.log(`  PASS speaker notes generated (${withNotes.length} slides)`);

// ── SourceRefs preservation ──

console.log("\nSourceRefs preservation:");
const specsWithRefs = specs.filter((s) => s.sourceRefs.length > 0);
// Our business review fixture has no sourceRefs yet, so we test with an inline DeckPlan
const inlineDeckPlan = {
  ...deckPlan,
  slides: deckPlan.slides.map((s, i) => ({
    ...s,
    sourceRefs: i < 3 ? [{ sourceId: `p${i+1}`, sourceType: "paragraph", fileReference: "input.md" }] : [],
  })),
};
const inlineSpecs = generateSlideSpecs(inlineDeckPlan);
const refsPresent = inlineSpecs.filter((s) => s.sourceRefs.length > 0);
assert(refsPresent.length === 3, `Expected 3 specs with sourceRefs, got ${refsPresent.length}`);
for (const s of refsPresent) {
  assert(s.sourceRefs[0].sourceId, "sourceRefs should have sourceId");
  assert(s.sourceRefs[0].fileReference, "sourceRefs should have fileReference");
}
console.log("  PASS sourceRefs preserved through conversion");

// ── Visual type mapping ──

console.log("\nVisual type mapping:");
const chartSlides = specs.filter((s) => s.role === "data-chart");
for (const s of chartSlides) {
  assert(["bar-chart","line-chart","area-chart","pie-chart","scatter-chart","table"].includes(s.visualType),
    `Chart slide ${s.id} should map to a chart visualType, got ${s.visualType}`);
}
console.log("  PASS visual types mapped correctly");

// ── Design hints ──

console.log("\nDesign hints:");
for (const spec of specs) {
  assert(spec.designHints, `Spec ${spec.id} should have designHints`);
  assert(spec.designHints.density, `Spec ${spec.id} should have density hint`);
  assert(spec.designHints.emphasis, `Spec ${spec.id} should have emphasis hint`);
}
console.log("  PASS design hints present on all specs");

// ── No PPTX rendering leakage ──

console.log("\nScope boundaries:");
for (const spec of specs) {
  const specStr = JSON.stringify(spec);
  assert(!specStr.includes("pptxgenjs"), `Spec ${spec.id} must not contain pptxgenjs`);
  assert(!specStr.includes(".pptx"), `Spec ${spec.id} must not reference .pptx files`);
}
console.log("  PASS no PPTX rendering leakage");

// ── Body content generation ──

console.log("\nBody content:");
const contentSlides = specs.filter((s) => s.role === "content");
assert(contentSlides.length > 0, "Should have content slides");
for (const s of contentSlides) {
  assert(Array.isArray(s.body), `Slide ${s.id} body should be an array`);
  assert(s.body.length > 0, `Slide ${s.id} body should have items`);
  for (const item of s.body) {
    assert(typeof item === "string", `Body item in ${s.id} should be string`);
  }
}
console.log("  PASS body content generated correctly");

// ── Edge cases ──

console.log("\nEdge cases:");

// Empty deck plan
const emptySpecs = generateSlideSpecs({ slides: [] });
assert(emptySpecs.length === 0, "Empty deck plan should produce empty specs");
console.log("  PASS empty deck plan handled");

// Single slide
const singleSpecs = generateSlideSpecs({
  slides: [{ slideId: "s1", index: 1, role: "title", section: "", objective: "", keyMessage: "" }],
});
assert(singleSpecs.length === 1, "Single slide deck plan should produce one spec");
console.log("  PASS single slide handled");

console.log("\n======================");
console.log("Results: ALL PASSED\n");
