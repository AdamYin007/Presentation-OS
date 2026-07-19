#!/usr/bin/env node
/**
 * M12.17 — Pixel-Level Accessibility and Rendered Visual Robustness Gate
 *
 * Extends M12.15 (rendered visual QA) and M12.16 (visual design standards) with:
 *   1. Pixel/sample-based contrast estimation on rendered PNG/PDF outputs
 *      when LibreOffice/ImageMagick/poppler are available, with graceful
 *      NEEDS_REVIEW degradation when unavailable.
 *   2. Color-blindness simulation heuristics for protanopia/deuteranopia/
 *      tritanopia using deterministic matrix transforms, producing warnings/
 *      failures for low distinguishability.
 *   3. Font fallback/readability checks using PPTX/theme/spec metadata and
 *      rendered text extraction if available.
 *   4. Merge M12.15/M12.16 results into a single commercial-readiness report
 *      with concrete remediation suggestions.
 *
 * Verdict levels:
 *   PASS     — meets all accessibility and rendered robustness criteria
 *   NEEDS_REVIEW — soft issues detected (degraded env, minor contrast/color issues)
 *   FAIL     — hard violations (poor color-blind distinguishability, unreadable text)
 *
 * Usage:
 *   node scripts/check-m12-17-pixel-accessibility-rendered-robustness.cjs [input.md] [output-dir]
 *
 * Defaults:
 *   input.md  = fixtures/document-ingest/sample-markdown.md
 *   output-dir = examples/business-review/m12-17-audit
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const renderedVisualQa = require("../packages/presentation-pipeline/src/rendered-visual-qa.js");
const {
  resolveRenderer,
  renderToPdf,
  getPdfPageCount,
  renderPdfToPng,
  validateLayoutGeometry,
  validateRenderedPages,
} = renderedVisualQa;
const computeM12_15Verdict = renderedVisualQa.computeVerdict;
const {
  runVisualDesignGate,
  generateHumanSummary: generateM12_16Summary,
  generateMachineReport: generateM12_16Report,
} = require("../packages/visual-design-gate/src/index.js");

// ─── Configuration ──────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review", "m12-17-audit");
const AUDIT_DIR = OUTPUT_DIR;
const PPTX_PATH = path.join(AUDIT_DIR, "output.pptx");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "quality-manifest.json");
const REPORT_PATH = path.join(OUTPUT_DIR, "pixel-accessibility-report.json");
const SUMMARY_PATH = path.join(OUTPUT_DIR, "PIXEL-ACCESSIBILITY-SUMMARY.md");
const COMMERCIAL_VERDICT_PATH = path.join(OUTPUT_DIR, "COMMERCIAL-VERDICT.md");

// M12.15 prior verdict path
const M12_15_VERDICT_PATH = path.join(ROOT, "examples", "business-review", "COMMERCIAL-VERDICT.md");

// ─── Helpers ────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];
const warnings = [];
const allRemediations = [];

function record(condition, message, severity = "fail", data = {}) {
  if (condition) {
    passCount++;
    checks.push({ status: "pass", message, ...data });
    console.log(`  OK  ${message}`);
  } else if (severity === "warn") {
    warnCount++;
    warnings.push(message);
    checks.push({ status: "warn", message, ...data });
    console.log(`  WARN${message ? `: ${message}` : ""}`);
  } else {
    failCount++;
    checks.push({ status: "fail", message, ...data });
    console.log(`  FAIL${message ? `: ${message}` : ""}`);
  }
}

function remediation(category, severity, suggestion) {
  allRemediations.push({ category, severity, suggestion });
}

// ─── Environment Detection ──────────────────────────────────────────

function commandExists(cmd) {
  try {
    cp.execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function detectEnvironment() {
  const hasLibreOffice = resolveRenderer().available;
  const hasImagemagick = commandExists("identify") && commandExists("convert");
  const hasPoppler = commandExists("pdfinfo") && commandExists("pdftotext") && commandExists("pdfimages");
  const hasPython = commandExists("python3");

  return { hasLibreOffice, hasImagemagick, hasPoppler, hasPython };
}

// ─── 1. Pixel-Based Contrast Estimation on Rendered PNGs ────────────

/**
 * Sample pixels from a rendered PNG and estimate contrast ratios between
 * dominant foreground and background regions. Uses ImageMagick identify
 * to extract per-pixel RGB data, then groups pixels by luminance to
 * estimate text vs background contrast.
 *
 * Returns { estimatedContrast, sampleSize, confidence } or null if
 * ImageMagick is unavailable.
 */
function estimatePixelContrast(pngPath) {
  if (!commandExists("magick")) return null;

  try {
    // Downsample using nearest-neighbor to preserve bimodal luminance distribution
    // (bilinear blurs dark text into gray, destroying contrast signal)
    const tmpPath = path.join(path.dirname(pngPath), ".m12_17_tmp_" + path.basename(pngPath));
    cp.execFileSync("magick", [pngPath, "-filter", "point", "-resize", "100x56!", "-type", "TrueColorAlpha", tmpPath], { timeout: 30000 });

    const dims = cp.execFileSync("identify", ["-format", "%w %h", tmpPath], { encoding: "utf8" }).trim().split(/\s+/);
    const w = parseInt(dims[0], 10);
    const h = parseInt(dims[1], 10);
    if (!w || !h) { fs.unlinkSync(tmpPath); return null; }

    // Extract all pixels using txt: format — each line is "x,y: (R,G,B)"
    const txtOutput = cp.execFileSync("magick", [tmpPath, "txt:/dev/stdout"], { encoding: "utf8" });
    const lines = txtOutput.trim().split("\n").filter(l => l.match(/^\d+,\d+:/));
    if (!lines.length) { fs.unlinkSync(tmpPath); return null; }

    const samples = [];
    let maxValue = 0;
    for (const line of lines) {
      // Parse "(255,255,255)" or "(1.0,1.0,1.0)" from txt: output
      const rgbMatch = line.match(/\(([^)]+)\)/);
      if (rgbMatch) {
        const parts = rgbMatch[1].split(",");
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        if (!isNaN(r)) maxValue = Math.max(maxValue, r, g, b);
      }
    }

    // Determine scale: txt: format uses 0-255 for hex sRGB, 0-1 for float, 0-65535 for Q16 linear
    let scale = 1;
    if (maxValue > 1000) scale = 1 / 65535;
    else if (maxValue > 1) scale = 1 / 255;

    // Re-parse with correct scale
    for (const line of lines) {
      const rgbMatch = line.match(/\(([^)]+)\)/);
      if (rgbMatch) {
        const parts = rgbMatch[1].split(",");
        const r = parseFloat(parts[0]) * scale;
        const g = parseFloat(parts[1]) * scale;
        const b = parseFloat(parts[2]) * scale;
        samples.push([r, g, b]);
      }
    }

    if (!samples.length) return null;

    // Compute luminance for each pixel
    const luminances = samples.map(([r, g, b]) => {
      const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    });

    // Cluster into two groups: dark (text) and light (background)
    // Use simple bimodal threshold at median
    const sorted = [...luminances].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    let darkLums = [];
    let lightLums = [];
    for (const lum of luminances) {
      if (lum < median) darkLums.push(lum);
      else lightLums.push(lum);
    }

    if (!darkLums.length || !lightLums.length) return { estimatedContrast: 1.0, sampleSize: samples.length, confidence: "low" };

    // Use mean of each cluster
    const darkMean = darkLums.reduce((a, b) => a + b, 0) / darkLums.length;
    const lightMean = lightLums.reduce((a, b) => a + b, 0) / lightLums.length;

    const lighter = Math.max(darkMean, lightMean);
    const darker = Math.min(darkMean, lightMean);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    // Confidence based on cluster sizes — well-balanced split = high confidence
    const ratioSmall = Math.min(darkLums.length, lightLums.length) / samples.length;
    let confidence = "low";
    if (ratioSmall > 0.15) confidence = "medium";
    if (ratioSmall > 0.25) confidence = "high";

    return { estimatedContrast: parseFloat(ratio.toFixed(2)), sampleSize: samples.length, confidence };
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
    return null;
  }
}

/**
 * Analyze all rendered PNG pages for pixel-level contrast.
 * Falls back to manifest-based color analysis when ImageMagick is unavailable.
 */
function checkPixelContrast(pngFiles, slideSpecs, layoutPlan) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const findings = [];

  if (!pngFiles || !pngFiles.length) {
    // No rendered PNGs — degrade gracefully
    return {
      verdict: "NEEDS_REVIEW",
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      results: [{ status: "warn", message: "No rendered PNG files available — pixel contrast analysis skipped" }],
      findings: [],
      degraded: true,
      reason: "no_png_files",
    };
  }

  // Resolve the directory containing PNG files
  const pngDir = path.dirname(path.resolve(pngFiles[0].file));
  const hasImagemagick = commandExists("identify");

  for (let i = 0; i < pngFiles.length && i < slideSpecs.length; i++) {
    const pngPath = pngFiles[i].file;
    // Handle both absolute paths and relative filenames
    const fullPath = path.isAbsolute(pngPath) ? pngPath : path.join(pngDir, pngPath);
    const spec = slideSpecs[i];
    const role = spec.role || "content";

    if (!hasImagemagick) {
      // Cannot do pixel analysis — use layoutPlan colors as proxy
      const layout = layoutPlan?.layouts?.find((l) => l.index === i);
      if (layout && layout.colors) {
        const fgHex = layout.colors.text || layout.colors.secondaryText || "#000000";
        const bgHex = layout.colors.background || "#FFFFFF";
        const ratio = computeColorContrast(fgHex, bgHex);
        const aaThreshold = role === "title" || role === "section-divider" ? 3.0 : 4.5;
        if (ratio < aaThreshold) {
          failCount++;
          findings.push({ page: i + 1, role, method: "color_proxy", ratio, threshold: `AA (${aaThreshold}:1)`, severity: "fail" });
        } else {
          passCount++;
          findings.push({ page: i + 1, role, method: "color_proxy", ratio, threshold: `AA (${aaThreshold}:1)`, severity: "pass" });
        }
      } else {
        warnCount++;
        findings.push({ page: i + 1, role, method: "none", ratio: null, severity: "warn", note: "No color data available" });
      }
      continue;
    }

    const pixelResult = estimatePixelContrast(fullPath);
    if (!pixelResult) {
      warnCount++;
      findings.push({ page: i + 1, role, method: "failed", ratio: null, severity: "warn", note: "ImageMagick identify failed on page" });
      continue;
    }

    const aaThreshold = role === "title" || role === "section-divider" ? 3.0 : 4.5;
    if (pixelResult.estimatedContrast < aaThreshold) {
      failCount++;
      findings.push({ page: i + 1, role, method: "pixel_sample", ratio: pixelResult.estimatedContrast, threshold: `AA (${aaThreshold}:1)`, severity: "fail", confidence: pixelResult.confidence });
    } else if (pixelResult.estimatedContrast < 7.0) {
      warnCount++;
      findings.push({ page: i + 1, role, method: "pixel_sample", ratio: pixelResult.estimatedContrast, threshold: "AAA (7:1)", severity: "warn", confidence: pixelResult.confidence });
    } else {
      passCount++;
      findings.push({ page: i + 1, role, method: "pixel_sample", ratio: pixelResult.estimatedContrast, threshold: "AAA (7:1)", severity: "pass", confidence: pixelResult.confidence });
    }
  }

  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return { verdict, passCount, failCount, warnCount, results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `Page ${f.page} ${f.role} contrast ${f.ratio}:1` })), findings, degraded: !hasImagemagick };
}

/**
 * Compute contrast ratio between two hex colors (same as M12.16 but standalone).
 */
function computeColorContrast(hex1, hex2) {
  function parseHex(h) {
    if (!h) return null;
    const c = h.replace("#", "");
    if (c.length !== 6) return null;
    return [parseInt(c.substring(0, 2), 16) / 255, parseInt(c.substring(2, 4), 16) / 255, parseInt(c.substring(4, 6), 16) / 255];
  }
  function srgbToLinear(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function luminance(rgb) { return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]); }
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

// ─── 2. Color-Blindness Simulation ──────────────────────────────────

/**
 * Deterministic matrix transform for color-blindness simulation.
 * Based on Brettel et al. / Vienot et al. approximations.
 * Each type returns a simulated RGB triplet.
 */

// Protanopia (red-blind): reduced sensitivity to long wavelengths
const PROTANOPIA_MATRIX = [
  [0.56667, 0.43333, 0.00000],
  [0.55833, 0.44167, 0.00000],
  [0.00000, 0.24167, 0.75833],
];

// Deuteranopia (green-blind): reduced sensitivity to medium wavelengths
const DEUTERANOPIA_MATRIX = [
  [0.62500, 0.37500, 0.00000],
  [0.70000, 0.30000, 0.00000],
  [0.00000, 0.30000, 0.70000],
];

// Tritanopia (blue-blind): reduced sensitivity to short wavelengths
const TRITANOPIA_MATRIX = [
  [0.95000, 0.05000, 0.00000],
  [0.00000, 0.43333, 0.56667],
  [0.00000, 0.47500, 0.52500],
];

/**
 * Apply a 3x3 color-blindness matrix to an RGB triplet [0-255].
 */
function applyColorBlindMatrix(rgb, matrix) {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const sr = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const sg = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const sb = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;
  return [
    Math.max(0, Math.min(255, Math.round(sr * 255))),
    Math.max(0, Math.min(255, Math.round(sg * 255))),
    Math.max(0, Math.min(255, Math.round(sb * 255))),
  ];
}

/**
 * Compute CIEDE2000-like distance approximation between two sRGB colors.
 * Simple Euclidean in Lab-like space for distinguishability check.
 */
function colorDistance(rgb1, rgb2) {
  // Simple weighted Euclidean distance in RGB space
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Check if two colors remain distinguishable after color-blindness simulation.
 * Returns { simType, originalDist, simDist, distinguishable }.
 */
function checkColorDistinguishability(originalFg, originalBg, simType) {
  const matrices = { protanopia: PROTANOPIA_MATRIX, deuteranopia: DEUTERANOPIA_MATRIX, tritanopia: TRITANOPIA_MATRIX };
  const matrix = matrices[simType];
  if (!matrix) return null;

  const origFgRgb = parseHexRgb(originalFg);
  const origBgRgb = parseHexRgb(originalBg);
  if (!origFgRgb || !origBgRgb) return null;

  const origDist = colorDistance(origFgRgb, origBgRgb);
  const simFg = applyColorBlindMatrix(origFgRgb, matrix);
  const simBg = applyColorBlindMatrix(origBgRgb, matrix);
  const simDist = colorDistance(simFg, simBg);

  // Threshold: if simulated distance < 30, colors are likely indistinguishable
  return {
    simType,
    originalDist: parseFloat(origDist.toFixed(1)),
    simDist: parseFloat(simDist.toFixed(1)),
    distinguishable: simDist >= 30,
    simFg: simFg.map(v => v.toString(16).padStart(2, "0")).join(""),
    simBg: simBg.map(v => v.toString(16).padStart(2, "0")).join(""),
  };
}

function parseHexRgb(hex) {
  if (!hex) return null;
  const c = hex.replace("#", "");
  if (c.length !== 6) return null;
  try {
    return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
  } catch {
    return null;
  }
}

/**
 * Run color-blindness simulation across all slide layouts.
 */
function checkColorBlindness(layoutPlan) {
  const simTypes = ["protanopia", "deuteranopia", "tritanopia"];
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const findings = [];

  if (!layoutPlan || !layoutPlan.layouts || !layoutPlan.layouts.length) {
    return {
      verdict: "NEEDS_REVIEW",
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      results: [{ status: "warn", message: "No layout data available — color-blindness simulation skipped" }],
      findings: [],
      degraded: true,
    };
  }

  for (const layout of layoutPlan.layouts) {
    const colors = layout.colors;
    if (!colors) continue;

    // Check critical color pairs that users rely on for differentiation
    const pairsToCheck = [];
    if (colors.text && colors.accent) pairsToCheck.push({ fg: colors.text, bg: colors.accent, label: "text on accent" });
    if (colors.text && colors.background) pairsToCheck.push({ fg: colors.text, bg: colors.background, label: "text on background" });
    if (colors.secondaryText && colors.background) pairsToCheck.push({ fg: colors.secondaryText, bg: colors.background, label: "secondaryText on background" });
    if (colors.primary && colors.background) pairsToCheck.push({ fg: colors.primary, bg: colors.background, label: "primary on background" });
    if (colors.text && colors.surface) pairsToCheck.push({ fg: colors.text, bg: colors.surface, label: "text on surface" });

    for (const pair of pairsToCheck) {
      for (const simType of simTypes) {
        const result = checkColorDistinguishability(pair.fg, pair.bg, simType);
        if (!result) continue;

        if (result.distinguishable) {
          passCount++;
          findings.push({ page: layout.index, pair: pair.label, simType, origDist: result.originalDist, simDist: result.simDist, severity: "pass" });
        } else {
          // Low distinguishability — check if it's a hard fail or warning
          if (simType === "deuteranopia" || simType === "protanopia") {
            // Most common types — treat as FAIL for critical pairs
            failCount++;
            findings.push({ page: layout.index, pair: pair.label, simType, origDist: result.originalDist, simDist: result.simDist, severity: "fail", suggestion: `Colors may be indistinguishable in ${simType}. Consider using patterns, labels, or higher-contrast palette.` });
          } else {
            warnCount++;
            findings.push({ page: layout.index, pair: pair.label, simType, origDist: result.originalDist, simDist: result.simDist, severity: "warn", suggestion: `Colors may have low distinguishability in ${simType}.` });
          }
        }
      }
    }
  }

  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return { verdict, passCount, failCount, warnCount, results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `Slide ${f.page} ${f.pair} ${f.simType} dist=${f.simDist}` })), findings, degraded: false };
}

// ─── 3. Font Fallback / Readability Checks ──────────────────────────

/**
 * Check font fallback and readability using PPTX/theme/spec metadata.
 * When pdftotext is available, also verify rendered text extraction quality.
 */
function checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const findings = [];

  if (!slideSpecs || !slideSpecs.length) {
    return {
      verdict: "NEEDS_REVIEW",
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      results: [{ status: "warn", message: "No slide specs available — font checks skipped" }],
      findings: [],
      degraded: true,
    };
  }

  // Check font family consistency from layoutPlan
  const fontFamilies = new Set();
  const fontSizeMap = {}; // track size distribution per font

  if (layoutPlan && layoutPlan.layouts) {
    for (const layout of layoutPlan.layouts) {
      if (layout.fontFamily) {
        fontFamilies.add(layout.fontFamily);
        if (!fontSizeMap[layout.fontFamily]) fontSizeMap[layout.fontFamily] = [];
        fontSizeMap[layout.fontFamily].push(layout.fontSize || 0);
      }
    }
  }

  // Known safe fallback families that should not trigger warnings
  const safeFallbacks = ["sans-serif", "serif", "monospace", "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Calibri", "Segoe UI", "Roboto", "system-ui", "-apple-system"];

  for (const fontFamily of fontFamilies) {
    if (!safeFallbacks.includes(fontFamily.toLowerCase())) {
      // Custom font — might not be available on all systems
      warnCount++;
      findings.push({ category: "font_fallback", font: fontFamily, severity: "warn", suggestion: `Custom font "${fontFamily}" may not render correctly on all systems. Add fallback stack: "${fontFamily}, sans-serif"` });
    } else {
      passCount++;
      findings.push({ category: "font_fallback", font: fontFamily, severity: "pass" });
    }

    // Check size distribution
    const sizes = fontSizeMap[fontFamily] || [];
    if (sizes.length > 1) {
      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);
      if (minSize > 0 && maxSize / minSize > 4) {
        warnCount++;
        findings.push({ category: "font_size_variance", font: fontFamily, minSize, maxSize, severity: "warn", suggestion: `Large font size range (${minSize}-${maxSize}pt) for "${fontFamily}". Verify visual hierarchy is intentional.` });
      }
    }
  }

  // Check rendered text extraction quality if PDF tools available
  if (environment.hasPoppler && pdfTextPages && pdfTextPages.length) {
    for (let i = 0; i < pdfTextPages.length && i < slideSpecs.length; i++) {
      const page = pdfTextPages[i];
      const spec = slideSpecs[i];
      const role = spec.role || "content";

      // Title/section-divider/closing can have minimal text
      if (["title", "section-divider", "closing"].includes(role)) continue;

      // Non-title slides should have extractable text
      if (page.charCount === 0) {
        failCount++;
        findings.push({ category: "text_extraction", page: i + 1, role, charCount: 0, severity: "fail", suggestion: `Page ${i + 1} (${role}) has no extractable text. Font embedding may be broken or text rendered as shapes.` });
      } else if (page.charCount < 10) {
        warnCount++;
        findings.push({ category: "sparse_text", page: i + 1, role, charCount: page.charCount, severity: "warn", suggestion: `Page ${i + 1} (${role}) has very little extractable text (${page.charCount} chars). Verify content is not lost in rendering.` });
      } else {
        passCount++;
        findings.push({ category: "text_extraction", page: i + 1, role, charCount: page.charCount, severity: "pass" });
      }
    }
  } else if (environment.hasPoppler === false) {
    warnCount++;
    findings.push({ category: "degraded", severity: "warn", note: "PDF text extraction unavailable — font readability checks limited to metadata" });
  }

  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return { verdict, passCount, failCount, warnCount, results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `${f.category}: ${JSON.stringify(f)}` })), findings, degraded: !environment.hasPoppler };
}

// ─── 4. Commercial Readiness Report Merger ──────────────────────────

/**
 * Merge M12.15 rendered QA + M12.16 visual design gate + M12.17 pixel/accessibility
 * into a single commercial-readiness report with consolidated verdict and remediation.
 */
function mergeCommercialReadiness(m12_15_verdict, m12_16_gate, m12_17_pixel, m12_17_colorblind, m12_17_font, environment) {
  // Determine overall verdict: worst of all gates wins
  const verdictPriority = { "FAIL": 3, "NEEDS_REVIEW": 2, "PASS": 1 };
  const verdicts = [m12_15_verdict, m12_16_gate.overallVerdict, m12_17_pixel.verdict, m12_17_colorblind.verdict, m12_17_font.verdict];
  let overallVerdict = "PASS";
  let overallScore = 0;

  for (const v of verdicts) {
    const score = verdictPriority[v] || 0;
    if (score > overallScore) {
      overallScore = score;
      overallVerdict = v;
    }
  }

  // Collect all remediations
  const remediations = [];

  // From M12.16
  if (m12_16_gate.remediationSuggestions) {
    for (const r of m12_16_gate.remediationSuggestions) {
      remediations.push({ priority: r.severity === "fail" ? "high" : "medium", category: r.category || "visual_design", suggestion: r.suggestion });
    }
  }

  // From M12.17 color-blindness
  for (const f of m12_17_colorblind.findings || []) {
    if (f.suggestion) {
      remediations.push({ priority: f.severity === "fail" ? "high" : "medium", category: "color_blindness", suggestion: f.suggestion });
    }
  }

  // From M12.17 font
  for (const f of m12_17_font.findings || []) {
    if (f.suggestion) {
      remediations.push({ priority: f.severity === "fail" ? "high" : "low", category: "font_readability", suggestion: f.suggestion });
    }
  }

  // From M12.17 pixel contrast
  for (const f of m12_17_pixel.findings || []) {
    if (f.severity === "fail") {
      remediations.push({ priority: "high", category: "pixel_contrast", suggestion: `Page ${f.page}: estimated contrast ${f.ratio}:1 below AA threshold. Lighten background or darken foreground.` });
    }
  }

  // Deduplicate similar remediations
  const seen = new Set();
  const uniqueRemediations = remediations.filter((r) => {
    const key = `${r.category}:${r.suggestion.substring(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    overallVerdict,
    gateResults: {
      m12_15_rendered_qa: m12_15_verdict,
      m12_16_visual_design: m12_16_gate.overallVerdict,
      m12_17_pixel_contrast: m12_17_pixel.verdict,
      m12_17_color_blindness: m12_17_colorblind.verdict,
      m12_17_font_readability: m12_17_font.verdict,
    },
    environment,
    remediations: uniqueRemediations,
    totalChecks: {
      pass: m12_17_pixel.passCount + m12_17_colorblind.passCount + m12_17_font.passCount,
      fail: m12_17_pixel.failCount + m12_17_colorblind.failCount + m12_17_font.failCount,
      warn: m12_17_pixel.warnCount + m12_17_colorblind.warnCount + m12_17_font.warnCount,
    },
  };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("M12.17 — Pixel-Level Accessibility & Rendered Visual Robustness Gate");
  console.log("=".repeat(65));
  console.log("");

  // Ensure output directory
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  // Read input
  const inputText = fs.readFileSync(INPUT_MD, "utf8");
  console.log(`Input: ${INPUT_MD}`);
  console.log("");

  // Detect environment
  const environment = detectEnvironment();
  console.log("Environment:");
  console.log(`  LibreOffice: ${environment.hasLibreOffice ? "YES" : "NO"}`);
  console.log(`  ImageMagick: ${environment.hasImagemagick ? "YES" : "NO"}`);
  console.log(`  Poppler: ${environment.hasPoppler ? "YES" : "NO"}`);
  console.log(`  Python3: ${environment.hasPython ? "YES" : "NO"}`);
  console.log("");

  // ── Step 1: Run Pipeline with manifest emission ──────────────────
  console.log("[1/8] Running presentation pipeline...");
  const pipelineResult = await runPipeline(inputText, {
    style: "minimal-modern",
    emitManifest: true,
    outputDir: AUDIT_DIR,
    inputPath: INPUT_MD,
  });

  const slideSpecs = pipelineResult.slideSpecs;
  const layoutPlan = pipelineResult.layoutPlan;
  const manifest = pipelineResult.manifest;
  const pptxBuffer = pipelineResult.pptxBuffer;

  fs.writeFileSync(PPTX_PATH, pptxBuffer);
  const pptxSize = fs.statSync(PPTX_PATH).size;
  record(pptxSize > 0, `PPTX generated (${pptxSize.toLocaleString()} bytes)`);
  console.log("");

  // ── Step 2: M12.15 — Rendered Visual QA ──────────────────────────
  console.log("[2/8] M12.15 — Rendered Visual QA...");
  const renderer = resolveRenderer();
  let m12_15_verdict = "NEEDS_REVIEW";
  let pdfTextPages = [];
  let pngFiles = [];

  if (renderer.available) {
    const pdfResult = renderToPdf(PPTX_PATH, AUDIT_DIR, renderer);
    if (pdfResult.success) {
      const pageCount = getPdfPageCount(pdfResult.pdfPath);
      console.log(`  PDF: ${pageCount} page(s)`);

      // Text extraction
      if (commandExists("pdftotext")) {
        pdfTextPages = [];
        for (let i = 1; i <= pageCount; i++) {
          try {
            const text = cp.execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", pdfResult.pdfPath, "-"], { encoding: "utf8", timeout: 30000 });
            pdfTextPages.push({ page: i, charCount: text.replace(/\s+/g, "").length, rawLength: text.length });
          } catch {
            pdfTextPages.push({ page: i, charCount: 0, rawLength: 0 });
          }
        }
      }

      // PNG conversion for pixel analysis
      // pdfimages only extracts embedded images — LibreOffice renders vectors,
      // so we fall back to ImageMagick magick for PDF page rendering.
      pngFiles = renderPdfToPng(pdfResult.pdfPath, AUDIT_DIR, pageCount);
      if (!pngFiles.length && environment.hasImagemagick) {
        try {
          const baseName = path.basename(pdfResult.pdfPath, ".pdf");
          const outGlob = path.join(AUDIT_DIR, `${baseName}-page-%d.png`);
          cp.execFileSync("magick", [pdfResult.pdfPath, "-density", "200", "-quality", "95", outGlob], { timeout: 120000 });
          for (let i = 1; i <= pageCount; i++) {
            const expected = path.join(AUDIT_DIR, `${baseName}-page-${i}.png`);
            if (fs.existsSync(expected)) {
              pngFiles.push({ num: i, file: expected }); // Store absolute path
            }
          }
          console.log(`  PNGs (ImageMagick): ${pngFiles.length} page(s)`);
        } catch (e) {
          console.log(`  ImageMagick PDF→PNG failed: ${e.message}`);
        }
      } else {
        console.log(`  PNGs: ${pngFiles.length} page(s)`);
      }
    } else {
      console.log(`  PDF conversion failed: ${pdfResult.reason}`);
    }
  } else {
    console.log("  LibreOffice unavailable — package-level checks only");
  }

  // Geometry validation (always available)
  const geometry = validateLayoutGeometry(slideSpecs, layoutPlan);
  const renderedResults = validateRenderedPages(
    pngFiles.map(() => null), // ink ratio not computed here, just page count
    pdfTextPages,
    slideSpecs
  );

  m12_15_verdict = computeM12_15Verdict(manifest, { ...geometry, ...renderedResults }, renderer.available).verdict;
  record(true, `M12.15 commercial verdict: ${m12_15_verdict}`);
  console.log("");

  // ── Step 3: M12.16 — Visual Design Standards ─────────────────────
  console.log("[3/8] M12.16 — Visual Design Standards Gate...");
  const m12_16_gate = await runVisualDesignGate(slideSpecs, layoutPlan, { m12_15_verdict: m12_15_verdict });
  record(true, `M12.16 visual design verdict: ${m12_16_gate.overallVerdict}`);
  console.log("");

  // ── Step 4: M12.17 — Pixel-Based Contrast on Rendered PNGs ───────
  console.log("[4/8] M12.17 — Pixel-Based Contrast Estimation...");
  const pixelContrast = checkPixelContrast(pngFiles, slideSpecs, layoutPlan);
  record(pixelContrast.verdict !== "FAIL", `Pixel contrast: ${pixelContrast.verdict} (${pixelContrast.passCount} pass, ${pixelContrast.failCount} fail, ${pixelContrast.warnCount} warn)`);
  if (pixelContrast.degraded) {
    console.log("  ⚠ Degraded: ImageMagick unavailable, using color proxy");
    remediation("pixel_contrast", "warn", "ImageMagick not available — pixel contrast analysis degraded to color metadata proxy");
  }
  console.log("");

  // ── Step 5: M12.17 — Color-Blindness Simulation ──────────────────
  console.log("[5/8] M12.17 — Color-Blindness Simulation...");
  const colorblind = checkColorBlindness(layoutPlan);
  record(colorblind.verdict !== "FAIL", `Color-blindness: ${colorblind.verdict} (${colorblind.passCount} pass, ${colorblind.failCount} fail, ${colorblind.warnCount} warn)`);
  if (colorblind.degraded) {
    console.log("  ⚠ Degraded: No layout color data available");
    remediation("color_blindness", "warn", "No layout color data — color-blindness simulation skipped");
  }
  console.log("");

  // ── Step 6: M12.17 — Font Fallback / Readability ─────────────────
  console.log("[6/8] M12.17 — Font Fallback & Readability...");
  const font = checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment);
  record(font.verdict !== "FAIL", `Font readability: ${font.verdict} (${font.passCount} pass, ${font.failCount} fail, ${font.warnCount} warn)`);
  if (font.degraded) {
    console.log("  ⚠ Degraded: PDF text extraction unavailable");
    remediation("font_readability", "warn", "PDF text extraction unavailable — font checks limited to metadata");
  }
  console.log("");

  // ── Step 7: Merge Commercial Readiness Report ────────────────────
  console.log("[7/8] Merging commercial readiness report...");
  const commercialReport = mergeCommercialReadiness(
    m12_15_verdict,
    m12_16_gate,
    pixelContrast,
    colorblind,
    font,
    environment
  );

  // Override: if any M12.17 sub-check fails, cannot PASS overall
  if (commercialReport.overallVerdict === "PASS" && (pixelContrast.verdict === "FAIL" || colorblind.verdict === "FAIL" || font.verdict === "FAIL")) {
    commercialReport.overallVerdict = "FAIL";
  }

  console.log(`  Overall commercial readiness: ${commercialReport.overallVerdict}`);
  console.log(`  Total checks: ${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn`);
  console.log(`  Remediations: ${commercialReport.remediations.length}`);
  console.log("");

  // ── Step 8: Write Reports ────────────────────────────────────────
  console.log("[8/8] Writing reports...");

  // Machine-readable JSON report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(commercialReport, null, 2));
  console.log(`  Written: ${REPORT_PATH}`);

  // Human-readable markdown summary
  const summaryLines = [];
  summaryLines.push("# Pixel-Level Accessibility & Rendered Visual Robustness — M12.17");
  summaryLines.push("");
  summaryLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  summaryLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  summaryLines.push(`**Total Checks**: ${commercialReport.totalChecks.pass + commercialReport.totalChecks.fail + commercialReport.totalChecks.warn} (${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn)`);
  summaryLines.push("");

  summaryLines.push("## Environment");
  summaryLines.push("");
  summaryLines.push(`| Component | Available |`);
  summaryLines.push(`|-----------|-----------|`);
  summaryLines.push(`| LibreOffice | ${environment.hasLibreOffice ? "Yes" : "No"} |`);
  summaryLines.push(`| ImageMagick | ${environment.hasImagemagick ? "Yes" : "No"} |`);
  summaryLines.push(`| Poppler (pdfinfo/pdftotext/pdfimages) | ${environment.hasPoppler ? "Yes" : "No"} |`);
  summaryLines.push(`| Python3 | ${environment.hasPython ? "Yes" : "No"} |`);
  summaryLines.push("");

  summaryLines.push("## Gate Results");
  summaryLines.push("");
  summaryLines.push("| Gate | Verdict |");
  summaryLines.push("|------|---------|");
  summaryLines.push(`| M12.15 Rendered Visual QA | ${commercialReport.gateResults.m12_15_rendered_qa} |`);
  summaryLines.push(`| M12.16 Visual Design Standards | ${commercialReport.gateResults.m12_16_visual_design} |`);
  summaryLines.push(`| M12.17 Pixel Contrast | ${commercialReport.gateResults.m12_17_pixel_contrast} |`);
  summaryLines.push(`| M12.17 Color-Blindness | ${commercialReport.gateResults.m12_17_color_blindness} |`);
  summaryLines.push(`| M12.17 Font Readability | ${commercialReport.gateResults.m12_17_font_readability} |`);
  summaryLines.push(`| **Overall Commercial Readiness** | **${commercialReport.overallVerdict}** |`);
  summaryLines.push("");

  // Pixel contrast details
  summaryLines.push("## 1. Pixel-Based Contrast (on Rendered PNGs)");
  summaryLines.push("");
  summaryLines.push(`**Verdict**: ${pixelContrast.verdict}`);
  summaryLines.push("");
  if (pixelContrast.degraded) {
    summaryLines.push("> ⚠ Degraded: ImageMagick unavailable, using color metadata proxy");
    summaryLines.push("");
  }
  if (pixelContrast.findings && pixelContrast.findings.length > 0) {
    summaryLines.push("| Page | Role | Method | Ratio | Severity |");
    summaryLines.push("|------|------|--------|-------|----------|");
    for (const f of pixelContrast.findings) {
      const icon = f.severity === "pass" ? "✅" : f.severity === "warn" ? "⚠️" : "❌";
      summaryLines.push(`| ${f.page} | ${f.role} | ${f.method} | ${f.ratio ? f.ratio + ":1" : "N/A"} | ${icon} ${f.severity} |`);
    }
    summaryLines.push("");
  }

  // Color-blindness details
  summaryLines.push("## 2. Color-Blindness Simulation");
  summaryLines.push("");
  summaryLines.push(`**Verdict**: ${colorblind.verdict}`);
  summaryLines.push("");
  summaryLines.push("Simulates protanopia, deuteranopia, and tritanopia using deterministic matrix transforms.");
  summaryLines.push("Colors with simulated distance < 30 are flagged as indistinguishable.");
  summaryLines.push("");
  const failFindings = colorblind.findings ? colorblind.findings.filter((f) => f.severity === "fail") : [];
  const warnFindings = colorblind.findings ? colorblind.findings.filter((f) => f.severity === "warn") : [];
  if (failFindings.length > 0) {
    summaryLines.push("### Hard Failures (Protanopia/Deuteranopia)");
    summaryLines.push("");
    for (const f of failFindings) {
      summaryLines.push(`- Slide ${f.page}: ${f.pair} — sim distance ${f.simDist} (${f.simType})`);
      if (f.suggestion) summaryLines.push(`  → ${f.suggestion}`);
    }
    summaryLines.push("");
  }
  if (warnFindings.length > 0) {
    summaryLines.push("### Warnings (Tritanopia or minor issues)");
    summaryLines.push("");
    for (const f of warnFindings) {
      summaryLines.push(`- Slide ${f.page}: ${f.pair} — sim distance ${f.simDist} (${f.simType})`);
    }
    summaryLines.push("");
  }
  if (!failFindings.length && !warnFindings.length) {
    summaryLines.push("All color pairs maintain distinguishability across all three color-blindness simulations.");
    summaryLines.push("");
  }

  // Font readability details
  summaryLines.push("## 3. Font Fallback & Readability");
  summaryLines.push("");
  summaryLines.push(`**Verdict**: ${font.verdict}`);
  summaryLines.push("");
  if (font.degraded) {
    summaryLines.push("> ⚠ Degraded: PDF text extraction unavailable");
    summaryLines.push("");
  }
  if (font.findings && font.findings.length > 0) {
    for (const f of font.findings) {
      const icon = f.severity === "pass" ? "✅" : f.severity === "warn" ? "⚠️" : "❌";
      if (f.suggestion) {
        summaryLines.push(`${icon} [${f.category}] ${f.suggestion}`);
      } else {
        summaryLines.push(`${icon} [${f.category}] ${JSON.stringify(f)}`);
      }
    }
    summaryLines.push("");
  }

  // Remediations
  if (commercialReport.remediations.length > 0) {
    summaryLines.push("## Remediation Actions");
    summaryLines.push("");
    for (const r of commercialReport.remediations) {
      const icon = r.priority === "high" ? "🔴" : r.priority === "medium" ? "🟡" : "🟢";
      summaryLines.push(`${icon} **${r.category}**: ${r.suggestion}`);
    }
    summaryLines.push("");
  }

  // Append M12.16 summary
  summaryLines.push("---");
  summaryLines.push("");
  summaryLines.push("## M12.16 Visual Design Summary");
  summaryLines.push("");
  summaryLines.push(generateM12_16Summary(m12_16_gate));

  fs.writeFileSync(SUMMARY_PATH, summaryLines.join("\n"));
  console.log(`  Written: ${SUMMARY_PATH}`);

  // Also write the commercial verdict file (overwrites M12.15's if present)
  const verdictLines = [];
  verdictLines.push("# Commercial Delivery Verdict — M12.17");
  verdictLines.push("");
  verdictLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  verdictLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  verdictLines.push("");
  verdictLines.push("### Gate Summary");
  verdictLines.push("");
  for (const [gate, v] of Object.entries(commercialReport.gateResults)) {
    verdictLines.push(`- ${gate}: ${v}`);
  }
  verdictLines.push("");
  verdictLines.push(`### Quality Score: ${m12_16_gate.summary.qualityScore}/100`);
  verdictLines.push("");
  verdictLines.push(`### Checks: ${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn`);
  verdictLines.push("");
  if (commercialReport.remediations.length > 0) {
    verdictLines.push("### Top Remediations");
    verdictLines.push("");
    for (const r of commercialReport.remediations.slice(0, 10)) {
      verdictLines.push(`- [${r.priority.toUpperCase()}] ${r.category}: ${r.suggestion}`);
    }
    verdictLines.push("");
  }

  fs.writeFileSync(COMMERCIAL_VERDICT_PATH, verdictLines.join("\n"));
  console.log(`  Written: ${COMMERCIAL_VERDICT_PATH}`);

  // Machine report for CI
  fs.writeFileSync(REPORT_PATH, JSON.stringify(commercialReport, null, 2));
  console.log(`  Written: ${REPORT_PATH}`);

  console.log("");
  console.log("=".repeat(65));
  console.log(`FINAL VERDICT: ${commercialReport.overallVerdict}`);
  console.log("=".repeat(65));

  // Cleanup temp files
  try {
    const pngDir = AUDIT_DIR;
    for (const f of fs.readdirSync(pngDir)) {
      if (f.startsWith(".m12_17_tmp_")) {
        fs.unlinkSync(path.join(pngDir, f));
      }
    }
  } catch {}

  // Exit code
  if (commercialReport.overallVerdict === "FAIL") {
    process.exit(1);
  }
  // NEEDS_REVIEW exits 0 (informational)
  process.exit(0);
}

main().catch((err) => {
  console.error("M12.17 checker error:", err.message);
  process.exit(2);
});
