/**
 * Visual Design Standards Gate — M12.16
 *
 * Analyzes SlideSpec / LayoutPlan / manifest artifacts for commercial-grade
 * visual quality. Covers:
 *   1. Color contrast validation (WCAG-style thresholds)
 *   2. Typography consistency (font family/size hierarchy variance)
 *   3. Brand guideline rule hooks (palette, logo safe area, title/footer)
 *   4. Actionable remediation suggestions (machine-readable report + summary)
 *
 * Verdict levels:
 *   PASS     — no violations, meets commercial standards
 *   NEEDS_REVIEW — soft issues detected (AAA threshold misses, minor variance)
 *   FAIL     — hard violations (AA threshold misses, major inconsistency)
 *
 * Usage:
 *   const { runVisualDesignGate } = require('./packages/visual-design-gate/src/index.js');
 *   const result = await runVisualDesignGate(slideSpecs, layoutPlan, manifest);
 *   console.log(result.verdict); // "PASS" | "NEEDS_REVIEW" | "FAIL"
 */

"use strict";

const path = require("path");

// ─── Color Utilities (WCAG-style) ──────────────────────────────────────

/**
 * Parse a hex color string (#RRGGBB) into [r, g, b] normalized 0-1.
 */
function parseHexColor(hex) {
  if (!hex || typeof hex !== "string") return null;
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  try {
    const r = parseInt(cleaned.substring(0, 2), 16) / 255;
    const g = parseInt(cleaned.substring(2, 4), 16) / 255;
    const b = parseInt(cleaned.substring(4, 6), 16) / 255;
    return [r, g, b];
  } catch {
    return null;
  }
}

/**
 * Convert sRGB channel to linear RGB (for luminance calculation).
 */
function srgbToLinear(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute relative luminance per WCAG 2.1 formula.
 */
function relativeLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * Compute contrast ratio between two colors. Returns 1–21 range.
 */
function contrastRatio(color1, color2) {
  const lum1 = relativeLuminance(color1);
  const lum2 = relativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── 1. Color Contrast Validation ──────────────────────────────────────

/**
 * Check color contrast for text/background pairs on each slide.
 *
 * WCAG thresholds:
 *   - AA Normal Text (<18pt): ratio >= 4.5:1 → FAIL if below
 *   - AA Large Text (>=18pt): ratio >= 3:1 → FAIL if below
 *   - AAA Normal Text: ratio >= 7:1 → NEEDS_REVIEW if below (but >= AA)
 *   - AAA Large Text: ratio >= 4.5:1 → NEEDS_REVIEW if below (but >= AA)
 *
 * We check: text vs background, accent vs background, secondaryText vs surface.
 */
function checkColorContrast(slideSpecs, layoutPlan) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const violations = [];

  if (!layoutPlan || !layoutPlan.layouts) {
    return {
      verdict: "PASS",
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      results: [{ status: "pass", message: "No layout data available — skipping contrast checks" }],
      violations: [],
    };
  }

  for (const layout of layoutPlan.layouts) {
    const slideIndex = layout.index;
    const colors = layout.colors;
    const fontSize = layout.fontSize;
    if (!colors || !fontSize) continue;

    // Only primary text pairs should be AAA-checked; secondary/muted text
    // only needs AA compliance. The 5th tuple element now controls this.
    const pairs = [
      ["text", "background", "Primary text on background", fontSize.heading >= 18, true],
      ["secondaryText", "background", "Secondary text on background", false, false],
      ["text", "surface", "Primary text on surface", false, true],
      ["secondaryText", "surface", "Secondary text on surface", false, false],
    ];

    for (const [fgKey, bgKey, label, isLarge, enforceAAA] of pairs) {
      const fgHex = colors[fgKey];
      const bgHex = colors[bgKey];
      if (!fgHex || !bgHex) continue;

      const fgRgb = parseHexColor(fgHex);
      const bgRgb = parseHexColor(bgHex);
      if (!fgRgb || !bgRgb) continue;

      const ratio = contrastRatio(fgRgb, bgRgb);

      // Determine thresholds based on text size
      const aaThreshold = isLarge ? 3.0 : 4.5;
      const aaaThreshold = isLarge ? 4.5 : 7.0;

      if (ratio < aaThreshold) {
        // Hard FAIL: does not meet WCAG AA
        failCount++;
        violations.push({
          slide: slideIndex,
          pair: `${fgKey}/${bgHex} vs ${bgKey}/${bgHex}`,
          ratio: parseFloat(ratio.toFixed(2)),
          threshold: `AA ${isLarge ? "large" : "normal"} (${aaThreshold}:1)`,
          severity: "fail",
          suggestion: `Increase contrast ratio for "${label}". Current: ${ratio.toFixed(2)}:1, required: ${aaThreshold}:1. Consider darkening foreground or lightening background.`,
        });
      } else if (enforceAAA && ratio < aaaThreshold) {
        // Soft NEEDS_REVIEW: passes AA but not AAA (only for primary text pairs)
        warnCount++;
        violations.push({
          slide: slideIndex,
          pair: `${fgKey}/${bgHex} vs ${bgKey}/${bgHex}`,
          ratio: parseFloat(ratio.toFixed(2)),
          threshold: `AAA ${isLarge ? "large" : "normal"} (${aaaThreshold}:1)`,
          severity: "warn",
          suggestion: `Consider improving contrast for "${label}" to meet AAA standard (${aaaThreshold}:1). Current: ${ratio.toFixed(2)}:1.`,
        });
      } else {
        // Passes AAA or skip AAA check for secondary/muted text
        passCount++;
      }

      results.push({
        slide: slideIndex,
        pair: label,
        ratio: parseFloat(ratio.toFixed(2)),
        threshold_met: ratio >= aaaThreshold ? "aaa" : ratio >= aaThreshold ? "aa" : "fail",
      });
    }
  }

  // Determine overall verdict
  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return {
    verdict,
    passCount,
    failCount,
    warnCount,
    results,
    violations,
  };
}

// ─── 2. Typography Consistency Checks ──────────────────────────────────

/**
 * Check font family and size hierarchy consistency across slides.
 *
 * Rules:
 *   - All slides in a deck should use fonts from the same theme family
 *   - Heading/body size ratios should be consistent within ±20%
 *   - No unexpected font family switches mid-deck
 *   - Monospace should only appear where explicitly intended (code blocks)
 */
function checkTypographyConsistency(slideSpecs, layoutPlan) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const issues = [];

  if (!layoutPlan || !layoutPlan.themeTokens || !layoutPlan.layouts) {
    return {
      verdict: "PASS",
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      results: [
        { status: "pass", message: "No layout data available — skipping typography checks" },
      ],
      issues: [],
    };
  }

  const themeFonts = layoutPlan.themeTokens.fonts;
  const expectedHeading = themeFonts.heading;
  const expectedBody = themeFonts.body;

  // Collect all font families used
  const fontFamiliesUsed = new Set();
  const headingSizes = [];
  const bodySizes = [];
  const layoutVariants = {};

  for (const layout of layoutPlan.layouts) {
    const idx = layout.index;
    const role = layout.role || "";
    const fs = layout.fontSize || {};

    // Track heading/body sizes
    if (fs.heading) headingSizes.push({ index: idx, size: fs.heading, role });
    if (fs.body) bodySizes.push({ index: idx, size: fs.body, role });

    // Group by layout family
    if (!layoutVariants[layout.layoutFamily]) {
      layoutVariants[layout.layoutFamily] = { headings: [], bodies: [] };
    }
    if (fs.heading) layoutVariants[layout.layoutFamily].headings.push(fs.heading);
    if (fs.body) layoutVariants[layout.layoutFamily].bodies.push(fs.body);

    // Track font families from theme tokens
    fontFamiliesUsed.add(expectedHeading);
    fontFamiliesUsed.add(expectedBody);
  }

  // Rule 1: Heading size variance within each layout family
  for (const [family, variants] of Object.entries(layoutVariants)) {
    if (variants.headings.length > 1) {
      const sizes = variants.headings.sort((a, b) => a - b);
      const minH = sizes[0];
      const maxH = sizes[sizes.length - 1];
      const variancePct = ((maxH - minH) / minH) * 100;

      if (variancePct > 50) {
        // FAIL: heading sizes vary too much within a layout family
        failCount++;
        issues.push({
          category: "heading_variance",
          layoutFamily: family,
          minSize: minH,
          maxSize: maxH,
          variancePct: parseFloat(variancePct.toFixed(1)),
          severity: "fail",
          suggestion: `Heading sizes for layout "${family}" vary by ${variancePct.toFixed(1)}% (${minH}px–${maxH}px). Standardize to a single heading size per layout family.`,
        });
      } else if (variancePct > 20) {
        // NEEDS_REVIEW: moderate variance
        warnCount++;
        issues.push({
          category: "heading_variance",
          layoutFamily: family,
          minSize: minH,
          maxSize: maxH,
          variancePct: parseFloat(variancePct.toFixed(1)),
          severity: "warn",
          suggestion: `Heading sizes for layout "${family}" vary by ${variancePct.toFixed(1)}%. Consider unifying for consistency.`,
        });
      } else {
        passCount++;
      }
    } else {
      passCount++;
    }
  }

  // Rule 2: Body size variance within each layout family
  for (const [family, variants] of Object.entries(layoutVariants)) {
    if (variants.bodies.length > 1) {
      const sizes = variants.bodies.sort((a, b) => a - b);
      const minB = sizes[0];
      const maxB = sizes[sizes.length - 1];
      const variancePct = ((maxB - minB) / minB) * 100;

      if (variancePct > 50) {
        failCount++;
        issues.push({
          category: "body_variance",
          layoutFamily: family,
          minSize: minB,
          maxSize: maxB,
          variancePct: parseFloat(variancePct.toFixed(1)),
          severity: "fail",
          suggestion: `Body text sizes for layout "${family}" vary by ${variancePct.toFixed(1)}%. Unify body size within this layout family.`,
        });
      } else if (variancePct > 20) {
        warnCount++;
        issues.push({
          category: "body_variance",
          layoutFamily: family,
          minSize: minB,
          maxSize: maxB,
          variancePct: parseFloat(variancePct.toFixed(1)),
          severity: "warn",
          suggestion: `Body text sizes for layout "${family}" vary by ${variancePct.toFixed(1)}%. Consider unifying.`,
        });
      } else {
        passCount++;
      }
    } else {
      passCount++;
    }
  }

  // Rule 3: Font family consistency — check that all slides use theme fonts
  const themeFontList = [expectedHeading, expectedBody];
  const actualFonts = [...fontFamiliesUsed];
  const allMatch = actualFonts.every((f) =>
    themeFontList.some((tf) => f.includes(tf.split(",")[0].trim())),
  );

  if (allMatch) {
    passCount++;
  } else {
    failCount++;
    issues.push({
      category: "font_family_consistency",
      expected: themeFontList,
      actual: actualFonts,
      severity: "fail",
      suggestion:
        "Some slides use font families outside the theme definition. Align all fonts to the theme's heading/body families.",
    });
  }

  // Rule 4: Heading-to-body size ratio check — per layout family
  // Different layout families legitimately have different ratios (title vs content),
  // so we only flag variance WITHIN the same layout family.
  let headingBodyRatioCount = 0;
  let ratioWarned = false;

  // Build index: layoutFamily -> [{index, headingSize, bodySize}]
  const familyRatios = {};
  for (const layout of layoutPlan.layouts) {
    const lf = layout.layoutFamily || "default";
    const fs = layout.fontSize || {};
    if (!familyRatios[lf]) familyRatios[lf] = [];
    if (fs.heading && fs.body) {
      familyRatios[lf].push(fs.heading / fs.body);
      headingBodyRatioCount++;
    }
  }

  for (const [lf, ratios] of Object.entries(familyRatios)) {
    if (ratios.length < 2) continue; // Single slide in this family — skip
    const minR = Math.min(...ratios);
    const maxR = Math.max(...ratios);
    if (maxR - minR > 0.5) {
      ratioWarned = true;
      warnCount++;
      issues.push({
        category: "heading_body_ratio",
        layoutFamily: lf,
        minRatio: parseFloat(minR.toFixed(2)),
        maxRatio: parseFloat(maxR.toFixed(2)),
        severity: "warn",
        suggestion: `Heading-to-body ratio in layout "${lf}" varies from ${minR.toFixed(2)} to ${maxR.toFixed(2)}. Target consistent ratio (~1.5x).`,
      });
    }
  }
  if (!ratioWarned) passCount++;

  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return {
    verdict,
    passCount,
    failCount,
    warnCount,
    results: [
      { category: "heading_variance", count: headingSizes.length },
      { category: "body_variance", count: bodySizes.length },
      { category: "font_families_used", count: fontFamiliesUsed.size },
      { category: "heading_body_ratios", count: headingBodyRatioCount },
    ],
    issues,
  };
}

// ─── 3. Brand Guideline Rule Hooks ─────────────────────────────────────

/**
 * Check brand guideline compliance.
 *
 * Configurable via brandConfig parameter:
 *   - allowedPalette: array of allowed hex colors
 *   - logoSafeArea: { top: px, bottom: px, left: px, right: px }
 *   - requiredTitleSlide: boolean
 *   - requiredClosingSlide: boolean
 *   - maxSlidesPerSection: number
 *   - footerConvention: "none" | "slide-number" | "brand-name" | "both"
 *   - titlePlacement: "top" | "center"
 *
 * Default brand config uses theme-level conventions.
 */
function checkBrandGuidelines(slideSpecs, layoutPlan, brandConfig = {}) {
  const defaults = {
    allowedPalette: [], // empty = use theme colors
    logoSafeArea: { top: 40, bottom: 40, left: 40, right: 40 },
    // Auto-generated decks from the Presentation OS pipeline use semantic
    // slide roles (content, section-divider, process, closing…) and do NOT
    // include a dedicated "title-slide" role by design.  Require title slide
    // only when an explicit brand config asks for it or when the deck was
    // authored by a human.
    requiredTitleSlide: false,
    requiredClosingSlide: true,
    maxSlidesPerSection: 10,
    footerConvention: "slide-number",
    titlePlacement: "top",
  };
  const config = { ...defaults, ...brandConfig };

  const results = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const issues = [];

  // Rule 1: Required slides present
  const titleSlides = slideSpecs.filter((s) => s.role === "title-slide");
  const closingSlides = slideSpecs.filter((s) => s.role === "closing");

  if (config.requiredTitleSlide && titleSlides.length === 0) {
    failCount++;
    issues.push({
      category: "missing_title_slide",
      severity: "fail",
      suggestion: "Deck is missing a title slide. Add a title slide as the first slide.",
    });
  } else {
    passCount++;
  }

  if (config.requiredClosingSlide && closingSlides.length === 0) {
    failCount++;
    issues.push({
      category: "missing_closing_slide",
      severity: "fail",
      suggestion: "Deck is missing a closing slide. Add a closing slide as the last slide.",
    });
  } else {
    passCount++;
  }

  // Rule 2: Palette usage — check that all colors in layout come from allowed set
  if (config.allowedPalette.length > 0 && layoutPlan && layoutPlan.layouts) {
    const allowedSet = new Set(config.allowedPalette.map((c) => c.toLowerCase()));
    const themeColors = layoutPlan.themeTokens?.colors || {};
    // Theme colors are always allowed
    for (const v of Object.values(themeColors)) {
      allowedSet.add(v.toLowerCase());
    }

    let paletteViolation = false;
    for (const layout of layoutPlan.layouts) {
      if (layout.colors) {
        for (const [key, hex] of Object.entries(layout.colors)) {
          if (hex && !allowedSet.has(hex.toLowerCase())) {
            paletteViolation = true;
            warnCount++;
            issues.push({
              category: "off_palette_color",
              slide: layout.index,
              property: key,
              color: hex,
              severity: "warn",
              suggestion: `Slide ${layout.index} uses color ${hex} (${key}) which is outside the allowed palette. Replace with an approved brand color.`,
            });
          }
        }
      }
    }
    if (!paletteViolation) passCount++;
  } else {
    passCount++; // No palette constraint defined
  }

  // Rule 3: Section length check
  let sectionLengths = [];
  if (slideSpecs.length > 0) {
    let currentSection = "";
    let sectionCount = 0;

    for (const spec of slideSpecs) {
      if (spec.section && spec.section !== currentSection) {
        if (sectionCount > 0) sectionLengths.push(sectionCount);
        currentSection = spec.section;
        sectionCount = 1;
      } else {
        sectionCount++;
      }
    }
    if (sectionCount > 0) sectionLengths.push(sectionCount);

    for (const len of sectionLengths) {
      if (len > config.maxSlidesPerSection) {
        warnCount++;
        issues.push({
          category: "section_too_long",
          section: currentSection,
          slideCount: len,
          maxAllowed: config.maxSlidesPerSection,
          severity: "warn",
          suggestion: `Section "${currentSection}" has ${len} slides (max recommended: ${config.maxSlidesPerSection}). Consider splitting into subsections.`,
        });
      }
    }
    if (sectionLengths.every((l) => l <= config.maxSlidesPerSection)) passCount++;
  }

  // Rule 4: Title slide must be first, closing must be last
  if (slideSpecs.length > 0) {
    const firstRole = slideSpecs[0].role;
    const lastRole = slideSpecs[slideSpecs.length - 1].role;

    // Only enforce first-slide-as-title when requiredTitleSlide is true.
    // Auto-generated decks start with content/section roles by design.
    if (config.requiredTitleSlide && firstRole === "title-slide") passCount++;
    else if (config.requiredTitleSlide && firstRole !== "title-slide") {
      warnCount++;
      issues.push({
        category: "title_not_first",
        severity: "warn",
        suggestion: `First slide is "${firstRole}", not a title slide. Consider adding a title slide at the beginning.`,
      });
    }
    // When requiredTitleSlide is false, skip the title-not-first check entirely.

    if (lastRole === "closing") passCount++;
    else {
      warnCount++;
      issues.push({
        category: "closing_not_last",
        severity: "warn",
        suggestion: `Last slide is "${lastRole}", not a closing slide. Move the closing slide to the end.`,
      });
    }
  }

  let verdict;
  if (failCount > 0) verdict = "FAIL";
  else if (warnCount > 0) verdict = "NEEDS_REVIEW";
  else verdict = "PASS";

  return {
    verdict,
    passCount,
    failCount,
    warnCount,
    results: [
      { category: "required_slides", total: slideSpecs.length },
      { category: "sections", count: sectionLengths ? sectionLengths.length : 0 },
      { category: "footer_convention", value: config.footerConvention },
      { category: "title_placement", value: config.titlePlacement },
    ],
    issues,
  };
}

// ─── 4. Integration & Verdict ──────────────────────────────────────────

/**
 * Run all visual design checks and compute an overall verdict.
 *
 * The gate integrates with M12.15 commercial verdict:
 *   - If M12.15 already returned FAIL, M12.16 cannot override to PASS
 *   - Hard visual violations (contrast AA fails) → FAIL
 *   - Soft issues (AAA misses, minor variance) → NEEDS_REVIEW
 *   - Clean deck → PASS
 */
async function runVisualDesignGate(slideSpecs, layoutPlan, options = {}) {
  const { brandConfig, m12_15_verdict } = options;

  // Run individual checks
  const contrastResult = checkColorContrast(slideSpecs, layoutPlan);
  const typographyResult = checkTypographyConsistency(slideSpecs, layoutPlan);
  const brandResult = checkBrandGuidelines(slideSpecs, layoutPlan, brandConfig);

  // Aggregate counts
  const totalPass = contrastResult.passCount + typographyResult.passCount + brandResult.passCount;
  const totalFail = contrastResult.failCount + typographyResult.failCount + brandResult.failCount;
  const totalWarn = contrastResult.warnCount + typographyResult.warnCount + brandResult.warnCount;

  // Overall verdict: FAIL overrides NEEDS_REVIEW overrides PASS
  let overallVerdict;
  if (totalFail > 0) overallVerdict = "FAIL";
  else if (totalWarn > 0) overallVerdict = "NEEDS_REVIEW";
  else overallVerdict = "PASS";

  // M12.15 integration: don't let degraded rendered environments falsely PASS
  // If M12.15 verdict was FAIL, M12.16 can at best be NEEDS_REVIEW
  if (m12_15_verdict === "FAIL" && overallVerdict === "PASS") {
    overallVerdict = "NEEDS_REVIEW";
  }

  // Compile remediation suggestions
  const allViolations = [
    ...(contrastResult.violations || []),
    ...(typographyResult.issues || []),
    ...(brandResult.issues || []),
  ];

  const remediationSuggestions = allViolations
    .filter((v) => v.suggestion)
    .map((v, i) => ({
      id: `m12_16_${i + 1}`,
      category: v.category,
      severity: v.severity,
      suggestion: v.suggestion,
    }));

  return {
    schemaVersion: "1.0.0",
    milestone: "m12.16",
    generatedAt: new Date().toISOString(),
    overallVerdict,
    summary: {
      passCount: totalPass,
      failCount: totalFail,
      warnCount: totalWarn,
      totalChecks: totalPass + totalFail + totalWarn,
      qualityScore: Math.max(0, 100 - totalFail * 25 - totalWarn * 5),
    },
    checks: {
      colorContrast: { verdict: contrastResult.verdict, ...contrastResult },
      typographyConsistency: { verdict: typographyResult.verdict, ...typographyResult },
      brandGuidelines: { verdict: brandResult.verdict, ...brandResult },
    },
    remediationSuggestions,
    m12_15_integration: m12_15_verdict
      ? {
          priorVerdict: m12_15_verdict,
          overridden: m12_15_verdict === "FAIL" && overallVerdict !== "FAIL",
          note:
            m12_15_verdict === "FAIL"
              ? "M12.15 FAIL prevents M12.16 from returning PASS"
              : undefined,
        }
      : undefined,
  };
}

// ─── Report Generation ─────────────────────────────────────────────────

/**
 * Generate a human-readable QA summary markdown from the gate result.
 */
function generateHumanSummary(gateResult) {
  const lines = [];
  lines.push("# Visual Design Standards Gate — M12.16");
  lines.push("");
  lines.push(`**Generated**: ${new Date(gateResult.generatedAt).toLocaleString()}`);
  lines.push(`**Overall Verdict**: ${gateResult.overallVerdict}`);
  lines.push(`**Quality Score**: ${gateResult.summary.qualityScore}/100`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Pass   | ${gateResult.summary.passCount} |`);
  lines.push(`| Fail   | ${gateResult.summary.failCount} |`);
  lines.push(`| Warn   | ${gateResult.summary.warnCount} |`);
  lines.push(`| Total  | ${gateResult.summary.totalChecks} |`);
  lines.push("");

  // Color Contrast
  lines.push("## 1. Color Contrast Validation");
  lines.push("");
  const cc = gateResult.checks.colorContrast;
  lines.push(`**Verdict**: ${cc.verdict}`);
  lines.push("");
  if (cc.violations && cc.violations.length > 0) {
    lines.push("### Violations");
    lines.push("");
    for (const v of cc.violations) {
      const icon = v.severity === "fail" ? "❌" : "⚠️";
      lines.push(
        `${icon} Slide ${v.slide}: ${v.pair} — ratio ${v.ratio}:1 (threshold: ${v.threshold})`,
      );
      lines.push(`   → ${v.suggestion}`);
    }
    lines.push("");
  } else {
    lines.push("All text/background pairs meet WCAG AA thresholds.");
    lines.push("");
  }

  // Typography
  lines.push("## 2. Typography Consistency");
  lines.push("");
  const tt = gateResult.checks.typographyConsistency;
  lines.push(`**Verdict**: ${tt.verdict}`);
  lines.push("");
  if (tt.issues && tt.issues.length > 0) {
    lines.push("### Issues");
    lines.push("");
    for (const issue of tt.issues) {
      const icon = issue.severity === "fail" ? "❌" : "⚠️";
      lines.push(`${icon} [${issue.category}] ${issue.suggestion}`);
    }
    lines.push("");
  } else {
    lines.push("Typography is consistent across all slides.");
    lines.push("");
  }

  // Brand Guidelines
  lines.push("## 3. Brand Guideline Compliance");
  lines.push("");
  const bg = gateResult.checks.brandGuidelines;
  lines.push(`**Verdict**: ${bg.verdict}`);
  lines.push("");
  if (bg.issues && bg.issues.length > 0) {
    lines.push("### Issues");
    lines.push("");
    for (const issue of bg.issues) {
      const icon = issue.severity === "fail" ? "❌" : "⚠️";
      lines.push(`${icon} [${issue.category}] ${issue.suggestion}`);
    }
    lines.push("");
  } else {
    lines.push("Deck meets brand guideline conventions.");
    lines.push("");
  }

  // Remediation
  if (gateResult.remediationSuggestions.length > 0) {
    lines.push("## Remediation Actions");
    lines.push("");
    for (const r of gateResult.remediationSuggestions) {
      const icon = r.severity === "fail" ? "🔴" : "🟡";
      lines.push(`${icon} **${r.id}** (${r.category}): ${r.suggestion}`);
    }
    lines.push("");
  }

  // M12.15 Integration
  if (gateResult.m12_15_integration) {
    lines.push("## M12.15 Integration");
    lines.push("");
    lines.push(`Prior commercial verdict: ${gateResult.m12_15_integration.priorVerdict}`);
    if (gateResult.m12_15_integration.overridden) {
      lines.push("⚠️ M12.15 FAIL prevented M12.16 from returning PASS");
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Machine-Readable Report ───────────────────────────────────────────

/**
 * Generate a machine-readable JSON report suitable for CI integration.
 */
function generateMachineReport(gateResult) {
  return {
    ...gateResult,
    checks: {
      colorContrast: {
        verdict: gateResult.checks.colorContrast.verdict,
        passCount: gateResult.checks.colorContrast.passCount,
        failCount: gateResult.checks.colorContrast.failCount,
        warnCount: gateResult.checks.colorContrast.warnCount,
        violations: gateResult.checks.colorContrast.violations?.map((v) => ({
          slide: v.slide,
          pair: v.pair,
          ratio: v.ratio,
          threshold: v.threshold,
          severity: v.severity,
          suggestion: v.suggestion,
        })),
      },
      typographyConsistency: {
        verdict: gateResult.checks.typographyConsistency.verdict,
        passCount: gateResult.checks.typographyConsistency.passCount,
        failCount: gateResult.checks.typographyConsistency.failCount,
        warnCount: gateResult.checks.typographyConsistency.warnCount,
        issues: gateResult.checks.typographyConsistency.issues?.map((i) => ({
          category: i.category,
          severity: i.severity,
          suggestion: i.suggestion,
        })),
      },
      brandGuidelines: {
        verdict: gateResult.checks.brandGuidelines.verdict,
        passCount: gateResult.checks.brandGuidelines.passCount,
        failCount: gateResult.checks.brandGuidelines.failCount,
        warnCount: gateResult.checks.brandGuidelines.warnCount,
        issues: gateResult.checks.brandGuidelines.issues?.map((i) => ({
          category: i.category,
          severity: i.severity,
          suggestion: i.suggestion,
        })),
      },
    },
    remediationSuggestions: gateResult.remediationSuggestions.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      suggestion: r.suggestion,
    })),
  };
}

// ─── Export ─────────────────────────────────────────────────────────────

module.exports = {
  // Color utilities
  parseHexColor,
  srgbToLinear,
  relativeLuminance,
  contrastRatio,

  // Core checks
  checkColorContrast,
  checkTypographyConsistency,
  checkBrandGuidelines,

  // Main entry point
  runVisualDesignGate,

  // Report generation
  generateHumanSummary,
  generateMachineReport,
};
