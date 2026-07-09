const assert = require("assert");
const { renderPptx, generateBuffer, RENDER_OPTIONS_DEFAULTS } = require("../../packages/pptx-renderer/src/index.js");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "..");

// Load fixtures
const specs = JSON.parse(fs.readFileSync(path.join(root, "examples/business-review/slidespec.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(path.join(root, "examples/business-review/layout-plan.json"), "utf8"));

console.log("M12.6 PPTX Renderer Tests");
console.log("==========================\n");

// ── Module exports ──

console.log("Module exports:");
assert(typeof renderPptx === "function", "renderPptx should be a function");
assert(typeof generateBuffer === "function", "generateBuffer should be a function");
assert(typeof RENDER_OPTIONS_DEFAULTS === "object", "RENDER_OPTIONS_DEFAULTS should be an object");
console.log("  ✓ renderPptx exported");
console.log("  ✓ generateBuffer exported");
console.log("  ✓ RENDER_OPTIONS_DEFAULTS exported");

// ── RenderPptx basic functionality ──

console.log("\nRenderPptx basic:");
const pptx = renderPptx(specs, plan);
assert(pptx, "Should return a PptxGenJS instance");
assert(Array.isArray(pptx.slides), "Should have slides array");
assert(pptx.slides.length === specs.length, `Expected ${specs.length} slides, got ${pptx.slides.length}`);
console.log(`  ✓ Generated ${pptx.slides.length} slides from ${specs.length} specs`);

// ── Slide content verification ──

console.log("\nSlide content:");
for (let i = 0; i < pptx.slides.length; i++) {
  const slide = pptx.slides[i];
  assert(slide, `Slide ${i + 1} should exist`);
  // pptxgenjs v4 stores shapes in _slideObjects with _type field
  const shapes = slide._slideObjects || [];
  const hasText = shapes.some((s) => s._type === "text" && s.text && s.text.length > 0);
  assert(hasText, `Slide ${i + 1} (${specs[i]?.role}) should have text content`);
}
console.log(`  ✓ All ${pptx.slides.length} slides have text content`);

// ── Role-specific rendering ──

console.log("\nRole-specific rendering:");
const execSummarySlides = pptx.slides.filter((_, i) => specs[i].role === "executive-summary");
const sectionDividers = pptx.slides.filter((_, i) => specs[i].role === "section-divider");
const closingSlides = pptx.slides.filter((_, i) => specs[i].role === "closing");
const contentSlides = pptx.slides.filter((_, i) => ["content", "executive-summary", "recommendation"].includes(specs[i].role));
const chartSlides = pptx.slides.filter((_, i) => specs[i].role === "data-chart");

assert(execSummarySlides.length > 0, "Should have executive summary slides");
assert(sectionDividers.length > 0, "Should have section dividers");
assert(closingSlides.length > 0, "Should have closing slides");
assert(contentSlides.length > 0, "Should have content slides");
assert(chartSlides.length > 0, "Should have data chart slides");

console.log(`  ✓ Executive summary: ${execSummarySlides.length}`);
console.log(`  ✓ Section dividers: ${sectionDividers.length}`);
console.log(`  ✓ Closing slides: ${closingSlides.length}`);
console.log(`  ✓ Content slides: ${contentSlides.length}`);
console.log(`  ✓ Data chart slides: ${chartSlides.length}`);

// ── Buffer generation ──

console.log("\nBuffer generation:");
(async () => {
  const buffer = await generateBuffer(pptx);
  assert(Buffer.isBuffer(buffer), "Should return a NodeBuffer");
  assert(buffer.length > 0, "Buffer should not be empty");
  console.log(`  ✓ Generated ${buffer.length} bytes`);

  // Verify it's a valid zip (PPTX is a ZIP file)
  const header = buffer.slice(0, 4).toString("hex");
  assert(header === "504b0304", `Buffer should start with ZIP magic bytes, got ${header}`);
  console.log("  ✓ Valid PPTX (ZIP format)");

  // Save fixture
  const fixturePath = path.join(root, "examples/business-review/output.pptx");
  fs.writeFileSync(fixturePath, buffer);
  console.log(`  ✓ Fixture saved to ${fixturePath}`);

  // ── Speaker notes ──

  console.log("\nSpeaker notes:");
  const specsWithNotes = specs.filter((s) => s.speakerNotes && s.speakerNotes.trim().length > 0);
  if (specsWithNotes.length > 0) {
    console.log(`  ✓ ${specsWithNotes.length} slides have speaker notes defined`);
  } else {
    console.log("  ⚠ No slides with speaker notes in fixture (expected for MVP)");
  }

  // ── Custom options ──

  console.log("\nCustom render options:");
  const customPptx = renderPptx(specs, plan, {
    fileName: "custom-test",
    author: "Test Author",
    company: "Test Company",
  });
  assert(customPptx.author === "Test Author", "Author should be set");
  assert(customPptx.company === "Test Company", "Company should be set");
  console.log("  ✓ Custom author/company applied");

  // ── Empty specs edge case ──

  console.log("\nEdge cases:");
  const emptyPptx = renderPptx([], plan);
  assert(emptyPptx.slides.length === 0, "Empty specs should produce zero slides");
  console.log("  ✓ Empty specs handled");

  // ── Scope boundaries ──

  console.log("\nScope boundaries:");
  // Ensure no markdown/docx/pdf rendering leakage
  const exports = Object.keys(require("../../packages/pptx-renderer/src/index.js"));
  for (const exp of exports) {
    assert(!exp.includes("docx") && !exp.includes("pdf") && !exp.includes("markdown"),
      `Export ${exp} leaks into non-PPTX domains`);
  }
  console.log("  ✓ No cross-domain rendering leakage");

  console.log("\n==========================");
  console.log("M12.6 PPTX Renderer tests passed\n");
})();
