#!/usr/bin/env node
/**
 * Deliver PPTX — One-Command Commercial Delivery Pipeline
 *
 * Accepts an input markdown file, runs the full presentation pipeline,
 * generates output.pptx plus all QA artifacts, and produces a commercial
 * verdict. All in one command.
 *
 * Usage:
 *   node scripts/deliver-pptx.js <input.md> [output-dir] [--style <style>] [--title <title>] [--brand-profile <name-or-path>] [--json]
 *
 * Examples:
 *   node scripts/deliver-pptx.js docs/proposal.md ./deliverables --style business-consulting
 *   node scripts/deliver-pptx.js slides.md ./out --title "Q3 Review" --json
 *   npm run deliver:pptx -- docs/business-review.md ./deliverables --style minimal-modern
 *   node scripts/deliver-pptx.js slides.md ./out --brand-profile /path/to/custom-brand.json
 *
 * Output artifacts (written to output-dir):
 *   - output.pptx              Generated PowerPoint deck
 *   - quality-manifest.json    Deterministic quality scoring (M12.14)
 *   - QA-SUMMARY.md            Human-readable QA summary (M12.14)
 *   - VISUAL-DESIGN-SUMMARY.md Visual design analysis (M12.16)
 *   - rendered-qa-report.json  Rendered page analysis (M12.15)
 *   - PIXEL-ACCESSIBILITY-SUMMARY.md Pixel contrast + color-blindness (M12.17)
 *   - LOGO-SAFE-AREA-SUMMARY.md Logo safe-area enforcement (M12.19)
 *   - COMMERCIAL-VERDICT.md    Final commercial-readiness verdict
 *   - machine-report.json      Machine-readable JSON report (all gates merged)
 *
 * Exit codes:
 *   0 — PASS or NEEDS_REVIEW (informational)
 *   1 — FAIL (hard defects detected)
 *   2 — Error (invalid input, missing file, pipeline crash)
 *
 * Graceful degradation:
 *   If LibreOffice/ImageMagick/Poppler are missing, rendered checks degrade
 *   to metadata-only analysis. Verdict becomes NEEDS_REVIEW instead of
 *   false PASS. True hard defects still return FAIL.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const renderedVisualQa = require("../packages/presentation-pipeline/src/rendered-visual-qa.js");
const {
  runVisualDesignGate,
  generateHumanSummary: generateM12_16Summary,
} = require("../packages/visual-design-gate/src/index.js");
const {
  detectEnvironment,
  checkPixelContrast,
  checkColorBlindness,
  checkFontFallback,
  mergeCommercialReadiness,
} = require("../packages/pixel-accessibility-gate/src/index.js");
const { checkLogoSafeArea } = require("../packages/logo-safe-area-gate/src/index.js");
const {
  loadProfile,
  resolveBrandConfig,
  getBuiltInProfiles,
} = require("../packages/brand-profiles/src/index.js");

// ─── Argument Parsing ──────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  let positional = [];
  let options = {
    style: "minimal-modern",
    title: null,
    json: false,
    brandProfile: null,
    compiler: false,
    audience: null,
    speaker: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      console.log(`Usage: node scripts/deliver-pptx.js <input.md> [output-dir] [options]

Options:
  --style <name>     Theme style: minimal-modern | business-consulting | academic-clean
                     (default: minimal-modern)
  --brand-profile <name-or-path>
                     Brand profile name (built-in) or absolute path to JSON file.
                     Built-ins: ${getBuiltInProfiles().join(", ")}
                     Profile feeds logoSafeArea, allowed colors, typography, footer/title conventions.
  --title <text>     Override presentation title
  --compiler         Enable Presentation Compiler (M12.24) — standard mode optimization
                     Analyzes entire presentation before rendering: overflow detection,
                     pagination, resource deduplication, theme consistency.
  --optimize         Same as --compiler but enables full constraint solving,
                     pagination analysis, and accessibility checking (optimized mode).
  --audience <role>  Audience role for dynamic adaptation (M12.25):
                     board | executives | managers | engineers | students | investors | customers | general
  --speaker <profile>Speaker profile for dynamic adaptation (M12.25):
                     executive | manager | specialist | student | general_public
  --json             Also print machine-readable report to stdout
  --help, -h         Show this help message

Examples:
  node scripts/deliver-pptx.js docs/proposal.md ./deliverables
  node scripts/deliver-pptx.js slides.md ./out --style business-consulting
  node scripts/deliver-pptx.js slides.md ./out --brand-profile business-consulting
  node scripts/deliver-pptx.js slides.md ./out --brand-profile /path/to/my-brand.json
  node scripts/deliver-pptx.js slides.md ./out --title "Q3 Review" --json
  node scripts/deliver-pptx.js slides.md ./out --compiler
  node scripts/deliver-pptx.js slides.md ./out --optimize`);
      process.exit(0);
    }
    if (args[i] === "--style" && i + 1 < args.length) {
      options.style = args[++i];
    } else if (args[i] === "--brand-profile" && i + 1 < args.length) {
      options.brandProfile = args[++i];
    } else if (args[i] === "--title" && i + 1 < args.length) {
      options.title = args[++i];
    } else if (args[i] === "--optimize") {
      options.compiler = "optimized";
    } else if (args[i] === "--compiler") {
      options.compiler = "standard";
    } else if (args[i] === "--audience" && i + 1 < args.length) {
      options.audience = args[++i];
    } else if (args[i] === "--speaker" && i + 1 < args.length) {
      options.speaker = args[++i];
    } else if (args[i] === "--json") {
      options.json = true;
    } else if (!args[i].startsWith("--")) {
      positional.push(args[i]);
    }
  }

  return { inputPath: positional[0], outputPath: positional[1], options };
}

// ─── Helpers ───────────────────────────────────────────────────────

let jsonMode = false;

function commandExists(cmd) {
  try {
    require("child_process").execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function step(label) {
  if (!jsonMode) {
    console.log("");
    console.log(label);
    console.log("-".repeat(label.length));
  }
}

function log(level, msg) {
  if (!jsonMode) {
    const icon =
      level === "OK" ? "  OK" : level === "WARN" ? " WARN" : level === "FAIL" ? "FAIL" : "    ";
    console.log(`${icon} ${msg}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const { inputPath, outputPath, options } = parseArgs(process.argv);

  // Validate input
  if (!inputPath) {
    console.error("Error: input markdown path is required.");
    console.error("Usage: node scripts/deliver-pptx.js <input.md> [output-dir] [options]");
    process.exit(2);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Error: input file not found: ${resolvedInput}`);
    process.exit(2);
  }

  const inputText = fs.readFileSync(resolvedInput, "utf8");
  if (!inputText.trim()) {
    console.error("Error: input file is empty.");
    process.exit(2);
  }

  jsonMode = options.json; // set before any console output

  // ── Load Brand Profile (M12.20) ────────────────────────────────
  let brandConfig = {};
  let profileSource = null;
  if (options.brandProfile) {
    try {
      const { profile, source } = loadProfile(options.brandProfile);
      brandConfig = resolveBrandConfig(profile);
      profileSource = source;
      if (!jsonMode) {
        console.log(`Loaded brand profile: ${profile.name || profile.id} (${source})`);
      }
    } catch (err) {
      console.error(`Error loading brand profile: ${err.message}`);
      process.exit(2);
    }
  }

  const rootDir = path.join(__dirname, "..");
  const outDir = outputPath ? path.resolve(outputPath) : path.join(rootDir, "deliverables");
  const auditDir = outDir;

  // Ensure output directory
  fs.mkdirSync(auditDir, { recursive: true });

  const pptxPath = path.join(auditDir, "output.pptx");
  const manifestPath = path.join(outDir, "quality-manifest.json");
  const qaSummaryPath = path.join(outDir, "QA-SUMMARY.md");
  const visualSummaryPath = path.join(outDir, "VISUAL-DESIGN-SUMMARY.md");
  const renderedReportPath = path.join(outDir, "rendered-qa-report.json");
  const pixelSummaryPath = path.join(outDir, "PIXEL-ACCESSIBILITY-SUMMARY.md");
  const verdictPath = path.join(outDir, "COMMERCIAL-VERDICT.md");
  const machineReportPath = path.join(outDir, "machine-report.json");
  const logoReportPath = path.join(outDir, "logo-safe-area-report.json");
  const logoSummaryPath = path.join(outDir, "LOGO-SAFE-AREA-SUMMARY.md");

  if (!jsonMode) {
    console.log("=".repeat(65));
    console.log("AWE — One-Command Commercial Delivery Pipeline");
    console.log("=".repeat(65));
    console.log(`Input:  ${resolvedInput}`);
    console.log(`Output: ${auditDir}`);
    console.log(`Style:  ${options.style}`);
    if (profileSource) console.log(`Profile: ${profileSource}`);
    if (options.title) console.log(`Title:  ${options.title}`);
    console.log("");
  }

  // ── Step 1: Run Presentation Pipeline ──────────────────────────
  step("[1/6] Running presentation pipeline...");

  const pipelineOpts = {
    style: options.style,
    emitManifest: true,
    outputDir: auditDir,
    inputPath: resolvedInput,
    brandConfig: brandConfig || null,
    compiler: options.compiler || false,
  };
  if (options.title) pipelineOpts.title = options.title;
  if (options.audience || options.speaker) {
    pipelineOpts.audienceEngine = {};
    if (options.audience) pipelineOpts.audienceEngine.audience = options.audience;
    if (options.speaker) pipelineOpts.audienceEngine.speaker = options.speaker;
  }

  let pipelineResult;
  try {
    pipelineResult = await runPipeline(inputText, { ...pipelineOpts, _quiet: true });
  } catch (err) {
    console.error(`Pipeline error: ${err.message}`);
    if (!options.json) {
      fs.writeFileSync(
        verdictPath,
        "# Commercial Delivery Verdict\n\n**Status**: ERROR\n\nPipeline failed: " +
          err.message +
          "\n",
      );
    }
    process.exit(2);
  }

  const slideSpecs = pipelineResult.slideSpecs;
  const layoutPlan = pipelineResult.layoutPlan;
  const manifest = pipelineResult.manifest;
  const pptxBuffer = pipelineResult.pptxBuffer;

  // Write PPTX
  fs.writeFileSync(pptxPath, pptxBuffer);
  const pptxSize = pptxBuffer.length;
  log("OK", `PPTX generated (${pptxSize.toLocaleString()} bytes)`);

  // Write quality manifest
  if (pipelineResult.manifest) {
    fs.writeFileSync(manifestPath, JSON.stringify(pipelineResult.manifest, null, 2));
    log("OK", "Quality manifest written");
  }

  // Write QA summary
  if (pipelineResult.qaSummary) {
    fs.writeFileSync(qaSummaryPath, pipelineResult.qaSummary);
    log("OK", "QA summary written");
  }

  if (!jsonMode) console.log("");

  // ── Step 2: M12.15 — Rendered Visual QA ────────────────────────
  step("[2/6] M12.15 — Rendered Visual QA...");

  const {
    resolveRenderer,
    renderToPdf,
    getPdfPageCount,
    renderPdfToPng,
    validateLayoutGeometry,
    validateRenderedPages,
    computeVerdict,
  } = renderedVisualQa;

  const renderer = resolveRenderer();
  let m12_15_verdict = "NEEDS_REVIEW";
  let pdfTextPages = [];
  let pngFiles = [];

  if (renderer.available) {
    const pdfResult = renderToPdf(pptxPath, auditDir, renderer);
    if (pdfResult.success) {
      const pageCount = getPdfPageCount(pdfResult.pdfPath);
      log("OK", `PDF rendered: ${pageCount} page(s)`);

      // PDF text extraction for font checks
      if (commandExists("pdftotext")) {
        try {
          pdfTextPages = [];
          for (let i = 1; i <= pageCount; i++) {
            const text = require("child_process").execFileSync(
              "pdftotext",
              ["-f", String(i), "-l", String(i), "-layout", pdfResult.pdfPath, "-"],
              { encoding: "utf8", timeout: 30000 },
            );
            pdfTextPages.push({
              page: i,
              charCount: text.replace(/\s+/g, "").length,
              rawLength: text.length,
            });
          }
        } catch (e) {
          // pdftotext per-page failed — continue with empty pages
          pdfTextPages = [];
        }
      }

      // PNG conversion for pixel analysis
      pngFiles = renderPdfToPng(pdfResult.pdfPath, auditDir, pageCount);
      const env = detectEnvironment();
      if (!pngFiles.length && env.hasImagemagick) {
        try {
          const baseName = path.basename(pdfResult.pdfPath, ".pdf");
          const outGlob = path.join(auditDir, `${baseName}-page-%d.png`);
          require("child_process").execFileSync(
            "magick",
            [pdfResult.pdfPath, "-density", "200", "-quality", "95", outGlob],
            { timeout: 120000 },
          );
          for (let i = 1; i <= pageCount; i++) {
            const expected = path.join(auditDir, `${baseName}-page-${i}.png`);
            if (fs.existsSync(expected)) {
              pngFiles.push({ num: i, file: expected });
            }
          }
        } catch (e) {
          log("WARN", `ImageMagick PDF->PNG failed: ${e.message}`);
        }
      }
      log("OK", `PNGs: ${pngFiles.length} page(s)`);
    } else {
      log("WARN", `PDF conversion failed: ${pdfResult.reason}`);
    }
  } else {
    log("WARN", "LibreOffice unavailable — package-level checks only");
  }

  const geometry = validateLayoutGeometry(slideSpecs, layoutPlan);
  const renderedResults = validateRenderedPages(
    pngFiles.map(() => null),
    pdfTextPages,
    slideSpecs,
  );

  m12_15_verdict = computeVerdict(
    manifest,
    { ...geometry, ...renderedResults },
    renderer.available,
  ).verdict;
  log(
    m12_15_verdict === "PASS" ? "OK" : m12_15_verdict === "FAIL" ? "FAIL" : "WARN",
    `M12.15 verdict: ${m12_15_verdict}`,
  );

  // Write rendered QA report
  fs.writeFileSync(
    renderedReportPath,
    JSON.stringify(
      {
        verdict: m12_15_verdict,
        rendererAvailable: renderer.available,
        pageCount: pdfTextPages.length,
        geometry,
        renderedResults,
        qualityScore: manifest?.summary?.qualityScore || 0,
      },
      null,
      2,
    ),
  );
  log("OK", "Rendered QA report written");

  if (!jsonMode) console.log("");

  // ── Step 3: M12.16 + M12.20 — Visual Design Standards Gate ──────
  step("[3/6] M12.16 + M12.20 — Visual Design Standards Gate...");

  const m12_16_gate = await runVisualDesignGate(slideSpecs, layoutPlan, {
    m12_15_verdict,
    brandConfig,
  });
  log(
    m12_16_gate.overallVerdict === "PASS"
      ? "OK"
      : m12_16_gate.overallVerdict === "FAIL"
        ? "FAIL"
        : "WARN",
    `M12.16 verdict: ${m12_16_gate.overallVerdict} (score: ${m12_16_gate.summary.qualityScore}/100)`,
  );

  // Write visual design summary
  fs.writeFileSync(visualSummaryPath, generateM12_16Summary(m12_16_gate));
  log("OK", "Visual design summary written");

  if (!jsonMode) console.log("");

  // ── Step 4: M12.19 + M12.20 — Logo Safe Area Enforcement ────────
  step("[4/6] M12.19 + M12.20 — Logo Safe Area Enforcement...");

  const m12_19_logo = checkLogoSafeArea(slideSpecs, layoutPlan, brandConfig);
  log(
    m12_19_logo.verdict === "PASS" ? "OK" : m12_19_logo.verdict === "FAIL" ? "FAIL" : "WARN",
    `M12.19 logo safe-area: ${m12_19_logo.verdict} (${m12_19_logo.totalLogosChecked} logos checked)`,
  );

  // Write logo safe-area report
  fs.writeFileSync(
    logoReportPath,
    JSON.stringify(
      {
        gate: "m12_19_logo_safe_area",
        verdict: m12_19_logo.verdict,
        passCount: m12_19_logo.passCount,
        failCount: m12_19_logo.failCount,
        warnCount: m12_19_logo.warnCount,
        totalLogosChecked: m12_19_logo.totalLogosChecked,
        margins: m12_19_logo.margins,
        slideDimensions: m12_19_logo.slideDimensions,
        results: m12_19_logo.results,
        issues: m12_19_logo.issues,
        brandProfile: profileSource || null,
      },
      null,
      2,
    ),
  );
  log("OK", "Logo safe-area report written");

  if (!jsonMode) console.log("");

  // ── Step 5: M12.17 — Pixel Accessibility & Color Blindness ─────
  step("[5/6] M12.17 — Pixel Accessibility & Color Blindness...");

  const environment = detectEnvironment();
  const pixelContrast = checkPixelContrast(pngFiles, slideSpecs, layoutPlan);
  log(
    pixelContrast.verdict === "PASS" ? "OK" : pixelContrast.verdict === "FAIL" ? "FAIL" : "WARN",
    `Pixel contrast: ${pixelContrast.verdict}`,
  );
  if (pixelContrast.degraded) log("WARN", "Degraded: ImageMagick unavailable, using color proxy");

  const colorblind = checkColorBlindness(layoutPlan);
  log(
    colorblind.verdict === "PASS" ? "OK" : colorblind.verdict === "FAIL" ? "FAIL" : "WARN",
    `Color-blindness: ${colorblind.verdict}`,
  );

  const font = checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment);
  log(
    font.verdict === "PASS" ? "OK" : font.verdict === "FAIL" ? "FAIL" : "WARN",
    `Font readability: ${font.verdict}`,
  );
  if (font.degraded) log("WARN", "Degraded: PDF text extraction unavailable");

  if (!jsonMode) console.log("");

  // ── Step 6: Merge Commercial Readiness Report ──────────────────
  step("[6/6] Merging commercial readiness report...");

  const commercialReport = mergeCommercialReadiness(
    m12_15_verdict,
    m12_16_gate,
    pixelContrast,
    colorblind,
    font,
    environment,
    m12_19_logo,
  );

  // Enforce: any M12.17 sub-check FAIL prevents overall PASS
  if (
    commercialReport.overallVerdict === "PASS" &&
    (pixelContrast.verdict === "FAIL" || colorblind.verdict === "FAIL" || font.verdict === "FAIL")
  ) {
    commercialReport.overallVerdict = "FAIL";
  }

  log(
    commercialReport.overallVerdict === "PASS"
      ? "OK"
      : commercialReport.overallVerdict === "FAIL"
        ? "FAIL"
        : "WARN",
    `Overall commercial readiness: ${commercialReport.overallVerdict}`,
  );
  log(
    "",
    `Checks: ${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn`,
  );
  if (commercialReport.remediations.length > 0) {
    log("", `Remediations: ${commercialReport.remediations.length} actionable items`);
  }

  if (!jsonMode) console.log("");

  // ── Step 7: Write Final Reports ────────────────────────────────
  step("[7/7] Writing final reports...");

  // Machine-readable JSON report
  fs.writeFileSync(machineReportPath, JSON.stringify(commercialReport, null, 2));
  log("OK", `Machine report: ${machineReportPath}`);

  // PIXEL-ACCESSIBILITY-SUMMARY.md
  const summaryLines = [];
  summaryLines.push("# Pixel-Level Accessibility & Rendered Visual Robustness");
  summaryLines.push("");
  summaryLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  summaryLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  summaryLines.push(
    `**Total Checks**: ${commercialReport.totalChecks.pass + commercialReport.totalChecks.fail + commercialReport.totalChecks.warn} (${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn)`,
  );
  summaryLines.push("");

  summaryLines.push("## Environment");
  summaryLines.push("");
  summaryLines.push("| Component | Available |");
  summaryLines.push("|-----------|-----------|");
  summaryLines.push(`| LibreOffice | ${environment.hasLibreOffice ? "Yes" : "No"} |`);
  summaryLines.push(`| ImageMagick | ${environment.hasImagemagick ? "Yes" : "No"} |`);
  summaryLines.push(`| Poppler | ${environment.hasPoppler ? "Yes" : "No"} |`);
  summaryLines.push(`| Python3 | ${environment.hasPython ? "Yes" : "No"} |`);
  summaryLines.push("");

  summaryLines.push("## Gate Results");
  summaryLines.push("");
  summaryLines.push("| Gate | Verdict |");
  summaryLines.push("|------|---------|");
  summaryLines.push(
    `| M12.15 Rendered Visual QA | ${commercialReport.gateResults.m12_15_rendered_qa} |`,
  );
  summaryLines.push(
    `| M12.16 Visual Design Standards | ${commercialReport.gateResults.m12_16_visual_design} |`,
  );
  summaryLines.push(
    `| M12.17 Pixel Contrast | ${commercialReport.gateResults.m12_17_pixel_contrast} |`,
  );
  summaryLines.push(
    `| M12.17 Color-Blindness | ${commercialReport.gateResults.m12_17_color_blindness} |`,
  );
  summaryLines.push(
    `| M12.17 Font Readability | ${commercialReport.gateResults.m12_17_font_readability} |`,
  );
  summaryLines.push(
    `| **Overall Commercial Readiness** | **${commercialReport.overallVerdict}** |`,
  );
  summaryLines.push("");

  if (pixelContrast.findings && pixelContrast.findings.length > 0) {
    summaryLines.push("### Pixel Contrast Details");
    summaryLines.push("");
    summaryLines.push(
      `**Verdict**: ${pixelContrast.verdict}${pixelContrast.degraded ? " (degraded: no ImageMagick)" : ""}`,
    );
    summaryLines.push("");
    summaryLines.push("| Page | Role | Method | Ratio | Severity |");
    summaryLines.push("|------|------|--------|-------|----------|");
    for (const f of pixelContrast.findings) {
      const icon = f.severity === "pass" ? "PASS" : f.severity === "warn" ? "WARN" : "FAIL";
      summaryLines.push(
        `| ${f.page} | ${f.role} | ${f.method} | ${f.ratio ? f.ratio + ":1" : "N/A"} | ${icon} |`,
      );
    }
    summaryLines.push("");
  }

  if (colorblind.findings && colorblind.findings.length > 0) {
    summaryLines.push("### Color-Blindness Simulation");
    summaryLines.push("");
    summaryLines.push(`**Verdict**: ${colorblind.verdict}`);
    summaryLines.push("");
    summaryLines.push(
      "Simulates protanopia, deuteranopia, and tritanopia via deterministic matrix transforms.",
    );
    summaryLines.push("");
    const failFindings = colorblind.findings.filter((f) => f.severity === "fail");
    const warnFindings = colorblind.findings.filter((f) => f.severity === "warn");
    if (failFindings.length > 0) {
      summaryLines.push("#### Hard Failures");
      summaryLines.push("");
      for (const f of failFindings) {
        summaryLines.push(
          `- Slide ${f.page}: ${f.pair} — sim distance ${f.simDist} (${f.simType})${f.suggestion ? " → " + f.suggestion : ""}`,
        );
      }
      summaryLines.push("");
    }
    if (warnFindings.length > 0) {
      summaryLines.push("#### Warnings");
      summaryLines.push("");
      for (const f of warnFindings) {
        summaryLines.push(
          `- Slide ${f.page}: ${f.pair} — sim distance ${f.simDist} (${f.simType})`,
        );
      }
      summaryLines.push("");
    }
    if (!failFindings.length && !warnFindings.length) {
      summaryLines.push(
        "All color pairs maintain distinguishability across all three simulations.",
      );
      summaryLines.push("");
    }
  }

  if (font.findings && font.findings.length > 0) {
    summaryLines.push("### Font Fallback & Readability");
    summaryLines.push("");
    summaryLines.push(
      `**Verdict**: ${font.verdict}${font.degraded ? " (degraded: no poppler)" : ""}`,
    );
    summaryLines.push("");
    for (const f of font.findings) {
      if (f.suggestion) {
        summaryLines.push(`- [${f.category}] ${f.suggestion}`);
      }
    }
    summaryLines.push("");
  }

  if (commercialReport.remediations.length > 0) {
    summaryLines.push("## Remediation Actions");
    summaryLines.push("");
    for (const r of commercialReport.remediations) {
      summaryLines.push(`- **[${r.priority.toUpperCase()}]** ${r.category}: ${r.suggestion}`);
    }
    summaryLines.push("");
  }

  summaryLines.push("---");
  summaryLines.push("");
  summaryLines.push("## M12.16 Visual Design Summary");
  summaryLines.push("");
  summaryLines.push(generateM12_16Summary(m12_16_gate));

  fs.writeFileSync(pixelSummaryPath, summaryLines.join("\n"));
  log("OK", `Pixel accessibility summary: ${pixelSummaryPath}`);

  // LOGO-SAFE-AREA-SUMMARY.md
  const logoSummaryLines = [];
  logoSummaryLines.push("# Logo Safe Area Enforcement — M12.19");
  logoSummaryLines.push("");
  logoSummaryLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  logoSummaryLines.push(`**Overall Verdict**: ${m12_19_logo.verdict}`);
  logoSummaryLines.push(`**Total Logos Checked**: ${m12_19_logo.totalLogosChecked}`);
  logoSummaryLines.push(
    `**Checks**: ${m12_19_logo.passCount} pass, ${m12_19_logo.failCount} fail, ${m12_19_logo.warnCount} warn`,
  );
  logoSummaryLines.push("");

  if (m12_19_logo.margins) {
    logoSummaryLines.push("## Safe Area Configuration");
    logoSummaryLines.push("");
    logoSummaryLines.push("| Margin | Value |");
    logoSummaryLines.push("|--------|-------|");
    logoSummaryLines.push(`| Top    | ${m12_19_logo.margins.top}px |`);
    logoSummaryLines.push(`| Bottom | ${m12_19_logo.margins.bottom}px |`);
    logoSummaryLines.push(`| Left   | ${m12_19_logo.margins.left}px |`);
    logoSummaryLines.push(`| Right  | ${m12_19_logo.margins.right}px |`);
    logoSummaryLines.push("");
  }

  if (m12_19_logo.results.length > 0) {
    logoSummaryLines.push("## Per-Slide Results");
    logoSummaryLines.push("");
    logoSummaryLines.push("| Slide | Status | Message |");
    logoSummaryLines.push("|-------|--------|---------|");
    for (const r of m12_19_logo.results) {
      logoSummaryLines.push(`| ${r.slide} | ${r.status.toUpperCase()} | ${r.message} |`);
    }
    logoSummaryLines.push("");
  }

  if (m12_19_logo.issues.length > 0) {
    logoSummaryLines.push("## Issues");
    logoSummaryLines.push("");
    for (const issue of m12_19_logo.issues) {
      const icon = issue.severity === "fail" ? "FAIL" : issue.severity === "warn" ? "WARN" : "INFO";
      logoSummaryLines.push(`- [${icon}] Slide ${issue.slide}: ${issue.suggestion}`);
    }
    logoSummaryLines.push("");
  }

  logoSummaryLines.push("---");
  logoSummaryLines.push("");
  logoSummaryLines.push(`**Verdict**: ${m12_19_logo.verdict}`);

  fs.writeFileSync(logoSummaryPath, logoSummaryLines.join("\n"));
  log("OK", `Logo safe-area summary: ${logoSummaryPath}`);

  // COMMERCIAL-VERDICT.md
  const verdictLines = [];
  verdictLines.push("# Commercial Delivery Verdict");
  verdictLines.push("");
  verdictLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  verdictLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  verdictLines.push(`**Quality Score**: ${m12_16_gate.summary.qualityScore}/100`);
  verdictLines.push("");

  verdictLines.push("## Gate Summary");
  verdictLines.push("");
  for (const [gate, v] of Object.entries(commercialReport.gateResults)) {
    const icon = v === "PASS" ? "[PASS]" : v === "FAIL" ? "[FAIL]" : "[REVIEW]";
    verdictLines.push(`- ${icon} ${gate}: ${v}`);
  }
  verdictLines.push("");

  verdictLines.push("## Quality Metrics");
  verdictLines.push("");
  verdictLines.push(
    `- Total checks: ${commercialReport.totalChecks.pass + commercialReport.totalChecks.fail + commercialReport.totalChecks.warn}`,
  );
  verdictLines.push(`- Passed: ${commercialReport.totalChecks.pass}`);
  verdictLines.push(`- Failed: ${commercialReport.totalChecks.fail}`);
  verdictLines.push(`- Warnings: ${commercialReport.totalChecks.warn}`);
  verdictLines.push("");

  if (commercialReport.remediations.length > 0) {
    verdictLines.push("## Top Remediations");
    verdictLines.push("");
    for (const r of commercialReport.remediations.slice(0, 10)) {
      verdictLines.push(`- [${r.priority.toUpperCase()}] ${r.category}: ${r.suggestion}`);
    }
    verdictLines.push("");
  }

  if (environment.hasLibreOffice || environment.hasImagemagick || environment.hasPoppler) {
    verdictLines.push("## Environment Note");
    verdictLines.push("");
    verdictLines.push(
      "This verdict was computed with full rendering toolchain available. For degraded environments (missing LibreOffice/ImageMagick/Poppler), the verdict would be NEEDS_REVIEW at minimum.",
    );
    verdictLines.push("");
  } else {
    verdictLines.push("## Environment Note");
    verdictLines.push("");
    verdictLines.push(
      "> ⚠ No rendering tools detected. All pixel-level and rendered checks were skipped. Verdict is based on metadata analysis only.",
    );
    verdictLines.push("");
  }

  fs.writeFileSync(verdictPath, verdictLines.join("\n"));
  log("OK", `Commercial verdict: ${verdictPath}`);

  if (!jsonMode) console.log("");

  // JSON-only mode: output machine report to stdout (suppress all other output)
  if (options.json) {
    console.log(JSON.stringify(commercialReport, null, 2));
  } else {
    // Non-json mode: print final summary to stdout
    console.log("");
    console.log("=".repeat(65));
    console.log(`FINAL VERDICT: ${commercialReport.overallVerdict}`);
    console.log("=".repeat(65));
    console.log("\nDelivered artifacts:");
    const expectedArtifacts = [
      { name: "output.pptx", desc: "Generated PowerPoint deck" },
      { name: "quality-manifest.json", desc: "Deterministic quality scoring" },
      { name: "QA-SUMMARY.md", desc: "Content + structural QA summary" },
      { name: "VISUAL-DESIGN-SUMMARY.md", desc: "Visual design analysis" },
      { name: "rendered-qa-report.json", desc: "Rendered page analysis" },
      { name: "PIXEL-ACCESSIBILITY-SUMMARY.md", desc: "Pixel contrast + color-blindness" },
      { name: "LOGO-SAFE-AREA-SUMMARY.md", desc: "Logo safe-area enforcement (M12.19)" },
      { name: "COMMERCIAL-VERDICT.md", desc: "Final commercial-readiness verdict" },
      { name: "machine-report.json", desc: "Machine-readable JSON report" },
    ];

    for (const artifact of expectedArtifacts) {
      const fullPath = path.join(outDir, artifact.name);
      const exists = fs.existsSync(fullPath);
      const size = exists ? fs.statSync(fullPath).size : 0;
      const icon = exists ? "OK" : "MISSING";
      log(
        icon,
        `${artifact.name} (${artifact.desc})${exists ? ` (${size.toLocaleString()} bytes)` : ""}`,
      );
    }

    // Cleanup temp files
    try {
      for (const f of fs.readdirSync(auditDir)) {
        if (f.startsWith(".m12_17_tmp_")) {
          fs.unlinkSync(path.join(auditDir, f));
        }
      }
    } catch {}
  }

  // Exit code
  if (commercialReport.overallVerdict === "FAIL") {
    process.exit(1);
  }
  // NEEDS_REVIEW exits 0 (informational)
  process.exit(0);
}

main().catch((err) => {
  console.error("Delivery pipeline error:", err.message);
  process.exit(2);
});
