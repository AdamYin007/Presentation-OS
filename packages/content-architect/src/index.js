/**
 * @awe/content-architect — PPT 内容架构师 (M12.28)
 *
 * Takes raw document text and produces a structured JSON outline following
 * the Content Architect principles:
 *   Phase 1: Deep reading & intent recognition
 *   Phase 2: Logical skeleton building  
 *   Phase 3: Page refinement & visual mapping
 *   Phase 4: Structured JSON output
 *
 * Output conforms to the Architect JSON Schema with Layout Types:
 *   Cover | SectionDivider | TitleAndContent | TwoColumns | ThreeColumns
 *   BigNumber | Quote | Timeline | Matrix | End
 */

const { analyzeIntent } = require("./phase1-intent.js");
const { buildSkeleton } = require("./phase2-skeleton.js");
const { refinePages } = require("./phase3-refine.js");
const { validateArchitectOutput } = require("./schema.js");
const { architectToMarkdown, architectToSourceDocument } = require("./json-to-markdown.js");

/**
 * Run the full Content Architect pipeline.
 * 
 * @param {string} rawText - Raw document text (markdown/plain)
 * @param {object} options - Options
 * @param {boolean} [options.enabled=false] - Enable architect mode (skip intent parser)
 * @returns {{ ok: boolean, slides: object[], errors?: string[], warnings?: string[] }}
 */
function architect(rawText, options = {}) {
  const opts = { enabled: false, ...(options || {}) };
  const warnings = [];

  if (!opts.enabled) {
    // Architect not enabled — return empty result, pipeline falls back to default
    return { ok: true, slides: [], warnings: ["Content architect disabled"] };
  }

  if (!rawText || !rawText.trim()) {
    return { ok: false, errors: ["Empty input text"], slides: [] };
  }

  // Phase 1: Deep reading & intent recognition
  const intent = analyzeIntent(rawText);
  warnings.push(`Detected: purpose=${intent.purpose}, audience=${intent.audience}, domain=${intent.domain}`);

  // Phase 2: Logical skeleton building
  const skeleton = buildSkeleton(intent, rawText);
  warnings.push(`Skeleton: ${skeleton.totalSlides} slides, ${skeleton.sections.length} sections`);

  // Phase 3: Page refinement & visual mapping
  const slides = refinePages(skeleton, rawText);

  // Phase 4: Validate output
  const validation = validateArchitectOutput(slides);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      slides: [],
      warnings: [...warnings, ...validation.errors],
    };
  }

  return {
    ok: true,
    slides,
    warnings,
  };
}

module.exports = {
  architect,
  architectToMarkdown,
  architectToSourceDocument,
};
