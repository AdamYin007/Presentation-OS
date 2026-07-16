/**
 * M12.14 — Quality Assurance Utilities
 *
 * Shared logic for content/structural QA checks and manifest emission.
 * Used by both the CLI checker and the pipeline `emitManifest` hook.
 */

const fs = require("fs");
const path = require("path");

// ─── Content Checks ─────────────────────────────────────────────────────

function checkTitles(slideSpecs) {
  let allFilled = true;
  for (const spec of slideSpecs) {
    if (!spec.title || spec.title.trim().length === 0) {
      allFilled = false;
      break;
    }
  }
  return { id: "title-completeness", category: "content", pass: allFilled, message: `All ${slideSpecs.length} slides have non-empty titles` };
}

function checkSourceRefs(slideSpecs) {
  const contentRoles = ["content", "data-chart", "architecture", "process"];
  const exemptRoles = ["section-divider", "closing", "title-slide", "agenda"];
  let contentSlides = 0;
  let slidesWithRefs = 0;

  for (const spec of slideSpecs) {
    const role = spec.role || "";
    if (exemptRoles.includes(role)) continue;
    if (!contentRoles.includes(role)) continue;
    contentSlides++;
    if (spec.sourceRefs && spec.sourceRefs.length > 0) slidesWithRefs++;
  }

  if (contentSlides === 0) {
    return { id: "source-ref-coverage", category: "content", pass: true, message: "No content slides to check" };
  }

  const pct = Math.round((slidesWithRefs / contentSlides) * 100);
  return { id: "source-ref-coverage", category: "content", pass: pct >= 100, message: `${slidesWithRefs}/${contentSlides} content slides have sourceRefs (${pct}%) — REQUIRED: 100%` };
}

function checkDuplicateContent(slideSpecs) {
  const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
  const pairs = new Map();
  let duplicates = 0;

  for (const spec of slideSpecs) {
    const key = `${normalize(spec.title)}|${normalize(spec.keyMessage || "")}`;
    if (pairs.has(key)) duplicates++;
    else pairs.set(key, spec.id);
  }

  return { id: "duplicate-detection", category: "content", pass: duplicates === 0, message: `Found ${duplicates} duplicate pairs out of ${pairs.size} unique — REQUIRED: 0 duplicates` };
}

function checkSectionDividers(slideSpecs) {
  const dividerSlides = slideSpecs.filter((s) => s.role === "section-divider");
  const hasDividers = dividerSlides.length >= 2;
  const allHaveTitles = dividerSlides.every((s) => s.title && s.title.trim().length > 0);

  const results = [];
  results.push({ id: "section-dividers", category: "structure", pass: hasDividers, message: `Found ${dividerSlides.length} section dividers — RECOMMENDED: minimum 2` });
  if (dividerSlides.length > 0) {
    results.push({ id: "section-divider-structure", category: "structure", pass: allHaveTitles, message: `All ${dividerSlides.length} section dividers have non-empty titles` });
  }
  return results;
}

function checkClosingSlide(slideSpecs) {
  const closingSlides = slideSpecs.filter((s) => s.role === "closing");
  const hasOne = closingSlides.length === 1;
  const results = [{ id: "closing-slide", category: "structure", pass: hasOne, message: `Found ${closingSlides.length} closing slide(s) — REQUIRED: exactly 1` }];

  if (hasOne) {
    const closing = closingSlides[0];
    const hasBody = Array.isArray(closing.body) ? closing.body.length > 0 : (closing.body && closing.body.trim().length > 0);
    results.push({ id: "closing-slide-content", category: "structure", pass: true, message: `Closing slide present (${hasBody ? "has" : "no"} body content — reported as info)` });
  }
  return results;
}

function checkLayoutDiversity(slideSpecs) {
  const layoutCounts = {};
  for (const spec of slideSpecs) {
    const layout = spec.layout || "default";
    layoutCounts[layout] = (layoutCounts[layout] || 0) + 1;
  }
  const distinctLayouts = Object.keys(layoutCounts).length;
  const totalSlides = slideSpecs.length;
  return { id: "layout-diversity", category: "structure", pass: distinctLayouts >= Math.min(3, totalSlides), message: `${distinctLayouts} distinct layouts across ${totalSlides} slides (ratio: ${(totalSlides > 0 ? distinctLayouts / totalSlides : 0) * 100 | 0}%)` };
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Run all content + structural QA checks on slide specs.
 * Returns { checks, warnings, passCount, failCount, warnCount }.
 */
function runQualityChecks(slideSpecs) {
  const checks = [];
  const warnings = [];

  const titleCheck = checkTitles(slideSpecs);
  checks.push(titleCheck);
  if (!titleCheck.pass) warnings.push(titleCheck.message);

  const sourceCheck = checkSourceRefs(slideSpecs);
  checks.push(sourceCheck);
  if (!sourceCheck.pass) warnings.push(sourceCheck.message);

  const dupCheck = checkDuplicateContent(slideSpecs);
  checks.push(dupCheck);
  if (!dupCheck.pass) warnings.push(dupCheck.message);

  const sectionChecks = checkSectionDividers(slideSpecs);
  sectionChecks.forEach(c => { checks.push(c); if (!c.pass) warnings.push(c.message); });

  const closingChecks = checkClosingSlide(slideSpecs);
  closingChecks.forEach(c => { checks.push(c); if (!c.pass) warnings.push(c.message); });
  // Closing slide with no body is an info-level warning, not a failure
  if (closingChecks.length > 1 && !closingChecks[1].message.includes("has")) {
    warnings.push("Closing slide has no body content — consider adding summary or contact info");
  }

  const layoutCheck = checkLayoutDiversity(slideSpecs);
  checks.push(layoutCheck);
  if (!layoutCheck.pass) warnings.push(layoutCheck.message);

  // Count statuses
  let passCount = 0, failCount = 0, warnCount = 0;
  for (const c of checks) {
    if (c.pass) passCount++;
    else failCount++;
  }

  return { checks, warnings, passCount, failCount, warnCount };
}

/**
 * Calculate quality score from check counts.
 * Rule: fail each -20, warn each -5, floor at 0.
 */
function calculateQualityScore(passCount, failCount, warnCount) {
  let score = 100;
  score -= failCount * 20;
  score -= warnCount * 5;
  return Math.max(0, score);
}

/**
 * Build a quality-manifest.json object from pipeline result + check results.
 */
function buildManifest(inputPath, pipelineResult, checkResults, outputDir) {
  const ROOT = path.join(outputDir, "..", "..");
  const { checks, warnings, passCount, failCount, warnCount } = checkResults;
  const slideSpecs = pipelineResult.slideSpecs;

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    input: path.relative(ROOT, inputPath),
    pipeline: {
      format: "markdown",
      style: "minimal-modern",
      title: pipelineResult.deckPlan?.title || path.basename(inputPath, ".md"),
    },
    deck: {
      slideCount: slideSpecs.length,
      contentSlides: slideSpecs.filter((s) => ["content", "data-chart", "architecture", "process"].includes(s.role)).length,
      sectionDividers: slideSpecs.filter((s) => s.role === "section-divider").length,
      closingSlide: slideSpecs.some((s) => s.role === "closing"),
    },
    checks: checks.map((c) => ({ id: c.id, category: c.category, status: c.pass ? "pass" : "fail", message: c.message })),
    warnings: warnings.length > 0 ? warnings : undefined,
    summary: {
      passCount,
      failCount,
      warnCount,
      overallStatus: failCount === 0 ? "pass" : "fail",
      qualityScore: calculateQualityScore(passCount, failCount, warnCount),
    },
  };
}

/**
 * Write quality-manifest.json to the output directory.
 */
function writeManifest(manifest, outputDir) {
  const manifestPath = path.join(outputDir, "quality-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

/**
 * Write QA-SUMMARY.md to the output directory.
 */
function writeSummary(manifest, outputDir) {
  const lines = [
    "# Presentation Quality Summary", "",
    `**Input**: \`${manifest.input}\``,
    `**Generated**: ${new Date(manifest.generatedAt).toLocaleString()}`,
    `**Quality Score**: ${manifest.summary.qualityScore}/100 ${manifest.summary.qualityScore >= 80 ? "✅" : manifest.summary.qualityScore >= 50 ? "⚠️" : "❌"}`,
    "", "---", "",
    "## Deck Overview", "",
    `- **Slides**: ${manifest.deck.slideCount}`,
    `- **Content slides**: ${manifest.deck.contentSlides}`,
    `- **Section dividers**: ${manifest.deck.sectionDividers}`,
    `- **Closing slide**: ${manifest.deck.closingSlide ? "Yes" : "No"}`,
    "", "---", "",
    "## Results", "",
    "| Metric | Count |", "|--------|-------|",
    `| ✅ Passed | ${manifest.summary.passCount} |`,
    `| ❌ Failed | ${manifest.summary.failCount} |`,
    `| ⚠️ Warnings | ${manifest.summary.warnCount} |`,
    `| **Overall** | **${manifest.summary.overallStatus.toUpperCase()}** |`,
    "", "---", "",
    "## Checks", "",
    "| # | Category | Status | Detail |", "|---|----------|--------|--------|",
  ];

  manifest.checks.forEach((c, i) => {
    const icon = c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : "❌";
    lines.push(`| ${i + 1} | ${c.category} | ${icon} ${c.status.toUpperCase()} | ${c.message.replace(/\|/g, "\\|")} |`);
  });

  if (manifest.warnings && manifest.warnings.length > 0) {
    lines.push("", "---", "", "## Warnings", "");
    for (const w of manifest.warnings) lines.push(`- ⚠️ ${w}`);
  }

  lines.push("", "---", "", "*Generated by M12.14 Quality Manifest Checker*", "");
  const summaryPath = path.join(outputDir, "QA-SUMMARY.md");
  fs.writeFileSync(summaryPath, lines.join("\n"));
  return summaryPath;
}

module.exports = {
  runQualityChecks,
  calculateQualityScore,
  buildManifest,
  writeManifest,
  writeSummary,
};
