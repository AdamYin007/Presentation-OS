/**
 * Pixel Accessibility Gate — M12.17 Core Library
 *
 * Reusable module for pixel-level accessibility and rendered visual robustness checks.
 * Extracted from scripts/check-m12-17-pixel-accessibility-rendered-robustness.cjs.
 *
 * Features:
 *   1. Pixel-based contrast estimation on rendered PNGs (ImageMagick) or color metadata proxy
 *   2. Color-blindness simulation via deterministic 3x3 matrix transforms
 *   3. Font fallback / readability validation
 *   4. Unified commercial-readiness report merging M12.15/M12.16/M12.17 gates
 *
 * Verdict levels: PASS | NEEDS_REVIEW | FAIL
 *
 * Usage:
 *   const {
 *     checkPixelContrast,
 *     checkColorBlindness,
 *     checkFontFallback,
 *     mergeCommercialReadiness,
 *     detectEnvironment,
 *     estimatePixelContrast,
 *     computeColorContrast,
 *   } = require('./packages/pixel-accessibility-gate/src/index.js');
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

// ─── Environment Detection ──────────────────────────────────────────

function commandExists(cmd) {
  try {
    cp.execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect available rendering tools in the environment.
 * @returns {{ hasLibreOffice: boolean, hasImagemagick: boolean, hasPoppler: boolean, hasPython: boolean }}
 */
function detectEnvironment() {
  // LibreOffice detection reused from rendered-visual-qa
  const macSoffice = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
  const hasLibreOffice = fs.existsSync(macSoffice) || commandExists("soffice") || commandExists("libreoffice");
  const hasImagemagick = commandExists("identify") && commandExists("magick");
  const hasPoppler = commandExists("pdfinfo") && commandExists("pdftotext") && commandExists("pdfimages");
  const hasPython = commandExists("python3");
  return { hasLibreOffice, hasImagemagick, hasPoppler, hasPython };
}

// ─── 1. Pixel-Based Contrast Estimation ─────────────────────────────

/**
 * Sample pixels from a rendered PNG and estimate contrast ratios between
 * dominant foreground and background regions using ImageMagick nearest-neighbor
 * downsampling + bimodal luminance clustering.
 *
 * @param {string} pngPath - Absolute path to rendered PNG file
 * @returns {{ estimatedContrast: number, sampleSize: number, confidence: string } | null} Returns null if ImageMagick unavailable.
 */
function estimatePixelContrast(pngPath) {
  if (!commandExists("magick")) return null;

  let tmpPath = null;
  let txtPath = null;
  try {
    tmpPath = path.join(path.dirname(pngPath), ".m12_17_tmp_" + path.basename(pngPath));
    txtPath = tmpPath + ".txt";
    cp.execFileSync("magick", [pngPath, "-filter", "point", "-resize", "100x56!", "-type", "TrueColorAlpha", tmpPath], { timeout: 30000 });

    const dims = cp.execFileSync("identify", ["-format", "%w %h", tmpPath], { encoding: "utf8" }).trim().split(/\s+/);
    const w = parseInt(dims[0], 10);
    const h = parseInt(dims[1], 10);
    if (!w || !h) {
      try { fs.unlinkSync(tmpPath); } catch {}
      try { fs.unlinkSync(txtPath); } catch {}
      return null;
    }

    cp.execFileSync("magick", [tmpPath, `txt:${txtPath}`], { timeout: 30000 });
    const txtOutput = fs.readFileSync(txtPath, "utf8");
    const lines = txtOutput.trim().split("\n").filter(l => l.match(/^\d+,\d+:/));
    if (!lines.length) {
      try { fs.unlinkSync(tmpPath); } catch {}
      try { fs.unlinkSync(txtPath); } catch {}
      return null;
    }

    const samples = [];
    let maxValue = 0;
    for (const line of lines) {
      const rgbMatch = line.match(/\(([^)]+)\)/);
      if (rgbMatch) {
        const parts = rgbMatch[1].split(",");
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        if (!isNaN(r)) maxValue = Math.max(maxValue, r, g, b);
      }
    }

    let scale = 1;
    if (maxValue > 1000) scale = 1 / 65535;
    else if (maxValue > 1) scale = 1 / 255;

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

    const luminances = samples.map(([r, g, b]) => {
      const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    });

    const sorted = [...luminances].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    let darkLums = [];
    let lightLums = [];
    for (const lum of luminances) {
      if (lum < median) darkLums.push(lum);
      else lightLums.push(lum);
    }

    if (!darkLums.length || !lightLums.length) return { estimatedContrast: 1.0, sampleSize: samples.length, confidence: "low" };

    const darkMean = darkLums.reduce((a, b) => a + b, 0) / darkLums.length;
    const lightMean = lightLums.reduce((a, b) => a + b, 0) / lightLums.length;

    const lighter = Math.max(darkMean, lightMean);
    const darker = Math.min(darkMean, lightMean);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    const ratioSmall = Math.min(darkLums.length, lightLums.length) / samples.length;
    let confidence = "low";
    if (ratioSmall > 0.15) confidence = "medium";
    if (ratioSmall > 0.25) confidence = "high";

    try { fs.unlinkSync(tmpPath); } catch {}
    try { fs.unlinkSync(txtPath); } catch {}
    return { estimatedContrast: parseFloat(ratio.toFixed(2)), sampleSize: samples.length, confidence };
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
    try { fs.unlinkSync(txtPath); } catch {}
    return null;
  }
}

/**
 * Compute contrast ratio between two hex colors (WCAG formula).
 * @param {string} hex1 - First hex color (#RRGGBB)
 * @param {string} hex2 - Second hex color (#RRGGBB)
 * @returns {number} Contrast ratio (1-21 range)
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

/**
 * Analyze all rendered PNG pages for pixel-level contrast.
 * Falls back to layoutPlan color analysis when ImageMagick is unavailable.
 *
 * @param {Array<{num: number, file: string}>} pngFiles - Array of PNG file objects
 * @param {Array} slideSpecs - SlideSpec array with role info
 * @param {Object} layoutPlan - LayoutPlan with layouts containing colors
 * @returns {{ verdict: string, passCount: number, failCount: number, warnCount: number, results: Array, findings: Array, degraded: boolean, reason?: string }}
 */
function checkPixelContrast(pngFiles, slideSpecs, layoutPlan) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const findings = [];

  if (!pngFiles || !pngFiles.length) {
    return {
      verdict: "NEEDS_REVIEW", passCount: 1, failCount: 0, warnCount: 0,
      results: [{ status: "warn", message: "No rendered PNG files available — pixel contrast analysis skipped" }],
      findings: [], degraded: true, reason: "no_png_files",
    };
  }

  const pngDir = path.dirname(path.resolve(pngFiles[0].file));
  const hasImagemagick = commandExists("identify") && commandExists("magick");

  for (let i = 0; i < pngFiles.length && i < slideSpecs.length; i++) {
    const pngPath = pngFiles[i].file;
    const fullPath = path.isAbsolute(pngPath) ? pngPath : path.join(pngDir, pngPath);
    const spec = slideSpecs[i];
    const role = spec.role || "content";

    if (!hasImagemagick) {
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
      if (pixelResult.confidence === "low") {
        warnCount++;
        findings.push({ page: i + 1, role, method: "pixel_sample", ratio: pixelResult.estimatedContrast, threshold: `AA (${aaThreshold}:1)`, severity: "warn", confidence: pixelResult.confidence, note: "Low-confidence pixel clustering; requires human review before hard failure." });
      } else {
        failCount++;
        findings.push({ page: i + 1, role, method: "pixel_sample", ratio: pixelResult.estimatedContrast, threshold: `AA (${aaThreshold}:1)`, severity: "fail", confidence: pixelResult.confidence });
      }
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

  return {
    verdict, passCount, failCount, warnCount,
    results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `Page ${f.page} ${f.role} contrast ${f.ratio}:1` })),
    findings, degraded: !hasImagemagick,
  };
}

// ─── 2. Color-Blindness Simulation ──────────────────────────────────

const PROTANOPIA_MATRIX = [
  [0.56667, 0.43333, 0.00000],
  [0.55833, 0.44167, 0.00000],
  [0.00000, 0.24167, 0.75833],
];

const DEUTERANOPIA_MATRIX = [
  [0.62500, 0.37500, 0.00000],
  [0.70000, 0.30000, 0.00000],
  [0.00000, 0.30000, 0.70000],
];

const TRITANOPIA_MATRIX = [
  [0.95000, 0.05000, 0.00000],
  [0.00000, 0.43333, 0.56667],
  [0.00000, 0.47500, 0.52500],
];

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

function colorDistance(rgb1, rgb2) {
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
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
 * Check if two colors remain distinguishable after color-blindness simulation.
 * @param {string} originalFg - Foreground hex color
 * @param {string} originalBg - Background hex color
 * @param {string} simType - "protanopia" | "deuteranopia" | "tritanopia"
 * @returns {{ simType, originalDist, simDist, distinguishable, simFg, simBg } | null}
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

  return {
    simType, originalDist: parseFloat(origDist.toFixed(1)),
    simDist: parseFloat(simDist.toFixed(1)),
    distinguishable: simDist >= 30,
    simFg: simFg.map(v => v.toString(16).padStart(2, "0")).join(""),
    simBg: simBg.map(v => v.toString(16).padStart(2, "0")).join(""),
  };
}

/**
 * Run color-blindness simulation across all slide layouts.
 *
 * @param {Object} layoutPlan - LayoutPlan with layouts containing colors
 * @returns {{ verdict: string, passCount: number, failCount: number, warnCount: number, results: Array, findings: Array, degraded: boolean }}
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
      verdict: "NEEDS_REVIEW", passCount: 1, failCount: 0, warnCount: 0,
      results: [{ status: "warn", message: "No layout data available — color-blindness simulation skipped" }],
      findings: [], degraded: true,
    };
  }

  for (const layout of layoutPlan.layouts) {
    const colors = layout.colors;
    if (!colors) continue;

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
          if (simType === "deuteranopia" || simType === "protanopia") {
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

  return {
    verdict, passCount, failCount, warnCount,
    results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `Slide ${f.page} ${f.pair} ${f.simType} dist=${f.simDist}` })),
    findings, degraded: false,
  };
}

// ─── 3. Font Fallback / Readability Checks ──────────────────────────

/**
 * Check font fallback and readability using PPTX/theme/spec metadata.
 * When pdftotext is available, also verify rendered text extraction quality.
 *
 * @param {Array} slideSpecs - SlideSpec array
 * @param {Object} layoutPlan - LayoutPlan with layouts containing fontFamily/fontSize
 * @param {Array} pdfTextPages - Array of {page, charCount} from pdftotext
 * @param {Object} environment - Result of detectEnvironment()
 * @returns {{ verdict: string, passCount: number, failCount: number, warnCount: number, results: Array, findings: Array, degraded: boolean }}
 */
function checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const findings = [];

  if (!slideSpecs || !slideSpecs.length) {
    return {
      verdict: "NEEDS_REVIEW", passCount: 1, failCount: 0, warnCount: 0,
      results: [{ status: "warn", message: "No slide specs available — font checks skipped" }],
      findings: [], degraded: true,
    };
  }

  const fontFamilies = new Set();
  const fontSizeMap = {};

  if (layoutPlan && layoutPlan.layouts) {
    for (const layout of layoutPlan.layouts) {
      if (layout.fontFamily) {
        fontFamilies.add(layout.fontFamily);
        if (!fontSizeMap[layout.fontFamily]) fontSizeMap[layout.fontFamily] = [];
        fontSizeMap[layout.fontFamily].push(layout.fontSize || 0);
      }
    }
  }

  const safeFallbacks = ["sans-serif", "serif", "monospace", "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Calibri", "Segoe UI", "Roboto", "system-ui", "-apple-system"];

  for (const fontFamily of fontFamilies) {
    if (!safeFallbacks.includes(fontFamily.toLowerCase())) {
      warnCount++;
      findings.push({ category: "font_fallback", font: fontFamily, severity: "warn", suggestion: `Custom font "${fontFamily}" may not render correctly on all systems. Add fallback stack: "${fontFamily}, sans-serif"` });
    } else {
      passCount++;
      findings.push({ category: "font_fallback", font: fontFamily, severity: "pass" });
    }

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

  if (environment.hasPoppler && pdfTextPages && pdfTextPages.length) {
    for (let i = 0; i < pdfTextPages.length && i < slideSpecs.length; i++) {
      const page = pdfTextPages[i];
      const spec = slideSpecs[i];
      const role = spec.role || "content";

      if (["title", "section-divider", "closing"].includes(role)) continue;

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

  return {
    verdict, passCount, failCount, warnCount,
    results: findings.map((f) => ({ status: f.severity === "pass" ? "pass" : f.severity === "warn" ? "warn" : "fail", message: `${f.category}: ${JSON.stringify(f)}` })),
    findings, degraded: !environment.hasPoppler,
  };
}

// ─── 4. Commercial Readiness Report Merger ──────────────────────────

/**
 * Merge M12.15 rendered QA + M12.16 visual design gate + M12.17 pixel/accessibility
 * into a single commercial-readiness report with consolidated verdict and remediation.
 *
 * @param {string} m12_15_verdict - "PASS" | "NEEDS_REVIEW" | "FAIL"
 * @param {Object} m12_16_gate - Visual design gate result object
 * @param {Object} m12_17_pixel - Pixel contrast check result
 * @param {Object} m12_17_colorblind - Color-blindness check result
 * @param {Object} m12_17_font - Font fallback check result
 * @param {Object} environment - detectEnvironment() result
 * @returns {{ overallVerdict, gateResults, environment, remediations, totalChecks }}
 */
function mergeCommercialReadiness(m12_15_verdict, m12_16_gate, m12_17_pixel, m12_17_colorblind, m12_17_font, environment) {
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

  const remediations = [];

  if (m12_16_gate.remediationSuggestions) {
    for (const r of m12_16_gate.remediationSuggestions) {
      remediations.push({ priority: r.severity === "fail" ? "high" : "medium", category: r.category || "visual_design", suggestion: r.suggestion });
    }
  }

  for (const f of m12_17_colorblind.findings || []) {
    if (f.suggestion) {
      remediations.push({ priority: f.severity === "fail" ? "high" : "medium", category: "color_blindness", suggestion: f.suggestion });
    }
  }

  for (const f of m12_17_font.findings || []) {
    if (f.suggestion) {
      remediations.push({ priority: f.severity === "fail" ? "high" : "low", category: "font_readability", suggestion: f.suggestion });
    }
  }

  for (const f of m12_17_pixel.findings || []) {
    if (f.severity === "fail") {
      remediations.push({ priority: "high", category: "pixel_contrast", suggestion: `Page ${f.page}: estimated contrast ${f.ratio}:1 below AA threshold. Lighten background or darken foreground.` });
    }
  }

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

// ─── Export ──────────────────────────────────────────────────────────

module.exports = {
  // Environment
  detectEnvironment,
  commandExists,

  // Pixel contrast
  estimatePixelContrast,
  computeColorContrast,
  checkPixelContrast,

  // Color-blindness
  checkColorDistinguishability,
  applyColorBlindMatrix,
  checkColorBlindness,

  // Font fallback
  checkFontFallback,

  // Commercial readiness
  mergeCommercialReadiness,
};
