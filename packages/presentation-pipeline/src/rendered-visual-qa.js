/**
 * M12.15 — Rendered Visual QA Helper Module
 *
 * Shared logic for PPTX package inspection, rendered page analysis,
 * layout geometry validation, and commercial verdict computation.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

// ─── Constants ──────────────────────────────────────────────────────

const SLIDE_W = 13.333; // inches (16:9)
const SLIDE_H = 7.5;

// ─── Renderer Detection ─────────────────────────────────────────────

function commandExists(cmd) {
  try {
    cp.execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function resolveRenderer() {
  const { getToolPath } = require("./tool-paths.js");
  const sofficePath = getToolPath("soffice");
  if (sofficePath) return { available: true, cmd: sofficePath };
  if (commandExists("soffice")) return { available: true, cmd: "soffice" };
  if (commandExists("libreoffice")) return { available: true, cmd: "libreoffice" };
  return { available: false, reason: "No LibreOffice/OpenOffice installation found" };
}

// ─── PPTX Package Inspection ────────────────────────────────────────

function listPptxEntries(pptxPath) {
  try {
    const out = cp.execFileSync("unzip", ["-Z1", pptxPath], { encoding: "utf8" });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function readPptxEntry(pptxPath, entry) {
  try {
    return cp.execFileSync("unzip", ["-p", pptxPath, entry], { encoding: "utf8", timeout: 30000 });
  } catch {
    return "";
  }
}

function checkPptxPackage(pptxPath) {
  const entries = listPptxEntries(pptxPath);
  if (!entries.length) {
    return { error: "Could not list PPTX entries", valid: false };
  }

  const media = entries.filter((e) => e.startsWith("ppt/media/"));
  const rels = entries.filter((e) => e.endsWith(".rels"));
  const xmlEntries = entries.filter((e) => e.endsWith(".xml") || e.endsWith(".rels"));
  const xmlText = xmlEntries.map((entry) => readPptxEntry(pptxPath, entry)).join("\n");

  // Absolute path leakage
  const absolutePathHits = xmlText.match(/(?:\/Users\/|\/private\/|file:\/\/|[A-Z]:\\)/g) || [];
  const relText = rels.map((entry) => readPptxEntry(pptxPath, entry)).join("\n");
  const badTargets =
    relText.match(/Target=["'](?:file:\/\/|\/Users\/|\/private\/|[A-Z]:\\)/g) || [];

  // Media integrity — no ".." in paths
  const mediaSafe = media.every((e) => !e.includes(".."));

  // Slide count from [Content_Types].xml
  const slideCount = entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e)).length;

  return {
    valid: true,
    totalEntries: entries.length,
    mediaCount: media.length,
    relationshipCount: rels.length,
    slideCount,
    absolutePathHits: absolutePathHits.length,
    badTargets: badTargets.length,
    mediaSafe,
  };
}

// ─── PDF Conversion ─────────────────────────────────────────────────

function renderToPdf(pptxPath, outputDir, renderer) {
  if (!renderer.available) return { success: false, reason: "LibreOffice unavailable" };

  const pdfOutputPath = path.join(outputDir, "output.pdf");
  try {
    cp.execFileSync(
      renderer.cmd,
      ["--headless", "--convert-to", "pdf", "--outdir", outputDir, pptxPath],
      { timeout: 90000 },
    );
    return { success: fs.existsSync(pdfOutputPath), pdfPath: pdfOutputPath };
  } catch (e) {
    return { success: false, reason: `Conversion failed: ${e.message}` };
  }
}

// ─── PDF Page Analysis ──────────────────────────────────────────────

function getPdfPageCount(pdfPath) {
  try {
    const out = cp.execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    const match = out.match(/^Pages:\s+(\d+)/m);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

function getPdfTextByPage(pdfPath, pageCount) {
  if (!commandExists("pdftotext")) return [];
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    try {
      const text = cp.execFileSync(
        "pdftotext",
        ["-f", String(i), "-l", String(i), "-layout", pdfPath, "-"],
        { encoding: "utf8", timeout: 30000 },
      );
      pages.push({ page: i, charCount: text.replace(/\s+/g, "").length, rawLength: text.length });
    } catch {
      pages.push({ page: i, charCount: 0, rawLength: 0 });
    }
  }
  return pages;
}

function renderPdfToPng(pdfPath, outputDir, pageCount) {
  const pngFiles = [];
  // Use pdfimages with quiet flag to list images without help text
  try {
    if (commandExists("pdfimages")) {
      const result = cp.execFileSync("pdfimages", ["-q", "-png", "-list", pdfPath], {
        encoding: "utf8",
      });
      result.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+\.png)$/);
        if (m) pngFiles.push({ num: parseInt(m[1], 10), file: m[5] });
      });
    }
  } catch {
    // pdfimages may not support -list on all versions — try direct conversion
  }

  // Fallback: convert all pages directly with pdfimages
  if (!pngFiles.length && commandExists("pdfimages")) {
    try {
      const baseName = path.basename(pdfPath, ".pdf");
      cp.execFileSync("pdfimages", ["-q", "-png", pdfPath, path.join(outputDir, baseName)], {
        timeout: 60000,
      });
      for (let i = 1; i <= pageCount; i++) {
        const expected = path.join(outputDir, `${baseName}-${i}.png`);
        if (fs.existsSync(expected)) {
          pngFiles.push({ num: i, file: `${baseName}-${i}.png` });
        }
      }
    } catch {
      // ignore
    }
  }

  return pngFiles;
}

function analyzePngInkRatio(pngFile) {
  // Use ImageMagick identify if available, otherwise fall back
  try {
    const out = cp.execFileSync("identify", ["-format", "%w %h %[fx:mean]", pngFile], {
      encoding: "utf8",
    });
    const parts = out.trim().split(/\s+/);
    if (parts.length >= 3) {
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      const mean = parseFloat(parts[2]);
      // Simple heuristic: low mean + uniform distribution = blank
      return { width: w, height: h, meanPixel: mean, isLikelyBlank: mean > 0.9 && mean < 0.99 };
    }
  } catch {
    // ImageMagick not available
  }
  return null;
}

// ─── Layout Geometry Validation ─────────────────────────────────────

function boxesForSlide(spec, layout) {
  const maxWidth = ((layout && layout.maxWidth) || 800) / 96;
  const role = spec.role || "content";

  if (role === "title") return [{ label: "title", x: 1, y: 2.5, w: maxWidth, h: 1.5 }];
  if (role === "section-divider") return [{ label: "title", x: 1, y: 2.5, w: maxWidth, h: 2 }];
  if (role === "closing") {
    return [
      { label: "title", x: 1, y: 2.5, w: maxWidth, h: 1.5 },
      { label: "message", x: 1, y: 4.2, w: maxWidth, h: 0.5 },
    ];
  }
  if (role === "agenda") {
    return [
      { label: "title", x: 0.5, y: 0.5, w: maxWidth, h: 0.8 },
      { label: "body", x: 0.5, y: 1.5, w: maxWidth, h: 5 },
    ];
  }
  return [
    { label: "title", x: 0.5, y: 0.3, w: maxWidth, h: 0.8 },
    { label: "body", x: 0.5, y: 1.2, w: maxWidth, h: 5.5 },
    { label: "sourceRefs", x: 0.5, y: 7.0, w: maxWidth, h: 0.3 },
  ];
}

function boxOverlap(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function validateLayoutGeometry(slideSpecs, layoutPlan) {
  let zeroSize = 0;
  let negative = 0;
  let outOfBounds = 0;
  let overlap = 0;
  let overflowSuspected = 0;
  let highDensity = 0;

  for (const spec of slideSpecs) {
    const layout = layoutPlan?.layouts?.find((l) => l.slideId === spec.id);
    const boxes = boxesForSlide(spec, layout);

    for (const box of boxes) {
      if (box.w <= 0 || box.h <= 0) zeroSize++;
      if (box.x < 0 || box.y < 0) negative++;
      if (box.x + box.w > SLIDE_W || box.y + box.h > SLIDE_H) outOfBounds++;
    }

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (boxOverlap(boxes[i], boxes[j]) > 0.02) overlap++;
      }
    }

    const body = Array.isArray(spec.body) ? spec.body.join(" ") : spec.body || "";
    const bodyChars = body.length;
    const bodyBox = boxes.find((b) => b.label === "body");
    const bodyArea = bodyBox ? bodyBox.w * bodyBox.h : 1;
    const density = bodyChars / bodyArea;
    if (density > 55) overflowSuspected++;
    if (density > 38) highDensity++;
  }

  return { zeroSize, negative, outOfBounds, overlap, overflowSuspected, highDensity };
}

// ─── Rendered Page Validation ───────────────────────────────────────

function validateRenderedPages(pngStats, pdfTexts, slideSpecs) {
  let blankSlides = 0;
  let sparseSlides = 0;
  const perPage = [];

  for (let i = 0; i < slideSpecs.length; i++) {
    const stat = pngStats[i] || {};
    const text = pdfTexts[i] || { charCount: 0 };
    const spec = slideSpecs[i] || {};
    const role = spec.role || "content";

    const blank = stat.isLikelyBlank && text.charCount === 0;
    const sparse = !["title", "section-divider", "closing"].includes(role) && text.charCount < 40;

    if (blank) blankSlides++;
    if (sparse) sparseSlides++;

    perPage.push({
      page: i + 1,
      role,
      blank,
      sparse,
      charCount: text.charCount,
      isLikelyBlank: stat.isLikelyBlank || false,
    });
  }

  return { blankSlides, sparseSlides, perPage };
}

// ─── Commercial Verdict ─────────────────────────────────────────────

function computeVerdict(manifest, renderedResults, rendererAvailable) {
  const checks = manifest?.checks || [];
  const summary = manifest?.summary || {};
  const qualityScore = summary.qualityScore || 0;
  const failCount = summary.failCount || 0;

  // Hard gate failures from rendered results
  const hardFails = [];
  const warnings = [];

  if (renderedResults) {
    if (renderedResults.blankSlides > 0)
      hardFails.push(`${renderedResults.blankSlides} blank slide(s) detected`);
    if (renderedResults.overflowSuspected > 0)
      hardFails.push(`${renderedResults.overflowSuspected} critical overflow suspected`);
    if (renderedResults.zeroSize > 0)
      hardFails.push(`${renderedResults.zeroSize} zero-size render box(es)`);
    if (renderedResults.negative > 0)
      hardFails.push(`${renderedResults.negative} negative coordinate(s)`);
  }

  // Package-level hard gates
  if (manifest.packageSummary) {
    if (manifest.packageSummary.absolutePathHits > 0)
      hardFails.push(
        `${manifest.packageSummary.absolutePathHits} absolute path leak(s) in PPTX XML`,
      );
    if (manifest.packageSummary.badTargets > 0)
      hardFails.push(`${manifest.packageSummary.badTargets} bad relationship target(s)`);
  }

  // Quality score gates
  if (qualityScore < 50)
    hardFails.push(`Quality score ${qualityScore}/100 below minimum threshold`);
  else if (qualityScore < 80)
    warnings.push(`Quality score ${qualityScore}/100 below PASS threshold (>= 80)`);

  if (failCount > 0) hardFails.push(`${failCount} quality check(s) failed`);

  // Warning-level gates
  if (renderedResults) {
    if (renderedResults.sparseSlides > 0)
      warnings.push(`${renderedResults.sparseSlides} sparse content slide(s)`);
    if (renderedResults.highDensity > 0)
      warnings.push(`${renderedResults.highDensity} high-density slide(s)`);
  }

  // Degradation note
  const degraded = !rendererAvailable;
  if (degraded) {
    warnings.push(
      "Rendered page checks skipped — LibreOffice unavailable (package + geometry checks only)",
    );
  }

  // Compute verdict
  let verdict;
  if (hardFails.length > 0) {
    verdict = "FAIL";
  } else if (warnings.length > 0 || degraded) {
    verdict = "NEEDS_REVIEW";
  } else {
    verdict = "PASS";
  }

  return {
    verdict,
    qualityScore,
    hardFails,
    warnings,
    degraded,
    rendererAvailable,
    passCount: summary.passCount || 0,
    failCount,
    warnCount: summary.warnCount || 0,
  };
}

// ─── Public API ─────────────────────────────────────────────────────

module.exports = {
  resolveRenderer,
  checkPptxPackage,
  renderToPdf,
  getPdfPageCount,
  getPdfTextByPage,
  renderPdfToPng,
  analyzePngInkRatio,
  validateLayoutGeometry,
  validateRenderedPages,
  computeVerdict,
  boxesForSlide,
  boxOverlap,
};
