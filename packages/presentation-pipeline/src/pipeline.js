/**
 * Pipeline Orchestrator — M12.7 / M12.14 / M12.21
 *
 * Chains: ingest → intent → story-planner → slidespec → theme-layout → renderer
 * M12.21: brandConfig is threaded through layoutPlan generation and renderer
 * so that brand profiles affect actual PPTX output (colors, fonts, footer, title).
 */
const { ingestDocument } = require("../../document-ingest/src/index.js");
const { parsePresentationIntent } = require("../../intent-parser/src/index.js");
const { planDeck } = require("../../story-planner/src/index.js");
const { generateSlideSpecs } = require("../../slidespec/src/index.js");
const { generateLayoutPlan } = require("../../theme-layout/src/index.js");
const { renderPptx, generateBuffer } = require("../../pptx-renderer/src/index.js");
const { runQualityChecks, buildManifest, writeManifest, writeSummary } = require("./qa-utils.js");
const fs = require("fs");

/**
 * Run full pipeline from markdown input to .pptx buffer.
 */
async function runPipeline(markdownInput, options) {
  const opts = { style: "minimal-modern", ...(options || {}) };

  // Step 1: Document ingestion
  const ingestResult = ingestDocument(markdownInput);
  const sourceDocument = ingestResult.model;

  // Step 2: Intent parsing — pass actual SourceDocumentModel, not wrapper
  const intent = parsePresentationIntent(markdownInput, { sourceDocument });

  // Step 3: Story planning — pass sourceDocument for sourceRef resolution
  const deckPlan = planDeck(intent, sourceDocument);

  // Step 4: SlideSpec generation
  const slideSpecs = generateSlideSpecs(deckPlan);

  // Step 5: Theme and layout assignment — M12.21: pass brandConfig
  const layoutPlan = generateLayoutPlan(slideSpecs, {
    style: opts.style,
    brandConfig: opts.brandConfig || null,
  });

  // Step 6: PPTX rendering — M12.21: pass brandConfig for theme overrides
  const pptx = renderPptx(slideSpecs, layoutPlan, {
    brandConfig: opts.brandConfig || null,
  });
  const buffer = await generateBuffer(pptx);

  const result = {
    sourceDocument,
    format: ingestResult.format,
    intent,
    deckPlan,
    slideSpecs,
    layoutPlan,
    pptxBuffer: buffer,
    slideCount: slideSpecs.length,
  };

  // Step 7 (optional): Quality manifest emission
  if (opts.emitManifest) {
    const outputDir = opts.outputDir || process.cwd();
    fs.mkdirSync(outputDir, { recursive: true });
    const checkResults = runQualityChecks(slideSpecs);
    const manifest = buildManifest(opts.inputPath || "unknown", result, checkResults, outputDir);
    const manifestPath = writeManifest(manifest, outputDir);
    const summaryPath = writeSummary(manifest, outputDir);
    result.manifest = { path: manifestPath, summaryPath, ...manifest };
  }

  return result;
}

module.exports = { runPipeline };
