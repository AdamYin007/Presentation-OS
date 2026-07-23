/**
 * Pipeline Orchestrator — M12.7 / M12.14 / M12.21 / M12.24 / M12.25
 *
 * Chains: ingest → intent → story-planner → slidespec → [audience-engine] → theme-layout → [compiler] → renderer → [visual-qa] → manifest
 * M12.21: brandConfig is threaded through layoutPlan generation and renderer
 * so that brand profiles affect actual PPTX output (colors, fonts, footer, title).
 * M12.24: Presentation Compiler sits between layout/theme and renderer as an opt-in
 * global optimization layer. When enabled, generates a Render Plan before rendering.
 * M12.25: Audience Engine sits between slidespec and theme-layout as an opt-in
 * dynamic adaptation layer. When enabled, adjusts slide specs based on speaker/audience profiles.
 * M12.26: Template backgrounds support via opts.templateBackgrounds.
 * M12.27: Template decorative elements injection via template-injector.py (Step 6.5).
 * M12.28: Content Architect structured outline generation (Step 1.5).
 * M12.30: Visual QA engine — PPTX→PDF→JPEG→AI/heuristic analysis (Step 7.5).
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
const { parseTemplateSpec, generateRoleMap } = require("./template-parser.js");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

  // Step 1: Document ingestion
  let ingestResult = ingestDocument(markdownInput);
  let sourceDocument = ingestResult.model;

  // Step 1.5: Content Architect (M12.28) — opt-in structured outline generation
  if (opts.contentArchitect && opts.contentArchitect.enabled !== false) {
    try {
      console.log("[Pipeline] Running Content Architect...");
      const architectResult = architect(markdownInput, { enabled: true });
      if (architectResult.ok && architectResult.slides.length > 0) {
        console.log(`[Pipeline] Content Architect generated ${architectResult.slides.length} slides`);
        
        // Convert architect JSON to markdown content-plan format
        const architectMarkdown = architectToMarkdown(architectResult.slides);
        console.log("[Pipeline] Converting architect output to content-plan format...");
        
        // Re-ingest as content-plan
        ingestResult = ingestDocument(architectMarkdown);
        sourceDocument = ingestResult.model;
        console.log(`[Pipeline] Content plan ready: ${sourceDocument.paragraphs.length} slides in model`);
      } else {
        console.log("[Pipeline] Content Architect produced no output, falling back to default pipeline");
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

  // Step 6.5: Template decorative elements injection (M12.27)
  if (opts.templatePath) {
    // Auto-generate roleMap from template spec if available
    let roleMap = opts.templateRoleMap || {};
    if (opts.templateSpecPath && !opts.templateRoleMap) {
      try {
        console.log("[Pipeline] Parsing template spec:", opts.templateSpecPath);
        const specData = parseTemplateSpec(opts.templateSpecPath);
        const roleMapData = generateRoleMap(specData);
        roleMap = roleMapData.roleMap;
        opts.templateRoleMap = roleMap;
        console.log(`[Pipeline] Auto-generated role map: ${Object.keys(roleMap).length} slides mapped`);
        if (result.templateSpec) {
          result.templateSpec = { ...specData, roleMap };
        }
      } catch (e) {
        console.warn("[Pipeline] Template spec parsing failed (using manual roleMap):", e.message);
      }
    }

    // Auto-load template backgrounds from directory
    if (opts.templateBackgroundsDir && !opts.templateBackgrounds) {
      try {
        const bgFiles = fs.readdirSync(opts.templateBackgroundsDir)
          .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
          .sort();
        if (bgFiles.length > 0) {
          const backgrounds = {};
          for (let i = 0; i < Math.min(bgFiles.length, slideSpecs.length); i++) {
            backgrounds[String(i + 1)] = path.join(opts.templateBackgroundsDir, bgFiles[i]);
          }
          opts.templateBackgrounds = backgrounds;
          console.log(`[Pipeline] Loaded ${Object.keys(backgrounds).length} template backgrounds`);
        }
      } catch (e) {
        console.warn("[Pipeline] Background loading failed:", e.message);
      }
    }

    const tmpDir = fs.mkdtempSync("/tmp/presentation-os-inject-");
    const inputPptx = path.join(tmpDir, "input.pptx");
    const outputPptx = path.join(tmpDir, "output.pptx");
    const roleMapPath = path.join(tmpDir, "role-map.json");
    
    fs.writeFileSync(inputPptx, buffer);
    
    // Build role map from slideSpecs roles (only if not already set by template spec parser)
    if (!opts.templateRoleMap) {
      const fallbackRoleMap = {};
    const roleToTemplate = opts.templateRoleMap || {
      cover: 1, title: 1, agenda: 2, "section-divider": 3, content: 4, closing: 5,
    };
      for (let i = 0; i < slideSpecs.length; i++) {
        const spec = slideSpecs[i];
        const slideNum = spec.index || (i + 1);
        const role = spec.role || "content";
        const tmplIdx = roleToTemplate[role];
        if (tmplIdx) {
          fallbackRoleMap[String(slideNum)] = tmplIdx;
        }
      }
      roleMap = fallbackRoleMap;
      fs.writeFileSync(roleMapPath, JSON.stringify(roleMap));
    } else {
      // roleMap was already set by template spec parser
      fs.writeFileSync(roleMapPath, JSON.stringify(roleMap));
    }
    
    const injectorScript = path.join(__dirname, "..", "scripts", "template-injector.py");
    console.log("[Pipeline] Injector script:", injectorScript);
    console.log("[Pipeline] Role map:", JSON.stringify(roleMap));
    try {
      execSync(
        `python3 "${injectorScript}" "${inputPptx}" "${opts.templatePath}" "${outputPptx}" "${roleMapPath}"`,
        { stdio: "pipe", timeout: 60000 }
      );
      buffer = fs.readFileSync(outputPptx);
      console.log("[Pipeline] Template injection successful");
    } catch (e) {
      // Injection failure is non-fatal — continue with undecorated output
      console.warn("[Pipeline] Template injection failed:", e.message);
    }
    
    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

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

  // Step 7 (optional): Visual QA — PPTX → PDF → JPEG → AI/heuristic analysis
  let visualQaResult = null;
  if (opts.visualQa) {
    try {
      console.log("[Pipeline] Running Visual QA...");
      const qaOpts = typeof opts.visualQa === "object" ? opts.visualQa : {};
      const outputDir = qaOpts.outputDir || path.join(process.cwd(), ".visual-qa-output");
      visualQaResult = await runVisualQa(buffer, { outputDir, skipAi: qaOpts.skipAi, aiConfig: qaOpts.aiConfig });
      result.visualQa = visualQaResult;
      console.log(`[Pipeline] Visual QA complete: ${visualQaResult.summary?.totalSlides || "?"} slides analyzed`);
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
