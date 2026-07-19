/**
 * Logo Safe Area Gate — M12.19
 *
 * Deterministic checker that validates logo bounding-box placement against
 * configurable safe-area margins on every slide that declares a logo.
 *
 * Verdict levels:
 *   PASS     — every declared logo sits fully inside its safe-area rectangle
 *   NEEDS_REVIEW — no logo found on slides that could carry one (enforcement
 *                  is impossible without concrete logo bounding-box data)
 *   FAIL     — at least one logo protrudes outside the safe-area margin
 *
 * Usage:
 *   const { checkLogoSafeArea } = require('./packages/logo-safe-area-gate/src/index.js');
 *   const result = checkLogoSafeArea(slideSpecs, layoutPlan, brandConfig);
 *   console.log(result.verdict); // "PASS" | "NEEDS_REVIEW" | "FAIL"
 */

"use strict";

// ─── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_SAFE_AREA = { top: 40, bottom: 40, left: 40, right: 40 }; // px from slide edge

// Slide dimensions used by pptxgenjs (standard 13.33 x 7.5 inches, 96 DPI → ~1279 x 720 px)
const SLIDE_WIDTH_PX = 1279;
const SLIDE_HEIGHT_PX = 720;

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Check whether a point (x, y) is inside the safe-area rectangle.
 * Safe area = [left, width-right] × [top, height-bottom].
 */
function insideSafeArea(x, y, w, h, margins, slideW, slideH) {
  const minX = margins.left;
  const maxX = slideW - margins.right - w;
  const minY = margins.top;
  const maxY = slideH - margins.bottom - h;
  return x >= minX && x + w <= maxX && y >= minY && y + h <= maxY;
}

/**
 * Extract logo bounding-box info from a SlideSpec.
 * Looks at designHints.logo.boundingBox (x, y, width, height in px) first,
 * then falls back to visualSpec.logo.position / size.
 */
function extractLogoBox(spec) {
  // Primary source: designHints.logo.boundingBox
  if (spec.designHints && spec.designHints.logo) {
    const lh = spec.designHints.logo;
    if (lh.boundingBox) {
      const b = lh.boundingBox;
      if (typeof b.x === "number" && typeof b.y === "number" &&
          typeof b.width === "number" && typeof b.height === "number") {
        return { x: b.x, y: b.y, width: b.width, height: b.height, source: "designHints" };
      }
    }
    // Fallback: absolute position + nominal size
    if (typeof lh.x === "number" && typeof lh.y === "number" &&
        typeof lh.width === "number" && typeof lh.height === "number") {
      return { x: lh.x, y: lh.y, width: lh.width, height: lh.height, source: "designHints" };
    }
  }

  // Secondary source: visualSpec.logo
  if (spec.visualSpec && spec.visualSpec.logo) {
    const vl = spec.visualSpec.logo;
    if (vl.boundingBox) {
      const b = vl.boundingBox;
      if (typeof b.x === "number" && typeof b.y === "number" &&
          typeof b.width === "number" && typeof b.height === "number") {
        return { x: b.x, y: b.y, width: b.width, height: b.height, source: "visualSpec" };
      }
    }
    if (typeof vl.x === "number" && typeof vl.y === "number" &&
        typeof vl.width === "number" && typeof vl.height === "number") {
      return { x: vl.x, y: vl.y, width: vl.width, height: vl.height, source: "visualSpec" };
    }
  }

  // Tertiary: just presence of a logo declaration without explicit box
  if (spec.designHints && spec.designHints.logo !== undefined) return { hasLogo: true };
  if (spec.visualSpec && spec.visualSpec.logo !== undefined) return { hasLogo: true };

  return null;
}

// ─── Core Checker ──────────────────────────────────────────────────────

/**
 * Check logo safe-area enforcement across all slide specs.
 *
 * @param {Array<Object>} slideSpecs — array of SlideSpec objects
 * @param {Object|null} layoutPlan — layout plan (used for slide dimensions override)
 * @param {Object} [brandConfig] — optional brand config overrides
 * @returns {Object} result with verdict, passCount, failCount, warnCount, results[], issues[]
 */
function checkLogoSafeArea(slideSpecs, layoutPlan, brandConfig = {}) {
  const margins = { ...DEFAULT_SAFE_AREA, ...brandConfig.logoSafeArea };
  const slideW = (layoutPlan && layoutPlan.slideWidth) || SLIDE_WIDTH_PX;
  const slideH = (layoutPlan && layoutPlan.slideHeight) || SLIDE_HEIGHT_PX;

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const results = [];
  const issues = [];

  let totalLogosChecked = 0;

  for (const spec of slideSpecs) {
    const box = extractLogoBox(spec);

    if (!box) continue; // no logo declaration on this slide

    if (box.hasLogo) {
      // Logo declared but no bounding box → cannot verify placement
      warnCount++;
      issues.push({
        slide: spec.index,
        category: "logo_no_bounding_box",
        severity: "warn",
        suggestion: `Slide ${spec.index} declares a logo but provides no bounding-box coordinates. Add designHints.logo.boundingBox {x, y, width, height} for safe-area verification.`,
      });
      results.push({
        slide: spec.index,
        status: "warn",
        message: "Logo declared but no bounding-box data",
      });
      continue;
    }

    totalLogosChecked++;

    if (insideSafeArea(box.x, box.y, box.width, box.height, margins, slideW, slideH)) {
      passCount++;
      results.push({
        slide: spec.index,
        status: "pass",
        message: `Logo within safe area (${box.x},${box.y} ${box.width}x${box.height})`,
        box,
        source: box.source,
      });
    } else {
      failCount++;
      // Determine which margins are violated
      const violations = [];
      const minX = margins.left;
      const maxX = slideW - margins.right - box.width;
      const minY = margins.top;
      const maxY = slideH - margins.bottom - box.height;

      if (box.x < minX) violations.push(`left margin (${minX}px)`);
      if (box.x + box.width > maxX) violations.push(`right margin (${slideW - margins.right}px)`);
      if (box.y < minY) violations.push(`top margin (${margins.top}px)`);
      if (box.y + box.height > maxY) violations.push(`bottom margin (${slideH - margins.bottom}px)`);

      issues.push({
        slide: spec.index,
        category: "logo_outside_safe_area",
        severity: "fail",
        box,
        violations,
        suggestion: `Logo on slide ${spec.index} protrudes outside safe area. Violated margins: ${violations.join(", ")}. Adjust position/size to fit within [${minX},${maxX}]×[${minY},${maxY}].`,
      });
      results.push({
        slide: spec.index,
        status: "fail",
        message: `Logo outside safe area — ${violations.join(", ")}`,
        box,
      });
    }
  }

  // If no logos were checked at all, we can't enforce anything → NEEDS_REVIEW
  let verdict;
  if (slideSpecs.length === 0) {
    verdict = "NEEDS_REVIEW";
    issues.push({
      category: "no_slides",
      severity: "info",
      suggestion: "No slides provided. Cannot perform logo safe-area enforcement on an empty deck.",
    });
  } else if (totalLogosChecked === 0) {
    verdict = "NEEDS_REVIEW";
    if (issues.length === 0) {
      issues.push({
        category: "no_logo_data",
        severity: "info",
        suggestion: "No slides declare logo bounding-box data. To enable logo safe-area enforcement, add designHints.logo.boundingBox to relevant SlideSpec entries.",
      });
    }
  } else if (failCount > 0) {
    verdict = "FAIL";
  } else if (warnCount > 0) {
    verdict = "NEEDS_REVIEW";
  } else {
    verdict = "PASS";
  }

  return {
    verdict,
    passCount,
    failCount,
    warnCount,
    totalLogosChecked,
    results,
    issues,
    margins,
    slideDimensions: { width: slideW, height: slideH },
  };
}

module.exports = {
  checkLogoSafeArea,
  DEFAULT_SAFE_AREA,
  SLIDE_WIDTH_PX,
  SLIDE_HEIGHT_PX,
};
