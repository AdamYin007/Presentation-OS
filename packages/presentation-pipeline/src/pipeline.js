/**
 * Pipeline Orchestrator — M12.7
 *
 * Chains: ingest → intent → story-planner → slidespec → theme-layout → renderer
 */
const { ingestDocument } = require("../../document-ingest/src/index.js");
const { parsePresentationIntent } = require("../../intent-parser/src/index.js");
const { planDeck } = require("../../story-planner/src/index.js");
const { generateSlideSpecs } = require("../../slidespec/src/index.js");
const { generateLayoutPlan } = require("../../theme-layout/src/index.js");
const { renderPptx, generateBuffer } = require("../../pptx-renderer/src/index.js");

/**
 * Run full pipeline from markdown input to .pptx buffer.
 */
async function runPipeline(markdownInput, options) {
  const opts = { style: "minimal-modern", ...(options || {}) };

  // Step 1: Document ingestion
  const sourceDoc = ingestDocument(markdownInput);

  // Step 2: Intent parsing
  const intent = parsePresentationIntent(markdownInput, { sourceDocument: sourceDoc });

  // Step 3: Story planning
  const deckPlan = planDeck(intent);

  // Step 4: SlideSpec generation
  const slideSpecs = generateSlideSpecs(deckPlan);

  // Step 5: Theme and layout assignment
  const layoutPlan = generateLayoutPlan(slideSpecs, { style: opts.style });

  // Step 6: PPTX rendering
  const pptx = renderPptx(slideSpecs, layoutPlan);
  const buffer = await generateBuffer(pptx);

  return {
    sourceDocument: sourceDoc,
    intent,
    deckPlan,
    slideSpecs,
    layoutPlan,
    pptxBuffer: buffer,
    slideCount: slideSpecs.length,
  };
}

module.exports = { runPipeline };
