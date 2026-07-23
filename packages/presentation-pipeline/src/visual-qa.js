/**
 * @awe/presentation-pipeline — Visual QA Engine (M12.30)
 *
 * Converts PPTX → PDF → JPEG and runs AI vision analysis on each page.
 * Returns structured per-slide visual quality results:
 *   - text-overlap: overlapping text elements detected
 *   - layout-shift: content shifted from expected position
 *   - template-mismatch: decorative elements not injected correctly
 *   - color-accuracy: colors match brand palette
 *   - readability: text contrast sufficient for projection
 *
 * Requires: soffice (LibreOffice), pdftoppm, and an external AI API key.
 * When no AI API is configured, falls back to heuristic visual checks only.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ────────────────────────────────────────────────────────

const SOFFICE_PATH = process.env.LIBREOFFICE_PATH || "/Applications/LibreOffice.app/Contents/MacOS/soffice";
const PDFTOPPM_PATH = "pdftoppm";
const DEFAULT_PDF_DPI = 150;

// ─── Step 1: PPTX → PDF ──────────────────────────────────────────────────

function pptxToPdf(pptxPath, pdfPath) {
  const cmd = `${SOFFICE_PATH} --headless --convert-to pdf --outdir "${path.dirname(pdfPath)}" "${pptxPath}"`;
  execSync(cmd, { stdio: "pipe", timeout: 120000 });

  // soffice names output as <basename>.pdf in the output dir
  const basename = path.basename(pptxPath, ".pptx");
  const actualPdf = path.join(path.dirname(pdfPath), `${basename}.pdf`);
  if (fs.existsSync(actualPdf)) {
    return actualPdf;
  }
  throw new Error(`soffice conversion failed: ${actualPdf} not found. Output:\n${execSync(cmd, { stdio: "pipe" }).toString()}`);
}

// ─── Step 2: PDF → JPEGs ─────────────────────────────────────────────────

function pdfToJpegs(pdfPath, outputDir, prefix = "page") {
  fs.mkdirSync(outputDir, { recursive: true });
  const cmd = `${PDFTOPPM_PATH} -png -r ${DEFAULT_PDF_DPI} "${pdfPath}" "${path.join(outputDir, prefix)}"`;
  execSync(cmd, { stdio: "pipe", timeout: 120000 });

  // pdftoppm outputs files like page-01.png, page-02.png ...
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".png")).sort();
  return files.map(f => path.join(outputDir, f));
}

// ─── Step 3: Heuristic Visual Checks ──────────────────────────────────────

/**
 * Analyze a JPEG image using canvas-based heuristics (no AI required).
 * Returns per-page visual quality results.
 */
function heuristicVisualAnalysis(imagePaths) {
  const results = [];

  // We need sharpness/color/overlap detection without AI.
  // Use a simple approach: read image dimensions + basic stats via a node module.
  // Since we can't rely on external libs, we use a shell-based approach.

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const pageNum = i + 1;

    try {
      // Get image info via file command or identify (ImageMagick)
      let info = {};
      try {
        const identify = execSync(`identify -format "%w %h" "${imgPath}"`, { stdio: "pipe", encoding: "utf8" }).trim();
        const [w, h] = identify.split(" ").map(Number);
        info = { width: w, height: h };

        // Check aspect ratio (should be ~16:9 for presentations)
        const ratio = w / h;
        info.aspectRatioOk = Math.abs(ratio - 16 / 9) < 0.1;

        // Check minimum resolution
        info.minResolution = w >= 800 && h >= 450;
      } catch (e) {
        // Fallback: just record the path
        info = { error: "identify not available" };
      }

      results.push({
        slide: pageNum,
        image: imgPath,
        ...info,
        checks: {
          aspectRatio: info.aspectRatioOk ? "pass" : "fail",
          resolution: info.minResolution ? "pass" : "warn",
        },
      });
    } catch (e) {
      results.push({
        slide: pageNum,
        image: imgPath,
        error: e.message,
        checks: { aspectRatio: "error", resolution: "error" },
      });
    }
  }

  return results;
}

// ─── Step 4: AI Vision Analysis (optional) ────────────────────────────────

/**
 * Run AI vision analysis on images.
 * Requires VISION_API_KEY env var and supports OpenAI-compatible APIs.
 */
async function aiVisionAnalysis(imagePaths, apiConfig = {}) {
  const apiKey = apiConfig.apiKey || process.env.VISION_API_KEY;
  const baseUrl = apiConfig.baseUrl || "https://api.openai.com/v1";
  const model = apiConfig.model || "gpt-4o";

  if (!apiKey) {
    return { skipped: true, reason: "No VISION_API_KEY configured — skipping AI analysis" };
  }

  const results = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const base64 = fs.readFileSync(imgPath).toString("base64");

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this presentation slide image for visual quality issues. Respond in JSON format with these fields:
{
  "slide_number": <number>,
  "issues": ["list of visual issues found"],
  "text_overlap": true/false,
  "layout_correct": true/false,
  "template_decorations_present": true/false,
  "color_accuracy": "good"|"fair"|"poor",
  "readability": "excellent"|"good"|"fair"|"poor",
  "notes": "<brief explanation>"
}`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${base64}` },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const analysis = JSON.parse(content);
      analysis.slide = i + 1;
      results.push(analysis);
    } catch (e) {
      results.push({
        slide: i + 1,
        error: e.message,
        issues: [`AI analysis failed: ${e.message}`],
      });
    }
  }

  return { results };
}

// ─── Step 5: Aggregate Report ─────────────────────────────────────────────

function buildVisualQaReport(heuristicResults, aiResults) {
  const report = {
    generatedAt: new Date().toISOString(),
    heuristicChecks: heuristicResults,
    aiAnalysis: aiResults.skipped ? null : aiResults,
    summary: {
      totalSlides: heuristicResults.length,
      aspectRatioPass: heuristicResults.filter(r => r.checks?.aspectRatio === "pass").length,
      resolutionPass: heuristicResults.filter(r => r.checks?.resolution !== "fail").length,
      aiSkipped: !!aiResults?.skipped,
    },
  };

  return report;
}

function writeVisualQaReport(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "VISUAL-QA-REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Also write a human-readable summary
  const lines = [
    "# Visual Quality Assurance Report",
    "",
    `**Generated**: ${report.generatedAt}`,
    `**Total Slides**: ${report.summary.totalSlides}`,
    "",
    "---",
    "",
    "## Summary",
    "",
    `- **Aspect Ratio Check**: ${report.summary.aspectRatioPass}/${report.summary.totalSlides} passed`,
    `- **Resolution Check**: ${report.summary.resolutionPass}/${report.summary.totalSlides} passed`,
    `- **AI Analysis**: ${report.summary.aiSkipped ? "Skipped (no API key)" : "Completed"}`,
    "",
    "---",
    "",
    "## Per-Slide Results",
    "",
    "| Slide | Aspect Ratio | Resolution | Image Path |",
    "|-------|-------------|------------|------------|",
  ];

  for (const r of report.heuristicChecks) {
    lines.push(`| ${r.slide} | ${r.checks?.aspectRatio || "error"} | ${r.checks?.resolution || "error"} | \`${r.image}\` |`);
  }

  if (report.aiAnalysis?.results) {
    lines.push("", "---", "", "## AI Analysis Details", "");
    for (const a of report.aiAnalysis.results) {
      lines.push(`### Slide ${a.slide}`);
      lines.push(`- **Issues**: ${a.issues?.join(", ") || "None"}`);
      lines.push(`- **Readability**: ${a.readability || "N/A"}`);
      lines.push(`- **Notes**: ${a.notes || ""}`);
      lines.push("");
    }
  }

  lines.push("*Generated by M12.30 Visual QA Engine*");
  const summaryPath = path.join(outputDir, "VISUAL-DESIGN-SUMMARY.md");
  fs.writeFileSync(summaryPath, lines.join("\n"));

  return { reportPath, summaryPath };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Run full visual QA pipeline: PPTX → PDF → JPEG → analysis → report.
 *
 * @param {Buffer|string} pptxInput - PPTX buffer or file path
 * @param {object} options
 * @param {string} [options.outputDir] - Output directory for images and reports
 * @param {boolean} [options.skipAi=false] - Skip AI analysis even if API key is set
 * @param {object} [options.aiConfig] - Override AI API config
 * @returns {Promise<object>} visual QA report
 */
async function runVisualQa(pptxInput, options = {}) {
  const opts = { skipAi: false, ...options };
  const outputDir = opts.outputDir || path.join(process.cwd(), ".visual-qa-output");

  let pptxPath;
  if (Buffer.isBuffer(pptxInput)) {
    pptxPath = path.join(outputDir, "input.pptx");
    fs.writeFileSync(pptxPath, pptxInput);
  } else {
    pptxPath = pptxInput;
  }

  if (!fs.existsSync(pptxPath)) {
    throw new Error(`PPTX file not found: ${pptxPath}`);
  }

  const pdfPath = path.join(outputDir, "output.pdf");
  const imageDir = path.join(outputDir, "slides");

  console.log("[Visual QA] Converting PPTX → PDF...");
  const actualPdf = pptxToPdf(pptxPath, pdfPath);

  console.log("[Visual QA] Converting PDF → JPEG...");
  const imagePaths = pdfToJpegs(actualPdf, imageDir);

  console.log(`[Visual QA] Running heuristic analysis on ${imagePaths.length} pages...`);
  const heuristicResults = heuristicVisualAnalysis(imagePaths);

  let aiResults = null;
  if (!opts.skipAi) {
    console.log("[Visual QA] Running AI vision analysis...");
    aiResults = await aiVisionAnalysis(imagePaths, opts.aiConfig);
  }

  const report = buildVisualQaReport(heuristicResults, aiResults);
  const { reportPath, summaryPath } = writeVisualQaReport(report, outputDir);

  console.log(`[Visual QA] Report written to ${reportPath}`);
  return report;
}

module.exports = {
  runVisualQa,
  pptxToPdf,
  pdfToJpegs,
  heuristicVisualAnalysis,
  aiVisionAnalysis,
  buildVisualQaReport,
  writeVisualQaReport,
  SOFFICE_PATH,
  PDFTOPPM_PATH,
};
