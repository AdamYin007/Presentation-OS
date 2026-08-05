/**
 * Pipeline Orchestrator — M12.7 / M12.14 / M12.21 / M12.33 / M12.35
 *
 * Chains: ingest → intent → story-planner → slidespec → theme-layout → renderer
 * M12.21: brandConfig is threaded through layoutPlan generation and renderer
 * M12.33: added previewOnly option for outline preview generation
 * M12.35: added imagePpt option for image-based PPT generation with sample preview
 */
const { ingestDocument } = require("../../document-ingest/src/index.js");
const { parsePresentationIntent } = require("../../intent-parser/src/index.js");
const { planDeck, generateOutlinePreview } = require("../../story-planner/src/index.js");
const { generateSlideSpecs } = require("../../slidespec/src/index.js");
const { generateLayoutPlan } = require("../../theme-layout/src/index.js");
const { renderPptx, generateBuffer } = require("../../pptx-renderer/src/index.js");
const { generateImagePptx } = require("../../image-ppt/src/index.js");
const { runQualityChecks, buildManifest, writeManifest, writeSummary } = require("./qa-utils.js");
const fs = require("fs");

/**
 * Run full pipeline from markdown input to .pptx buffer.
 *
 * @param {string} markdownInput - Source markdown content
 * @param {Object} options - Pipeline options
 * @param {string} [options.style] - Presentation style
 * @param {string} [options.templatePath] - Path to template PPTX
 * @param {boolean} [options.previewOnly] - Only generate outline preview
 * @param {boolean} [options.imagePpt] - Generate image-based PPT
 * @param {string} [options.imageStyle] - Image PPT style
 * @param {string} [options.apiKey] - API key for image generation
 * @param {string} [options.api] - API to use (dall-e-3, gpt-image-2, azure, custom)
 * @param {string} [options.endpoint] - Custom API endpoint
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.emitManifest] - Generate quality manifest
 * @returns {Promise<Object>} - Pipeline result
 */
async function runPipeline(markdownInput, options = {}) {
  const opts = {
    style: "minimal-modern",
    previewOnly: false,
    imagePpt: false,
    imageStyle: "business-professional",
    outputDir: "./output",
    ...options,
  };

  // Step 1: Document ingestion
  const ingestResult = ingestDocument(markdownInput);
  const sourceDocument = ingestResult.model;

  // Step 2: Intent parsing
  const intent = parsePresentationIntent(markdownInput, { sourceDocument });

  // Step 3: Story planning
  const deckPlan = planDeck(intent, sourceDocument);

  // Step 3.5: Preview mode — return outline without generating PPTX
  if (opts.previewOnly) {
    return {
      sourceDocument,
      intent,
      deckPlan,
      outline: generateOutlinePreview(deckPlan),
      slideCount: deckPlan.slides.length,
      preview: true,
    };
  }

  // Step 4: SlideSpec generation
  const slideSpecs = generateSlideSpecs(deckPlan);

  // Step 5: Handle image-based PPT generation
  if (opts.imagePpt) {
    const imageResult = await generateImagePptx({
      slideSpecs,
      style: opts.imageStyle,
      apiKey: opts.apiKey,
      api: opts.api,
      endpoint: opts.endpoint,
      outputDir: opts.outputDir,
    });

    return {
      sourceDocument,
      format: ingestResult.format,
      intent,
      deckPlan,
      slideSpecs,
      imagePpt: true,
      pptxPath: imageResult.pptxPath,
      slideCount: slideSpecs.length,
      imageStats: imageResult.stats,
      samplePreview: imageResult.samplePreview,
    };
  }

  // Step 6: Theme and layout assignment
  const layoutPlan = generateLayoutPlan(slideSpecs, {
    style: opts.style,
    brandConfig: opts.brandConfig || null,
  });

  // Step 7: PPTX rendering
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

  // Step 8 (optional): Quality manifest emission
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
