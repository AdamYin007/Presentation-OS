const assert = require("assert");
const { runPipeline } = require("../../packages/presentation-pipeline/src/index.js");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "..");

function fail(m) { throw new Error(m); }

console.log("M12.7 End-to-End Pipeline Tests");
console.log("===============================\n");

// Load sample input
const mdInput = fs.readFileSync(path.join(root, "fixtures/document-ingest/sample-markdown.md"), "utf8");

// ── Module exports ──

console.log("Module exports:");
assert(typeof runPipeline === "function", "runPipeline should be a function");
console.log("  ✓ runPipeline exported");

// ── Full pipeline test ──

console.log("\nFull pipeline:");
(async () => {
  const result = await runPipeline(mdInput, { style: "minimal-modern" });

  // Verify all intermediate artifacts exist
  assert(result.sourceDocument, "Should have source document");
  assert(result.intent, "Should have intent");
  assert(result.deckPlan, "Should have deck plan");
  assert(Array.isArray(result.slideSpecs), "Should have slide specs array");
  assert(result.layoutPlan, "Should have layout plan");
  assert(Buffer.isBuffer(result.pptxBuffer), "Should have pptx buffer");

  console.log(`  ✓ Source document: ${result.sourceDocument.title}`);
  console.log(`  ✓ Intent: topic="${result.intent.topic}", purpose="${result.intent.purpose}"`);
  console.log(`  ✓ DeckPlan: ${result.deckPlan.slides?.length || "N/A"} slides planned`);
  console.log(`  ✓ SlideSpecs: ${result.slideSpecs.length} entries`);
  console.log(`  ✓ LayoutPlan: theme=${result.layoutPlan.theme}, ${result.layoutPlan.totalSlides} layouts`);
  console.log(`  ✓ PPTX buffer: ${result.pptxBuffer.length} bytes`);

  // Verify PPTX is valid ZIP
  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assert(header === "504b0304", `Valid PPTX expected, got ${header}`);
  console.log("  ✓ Valid PPTX (ZIP format)");

  // Verify slide count matches
  assert(result.slideCount === result.slideSpecs.length, "slideCount should match specs length");
  console.log(`  ✓ Slide count consistent: ${result.slideCount}`);

  // ── Different style ──

  console.log("\nDifferent style:");
  const consultingResult = await runPipeline(mdInput, { style: "business-consulting" });
  assert(consultingResult.layoutPlan.theme === "business-consulting", "Should use business-consulting theme");
  console.log("  ✓ business-consulting style applied");

  // ── Empty input edge case ──

  console.log("\nEdge cases:");
  try {
    await runPipeline("");
    console.log("  ⚠ Empty input handled (may produce minimal output)");
  } catch (e) {
    console.log(`  ✓ Empty input rejected: ${e.message.slice(0, 60)}`);
  }

  // ── Fixture verification ──

  console.log("\nFixture verification:");
  const fixtureBuf = fs.readFileSync(path.join(root, "examples/business-review/e2e-output.pptx"));
  assert(fixtureBuf.length > 0, "Fixture should not be empty");
  const fixtureHeader = fixtureBuf.slice(0, 4).toString("hex");
  assert(fixtureHeader === "504b0304", "Fixture should be valid PPTX");
  console.log(`  ✓ e2e-output.pptx: ${fixtureBuf.length} bytes, valid PPTX`);

  // ── Scope boundaries ──

  console.log("\nScope boundaries:");
  const exports = Object.keys(require("../../packages/presentation-pipeline/src/index.js"));
  for (const exp of exports) {
    if (exp.includes("docx") || exp.includes("pdf")) {
      fail(`Export ${exp} leaks into non-PPTX domains`);
    }
  }
  console.log("  ✓ No cross-domain rendering leakage");

  console.log("\n===============================");
  console.log("M12.7 End-to-End Pipeline tests passed\n");
})();
