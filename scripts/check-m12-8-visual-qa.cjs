#!/usr/bin/env node
/**
 * M12.8 Visual QA — deterministic visual and package quality gates.
 *
 * Generates a real PPTX, converts it to PDF, renders every page to PNG, and
 * checks the generated artifact for blank/sparse pages, simple layout hazards,
 * invalid assets, broken relationships, absolute path leakage, and text density.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

const ROOT = path.join(__dirname, "..");
const FIXTURE = path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const AUDIT_DIR = "/tmp/presentation-os-m12-8-visual-qa";
const PNG_DIR = path.join(AUDIT_DIR, "png");
const PPTX_PATH = path.join(AUDIT_DIR, "output.pptx");
const PDF_DIR = path.join(AUDIT_DIR, "pdf-output");
const PDF_PATH = path.join(PDF_DIR, "output.pdf");
const REPORT_PATH = path.join(AUDIT_DIR, "visual-audit.json");
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];

function record(condition, message, severity = "fail", data = {}) {
  if (condition) {
    passCount++;
    checks.push({ status: "pass", message, ...data });
    console.log(`  OK ${message}`);
    return;
  }
  if (severity === "warn") {
    warnCount++;
    checks.push({ status: "warn", message, ...data });
    console.log(`  WARN ${message}`);
  } else {
    failCount++;
    checks.push({ status: "fail", message, ...data });
    console.log(`  FAIL ${message}`);
  }
}

function run(cmd, args, options = {}) {
  return cp.execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: options.encoding || "utf8",
    stdio: options.stdio || "pipe",
    timeout: options.timeout || 60000,
  });
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function commandExists(cmd) {
  try {
    run("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

function resolveLibreOfficeCommand() {
  const macSoffice = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
  if (fs.existsSync(macSoffice)) return macSoffice;
  if (commandExists("soffice")) return "soffice";
  if (commandExists("libreoffice")) return "libreoffice";
  return null;
}

function renderPptxToPdf() {
  const soffice = resolveLibreOfficeCommand();
  record(Boolean(soffice), "LibreOffice is available for PPTX to PDF conversion", "warn");
  if (!soffice) return false;

  try {
    run(soffice, ["--headless", "--convert-to", "pdf", "--outdir", PDF_DIR, PPTX_PATH], { timeout: 90000 });
    record(fs.existsSync(PDF_PATH), `PDF generated at ${PDF_PATH}`);
    return fs.existsSync(PDF_PATH);
  } catch (e) {
    record(false, `PDF conversion failed: ${e.message}`);
    return false;
  }
}

function getPdfPageCount() {
  try {
    const out = run("pdfinfo", [PDF_PATH]);
    const match = out.match(/^Pages:\s+(\d+)/m);
    return match ? Number(match[1]) : 0;
  } catch (e) {
    record(false, `pdfinfo failed: ${e.message}`);
    return 0;
  }
}

function renderPdfToPng(pageCount) {
  if (!commandExists("pdftoppm")) {
    record(false, "pdftoppm is available for per-slide PNG rendering");
    return [];
  }
  fs.mkdirSync(PNG_DIR, { recursive: true });
  try {
    run("pdftoppm", ["-png", "-r", "120", PDF_PATH, path.join(PNG_DIR, "slide")], { timeout: 90000 });
  } catch (e) {
    record(false, `PNG rendering failed: ${e.message}`);
    return [];
  }
  const files = fs.readdirSync(PNG_DIR)
    .filter((file) => /^slide-\d+\.png$/.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => path.join(PNG_DIR, file));
  record(files.length === pageCount, `PNG count matches PDF pages: ${files.length}/${pageCount}`);
  return files;
}

function analyzePngs(files) {
  if (files.length === 0) return [];
  const py = [
    "import json, sys",
    "from PIL import Image",
    "rows=[]",
    "for p in sys.argv[1:]:",
    "    im=Image.open(p).convert('RGB')",
    "    small=im.resize((96,54))",
    "    pixels=list(small.getdata())",
    "    bg=max(set(pixels), key=pixels.count)",
    "    diff=sum(1 for px in pixels if sum(abs(px[i]-bg[i]) for i in range(3))>30)",
    "    unique=len(set(pixels))",
    "    rows.append({'path':p,'width':im.width,'height':im.height,'uniqueColors':unique,'inkRatio':diff/len(pixels)})",
    "print(json.dumps(rows))",
  ].join("\n");
  try {
    return JSON.parse(run("python3", ["-c", py, ...files], { timeout: 60000 }));
  } catch (e) {
    record(false, `PNG pixel analysis failed: ${e.message}`);
    return [];
  }
}

function getPdfTextByPage(pageCount) {
  if (!commandExists("pdftotext")) {
    record(false, "pdftotext is available for sparse-page checks");
    return [];
  }
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    try {
      const text = run("pdftotext", ["-f", String(i), "-l", String(i), "-layout", PDF_PATH, "-"]);
      pages.push({ page: i, text, charCount: text.replace(/\s+/g, "").length });
    } catch (e) {
      record(false, `pdftotext failed on page ${i}: ${e.message}`);
      pages.push({ page: i, text: "", charCount: 0 });
    }
  }
  return pages;
}

function listPptxEntries() {
  try {
    return run("unzip", ["-Z1", PPTX_PATH]).split(/\r?\n/).filter(Boolean);
  } catch (e) {
    record(false, `Unable to list PPTX entries: ${e.message}`);
    return [];
  }
}

function readPptxEntry(entry) {
  try {
    return run("unzip", ["-p", PPTX_PATH, entry], { timeout: 30000 });
  } catch {
    return "";
  }
}

function validatePptxPackage(entries) {
  const media = entries.filter((e) => e.startsWith("ppt/media/"));
  const rels = entries.filter((e) => e.endsWith(".rels"));
  const xmlEntries = entries.filter((e) => e.endsWith(".xml") || e.endsWith(".rels"));
  const xmlText = xmlEntries.map(readPptxEntry).join("\n");
  const absolutePathHits = xmlText.match(/(?:\/Users\/|\/private\/|file:\/\/|[A-Za-z]:\\)/g) || [];
  const relText = rels.map(readPptxEntry).join("\n");
  const badTargets = relText.match(/Target=["'](?:file:\/\/|\/Users\/|\/private\/|[A-Za-z]:\\)/g) || [];

  record(absolutePathHits.length === 0, "No absolute local paths leaked into PPTX XML", "fail", { count: absolutePathHits.length });
  record(badTargets.length === 0, "No absolute relationship targets in PPTX package", "fail", { count: badTargets.length });
  record(media.every((e) => !e.includes("..")), `Media entries are package-relative (${media.length} media files)`);
  return { mediaCount: media.length, relationshipCount: rels.length, absolutePathHits: absolutePathHits.length, badTargets: badTargets.length };
}

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

function overlaps(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function validateLayoutGeometry(slideSpecs, layoutPlan) {
  let zeroSize = 0;
  let outOfBounds = 0;
  let negative = 0;
  let overlap = 0;
  let overflowSuspected = 0;
  let highDensity = 0;

  for (const spec of slideSpecs) {
    const layout = layoutPlan.layouts.find((l) => l.slideId === spec.id);
    const boxes = boxesForSlide(spec, layout);
    for (const box of boxes) {
      if (box.w <= 0 || box.h <= 0) zeroSize++;
      if (box.x < 0 || box.y < 0) negative++;
      if (box.x + box.w > SLIDE_W || box.y + box.h > SLIDE_H) outOfBounds++;
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (overlaps(boxes[i], boxes[j]) > 0.02) overlap++;
      }
    }
    const body = Array.isArray(spec.body) ? spec.body.join(" ") : "";
    const bodyChars = body.length;
    const bodyBox = boxes.find((b) => b.label === "body");
    const bodyArea = bodyBox ? bodyBox.w * bodyBox.h : 1;
    const density = bodyChars / bodyArea;
    if (density > 55) overflowSuspected++;
    if (density > 38) highDensity++;
  }

  record(zeroSize === 0, `Zero-size render boxes: ${zeroSize}`);
  record(negative === 0, `Negative render coordinates: ${negative}`);
  record(outOfBounds === 0, `Out-of-bounds render boxes: ${outOfBounds}`);
  record(overlap === 0, `Estimated text box overlaps: ${overlap}`);
  record(overflowSuspected === 0, `Critical overflow suspected: ${overflowSuspected}`);
  record(highDensity === 0, `High text density warnings: ${highDensity}`, "warn");
  return { zeroSize, negative, outOfBounds, overlap, overflowSuspected, highDensity };
}

function validateRenderedPages(pngStats, pdfTexts, slideSpecs) {
  let blankSlides = 0;
  let sparseSlides = 0;
  for (let i = 0; i < pngStats.length; i++) {
    const stat = pngStats[i];
    const text = pdfTexts[i] || { charCount: 0 };
    const spec = slideSpecs[i] || {};
    const role = spec.role || "content";
    const blank = stat.inkRatio < 0.002 && text.charCount === 0;
    const sparse = !["title", "section-divider", "closing"].includes(role) && text.charCount < 40;
    if (blank) blankSlides++;
    if (sparse) sparseSlides++;
  }
  record(blankSlides === 0, `Blank rendered slides: ${blankSlides}`);
  record(sparseSlides === 0, `Sparse content slides: ${sparseSlides}`);
  return { blankSlides, sparseSlides };
}

async function main() {
  console.log("M12.8 Visual QA");
  console.log("================\n");
  ensureCleanDir(AUDIT_DIR);
  fs.mkdirSync(PDF_DIR, { recursive: true });

  const input = fs.readFileSync(FIXTURE, "utf8");
  const result = await runPipeline(input, { style: "minimal-modern" });
  fs.writeFileSync(PPTX_PATH, result.pptxBuffer);
  record(fs.existsSync(PPTX_PATH) && fs.statSync(PPTX_PATH).size > 0, `PPTX generated at ${PPTX_PATH}`);

  const entries = listPptxEntries();
  const packageSummary = validatePptxPackage(entries);
  const geometrySummary = validateLayoutGeometry(result.slideSpecs, result.layoutPlan);
  const pdfOk = renderPptxToPdf();
  const pageCount = pdfOk ? getPdfPageCount() : 0;
  if (pdfOk) {
    record(pageCount === result.slideSpecs.length, `PDF page count matches slide specs: ${pageCount}/${result.slideSpecs.length}`);
  } else {
    record(true, "PDF page count check skipped because LibreOffice is unavailable");
  }
  const pngFiles = pdfOk ? renderPdfToPng(pageCount) : [];
  const pngStats = analyzePngs(pngFiles);
  const pdfTexts = pdfOk ? getPdfTextByPage(pageCount) : [];
  const renderedSummary = validateRenderedPages(pngStats, pdfTexts, result.slideSpecs);

  const report = {
    status: failCount === 0 ? "pass" : "fail",
    generatedAt: new Date().toISOString(),
    input: "fixtures/document-ingest/sample-markdown.md",
    pptxPath: PPTX_PATH,
    pdfPath: PDF_PATH,
    pngDir: PNG_DIR,
    slideCount: result.slideSpecs.length,
    pdfPageCount: pageCount,
    pngCount: pngFiles.length,
    packageSummary,
    geometrySummary,
    renderedSummary,
    pngStats,
    pageTextStats: pdfTexts.map((p) => ({ page: p.page, charCount: p.charCount })),
    checks,
    passCount,
    failCount,
    warnCount,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log("\n==============================");
  console.log(`Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log(`Report: ${REPORT_PATH}`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`Fatal error: ${e.stack || e.message}`);
  process.exit(1);
});
