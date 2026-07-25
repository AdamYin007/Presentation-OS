/**
 * Pipeline Orchestrator — M12.7 / M12.14 / M12.21 / M12.24 / M12.25 / M12.31
 *
 * Chains: ingest → [content-architect + template-analysis] → intent → story-planner → slidespec → [audience-engine] → theme-layout → [compiler] → renderer → [template-injector] → [visual-qa] → manifest
 * M12.21: brandConfig is threaded through layoutPlan generation and renderer
 * so that brand profiles affect actual PPTX output (colors, fonts, footer, title).
 * M12.24: Presentation Compiler sits between layout/theme and renderer as an opt-in
 * global optimization layer. When enabled, generates a Render Plan before rendering.
 * M12.25: Audience Engine sits between slidespec and theme-layout as an opt-in
 * dynamic adaptation layer. When enabled, adjusts slide specs based on speaker/audience profiles.
 * M12.26: Template backgrounds support via opts.templateBackgrounds.
 * M12.27: Template decorative elements injection via template-injector.js (Step 6.5).
 * M12.28: Content Architect structured outline generation (Step 1.5).
 * M12.30: Visual QA engine — PPTX→PDF→JPEG→AI/heuristic analysis (Step 7.5).
 * M12.31: Template-aware Content Architect — analyzes .pptx templates first,
 *          generates template-principles.md with must-preserve elements,
 *          cover/end slide fidelity rules, and style tokens.
 */
const { ingestDocument } = require("../../document-ingest/src/index.js");
const { parsePresentationIntent } = require("../../intent-parser/src/index.js");
const { planDeck } = require("../../story-planner/src/index.js");
const { generateSlideSpecs } = require("../../slidespec/src/index.js");
const { adaptDeck } = require("../../presentation-audience-engine/src/index.js");
const { ADAPTATION_DIMENSIONS } = require("../../presentation-audience-engine/src/schema.js");
const { generateLayoutPlan } = require("../../theme-layout/src/index.js");
const { compilePresentation, COMPILER_MODES } = require("../../presentation-compiler/src/index.js");
const { renderPptx, generateBuffer } = require("../../pptx-renderer/src/index.js");
const { runQualityChecks, buildManifest, writeManifest, writeSummary } = require("./qa-utils.js");
const { architect, architectToMarkdown } = require("../../content-architect/src/index.js");
const { runVisualQa } = require("./visual-qa.js");
const { injectTemplate } = require("./template-injector.js");
const fs = require("fs");
const path = require("path");

/**
 * Run full pipeline from markdown input to .pptx buffer.
 *
 * @param {string} markdownInput - Markdown text to convert
 * @param {object} options - Pipeline options
 * @param {string} [options.style="minimal-modern"] - Theme style
 * @param {boolean} [options.emitManifest=false] - Generate quality manifest
 * @param {string} [options.outputDir] - Output directory for manifest files
 * @param {string} [options.inputPath] - Source file path for traceability
 * @param {object} [options.brandConfig] - Brand profile configuration (M12.20/21)
 * @param {object} [options.title] - Presentation title override
 * @param {boolean|string} [options.compiler=false] - Enable compiler ("standard"|"optimized")
 * @param {object} [options.audienceEngine] - Audience engine config: { speaker, audience, customRules }
 * @param {string} [options.templateSpecPath] - Path to template spec .md file (auto-generates roleMap)
 * @param {string} [options.templateBackgroundsDir] - Directory containing template background images
 */
async function runPipeline(markdownInput, options) {
  const opts = { style: "minimal-modern", ...(options || {}) };
  const quiet = opts._quiet === true;
  const log = (...args) => { if (!quiet) console.log(...args); };

  // Step 1: Document ingestion
  let ingestResult = ingestDocument(markdownInput);
  let sourceDocument = ingestResult.model;

  // Step 1.5: Content Architect (M12.28 / M12.31) — opt-in structured outline generation
  if (opts.contentArchitect && opts.contentArchitect.enabled !== false) {
    try {
      log("[Pipeline] Running Content Architect...");
      const architectOpts = { 
        enabled: true,
        templatePath: opts.templatePath || null,
        outputDir: opts.outputDir || process.cwd(),
      };
      const architectResult = architect(markdownInput, architectOpts);
      if (architectResult.ok && architectResult.slides.length > 0) {
        log(`[Pipeline] Content Architect generated ${architectResult.slides.length} slides`);
        
        // Log template analysis results if available
        if (architectResult.templatePrinciples) {
          log(`[Pipeline] Template principles loaded: ${architectResult.templatePrinciples.metadata.totalSlides} slides analyzed`);
          for (const rec of architectResult.templatePrinciples.recommendations || []) {
            log(`[Pipeline]   → ${rec.rule}: ${rec.description}`);
          }
        }
        
        // Convert architect JSON to markdown content-plan format
        const architectMarkdown = architectToMarkdown(architectResult.slides);
        log("[Pipeline] Converting architect output to content-plan format...");
        
        // Re-ingest as content-plan
        ingestResult = ingestDocument(architectMarkdown);
        sourceDocument = ingestResult.model;
        log(`[Pipeline] Content plan ready: ${sourceDocument.paragraphs.length} slides in model`);
      } else {
        log("[Pipeline] Content Architect produced no output, falling back to default pipeline");
      }
    } catch (e) {
      console.warn("[Pipeline] Content Architect failed:", e.message);
      // Non-fatal — continue with default pipeline
    }
  }

  // Step 2: Intent parsing — pass actual SourceDocumentModel, not wrapper
  const intent = parsePresentationIntent(markdownInput, { sourceDocument });

  // Step 3: Story planning — pass sourceDocument for sourceRef resolution
  const deckPlan = planDeck(intent, sourceDocument);

  // Step 4: SlideSpec generation
  let slideSpecs = generateSlideSpecs(deckPlan);

  // Step 4.5: Audience Engine (M12.25) — opt-in dynamic adaptation
  let audienceResult = null;
  if (opts.audienceEngine) {
    const aeOpts = typeof opts.audienceEngine === "object" ? opts.audienceEngine : {};
    audienceResult = adaptDeck(slideSpecs, null, aeOpts);
    // Apply adaptation adjustments to slide specs in-place
    if (audienceResult.slideAdjustments) {
      for (const adj of audienceResult.slideAdjustments) {
        const spec = slideSpecs[adj.slideIndex];
        if (!spec) continue;
        for (const adjustment of adj.adjustments) {
          switch (adjustment.dimension) {
            case ADAPTATION_DIMENSIONS.TITLE_DEPTH:
              spec.title = adjustment.newValue;
              break;
            case ADAPTATION_DIMENSIONS.BODY_DETAIL:
              spec.body = spec.body.slice(0, adjustment.newValue);
              break;
            case ADAPTATION_DIMENSIONS.TERMINOLOGY:
              spec.designHints = spec.designHints || {};
              spec.designHints.terminologyLevel = adjustment.newValue;
              break;
            case ADAPTATION_DIMENSIONS.EMPHASIS:
              spec.designHints = spec.designHints || {};
              spec.designHints.emphasisStyle = adjustment.newValue;
              break;
            case require("../../presentation-audience-engine/src/schema.js").ADAPTATION_DIMENSIONS
              .SPEAKER_NOTES_TONE:
              spec.designHints = spec.designHints || {};
              spec.designHints.speakerNotesTone = adjustment.newValue;
              break;
          }
        }
      }
    }
  }

  // Step 5: Theme and layout assignment — M12.21: pass brandConfig
  const layoutPlan = generateLayoutPlan(slideSpecs, {
    style: opts.style,
    brandConfig: opts.brandConfig || null,
  });

  // Step 5.5: Presentation Compiler (M12.24) — opt-in global optimization
  let compilerResult = null;
  if (opts.compiler) {
    const compilerMode =
      typeof opts.compiler === "string" ? opts.compiler : COMPILER_MODES.STANDARD;
    compilerResult = compilePresentation(slideSpecs, layoutPlan, { mode: compilerMode });
  }

  // Step 6: PPTX rendering — M12.21: pass brandConfig for theme overrides
  //         M12.26: pass templateBackgrounds for template-style background images
  const renderOpts = {
    brandConfig: opts.brandConfig || null,
  };
  if (opts.templateBackgrounds) {
    renderOpts.templateBackgrounds = opts.templateBackgrounds;
  }
  const pptx = renderPptx(slideSpecs, layoutPlan, renderOpts);
  let buffer = await generateBuffer(pptx);

  // Step 6.5: Template decorative elements injection (M12.27) — delegated to template-injector.js
  if (opts.templatePath) {
    const templateResult = injectTemplate(buffer, slideSpecs, {
      templatePath: opts.templatePath,
      templateSpecPath: opts.templateSpecPath,
      templateBackgroundsDir: opts.templateBackgroundsDir,
      templateRoleMap: opts.templateRoleMap,
      templateBackgrounds: opts.templateBackgrounds,
    });
    buffer = templateResult.buffer;
    for (const w of templateResult.warnings || []) {
      console.warn("[Pipeline] Template warning:", w);
    }
  }

  const outputDir = opts.outputDir || process.cwd();
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Write the final PPTX to disk
  const pptxFilename = opts.pptxFilename || "output.pptx";
  const pptxPath = path.join(outputDir, pptxFilename);
  fs.writeFileSync(pptxPath, buffer);
  log(`[Pipeline] Wrote ${pptxFilename} (${buffer.length} bytes)`);

  const result = {
    sourceDocument,
    format: ingestResult.format,
    intent,
    deckPlan,
    slideSpecs,
    layoutPlan,
    pptxBuffer: buffer,
    pptxPath: pptxPath,
    slideCount: slideSpecs.length,
  };

  // Step 7 (optional): Visual QA — PPTX → PDF → JPEG → AI/heuristic analysis
  let visualQaResult = null;
  if (opts.visualQa) {
    try {
      log("[Pipeline] Running Visual QA...");
      const qaOpts = typeof opts.visualQa === "object" ? opts.visualQa : {};
      const outputDir = qaOpts.outputDir || path.join(process.cwd(), ".visual-qa-output");
      visualQaResult = await runVisualQa(buffer, { outputDir, skipAi: qaOpts.skipAi, aiConfig: qaOpts.aiConfig });
      result.visualQa = visualQaResult;
      log(`[Pipeline] Visual QA complete: ${visualQaResult.summary?.totalSlides || "?"} slides analyzed`);
    } catch (e) {
      console.warn("[Pipeline] Visual QA failed (non-fatal):", e.message);
    }
  }

  // Attach audience engine metadata if enabled
  if (audienceResult) {
    result.audienceEngine = {
      contract: audienceResult.contract,
      slideAdjustments: audienceResult.slideAdjustments,
      deckHints: audienceResult.deckHints,
      assumptions: audienceResult.assumptions,
      warnings: audienceResult.warnings,
    };
  }

  // Attach compiler metadata if enabled
  if (compilerResult) {
    result.compiler = {
      mode: compilerResult.mode,
      analysis: compilerResult.analysis,
      overflowReport: compilerResult.overflowReport,
      paginationDecisions: compilerResult.paginationDecisions,
      warnings: compilerResult.warnings,
      resourceOptimization: compilerResult.resourceOptimization,
    };
  }

  // Step 7 (optional): Quality manifest emission (M12.14)
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
