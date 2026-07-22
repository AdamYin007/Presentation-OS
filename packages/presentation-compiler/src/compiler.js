/**
 * @awe/presentation-compiler — Core Compiler Engine (M12.24)
 *
 * Global optimization layer that sits between Layout/Theme engines and the Renderer.
 * Does NOT draw slides — generates an optimized Render Plan.
 *
 * Pipeline stages:
 *   1. Input Analyzer — scan all slides, count types, measure content density
 *   2. Constraint Solver — resolve layout vs. content conflicts
 *   3. Overflow Detector — find slides exceeding canvas bounds
 *   4. Pagination Manager — split oversized content across slides
 *   5. Theme Resolver — ensure theme token consistency
 *   6. Resource Optimizer — deduplicate repeated visual elements
 *   7. Render Plan Generator — produce final Render Plan for the Renderer
 */

"use strict";

const {
  COMPILER_MODES,
  DEFAULT_MODE,
  MAX_BULLETS_PER_SLIDE,
  MAX_CHARACTERS_PER_BODY,
  MAX_HEADING_LENGTH,
  COMPILER_ERRORS,
  resourceKey,
} = require("./schema.js");

// ── Stage 1: Input Analyzer ──────────────────────────────────────

/**
 * Analyze slide specs input: count types, measure content density, identify visual elements.
 * @param {Array<Object>} slideSpecs - Array of SlideSpec objects
 * @param {Object|null} layoutPlan - LayoutPlan from theme-layout engine
 * @returns {Object} Analysis result with typeCounts, totalBullets, totalChars, slidesWithCharts
 */
function analyzeInput(slideSpecs, layoutPlan) {
  const typeCounts = {};
  let totalBullets = 0;
  let totalChars = 0;
  const slidesWithCharts = [];
  const slidesWithProcess = [];

  for (const spec of slideSpecs) {
    const role = spec.role || "content";
    typeCounts[role] = (typeCounts[role] || 0) + 1;

    const bodyItems = Array.isArray(spec.body) ? spec.body : [];
    totalBullets += bodyItems.length;
    for (const item of bodyItems) {
      totalChars += typeof item === "string" ? item.length : String(item).length;
    }

    if (spec.visualType === "bar-chart" || spec.visualType === "line-chart") {
      slidesWithCharts.push(spec.index || 0);
    }
    if (spec.visualType === "process" || spec.visualType === "timeline") {
      slidesWithProcess.push(spec.index || 0);
    }
  }

  return {
    totalSlides: slideSpecs.length,
    totalBullets,
    totalChars,
    avgBulletsPerSlide: slideSpecs.length > 0 ? (totalBullets / slideSpecs.length).toFixed(1) : 0,
    typeDistribution: typeCounts,
    slidesWithCharts,
    slidesWithProcess,
    estimatedDuration: Math.round(slideSpecs.length * 1.5), // ~1.5 min per slide
  };
}

// ── Stage 2: Constraint Solver ───────────────────────────────────

/**
 * Resolve layout vs content conflicts by adjusting density and issuing warnings.
 * @param {Array<Object>} slideSpecs - Array of SlideSpec objects
 * @param {Object|null} layoutPlan - LayoutPlan with layouts array
 * @param {string} mode - Compiler mode (fast/standard/optimized)
 * @returns {{ warnings: Array, resolvedLayouts: Map }}
 */
function solveConstraints(slideSpecs, layoutPlan, mode) {
  const warnings = [];
  const resolvedLayouts = new Map();

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan?.layouts?.find((l) => l.slideId === spec.id);

    if (!layout) {
      warnings.push({
        type: COMPILER_ERRORS.CONSTRAINT_CONFLICT,
        slide: spec.index || i + 1,
        message: `No layout found for slide ${spec.title || "unnamed"} — using defaults`,
        severity: "warn",
      });
      continue;
    }

    // Check: bullet count vs. layout capacity
    const bodyItems = Array.isArray(spec.body) ? spec.body : [];
    if (bodyItems.length > MAX_BULLETS_PER_SLIDE) {
      warnings.push({
        type: COMPILER_ERRORS.OVERFLOW,
        slide: spec.index || i + 1,
        message: `Slide "${spec.title}" has ${bodyItems.length} bullets (max ${MAX_BULLETS_PER_SLIDE})`,
        severity: "overflow",
      });
    }

    // Check: heading length
    if (spec.title && spec.title.length > MAX_HEADING_LENGTH) {
      warnings.push({
        type: COMPILER_ERRORS.CONSTRAINT_CONFLICT,
        slide: spec.index || i + 1,
        message: `Slide title "${spec.title.slice(0, 30)}..." exceeds ${MAX_HEADING_LENGTH} chars`,
        severity: "warn",
      });
    }

    // Check: total body characters
    let bodyCharCount = 0;
    for (const item of bodyItems) {
      bodyCharCount += typeof item === "string" ? item.length : String(item).length;
    }
    if (bodyCharCount > MAX_CHARACTERS_PER_BODY && mode !== COMPILER_MODES.FAST) {
      warnings.push({
        type: COMPILER_ERRORS.OVERFLOW,
        slide: spec.index || i + 1,
        message: `Slide "${spec.title}" body text (${bodyCharCount} chars) may overflow canvas`,
        severity: "overflow",
      });
    }

    // Resolve: if content density is high, switch to denser layout family
    if (bodyItems.length > 4 && layout.density === "sparse") {
      layout.density = "medium";
      warnings.push({
        type: "auto-adjust",
        slide: spec.index || i + 1,
        message: `Auto-adjusted density from sparse → medium for "${spec.title}"`,
        severity: "info",
      });
    }

    resolvedLayouts.set(spec.id, layout);
  }

  return { resolvedLayouts, warnings };
}

// ── Stage 3: Overflow Detector ───────────────────────────────────

function detectOverflow(slideSpecs, layoutPlan) {
  const overflowReport = [];

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan?.layouts?.find((l) => l.slideId === spec.id);
    if (!layout) continue;

    const bodyItems = Array.isArray(spec.body) ? spec.body : [];
    const issues = [];

    // Bullet overflow
    if (bodyItems.length > MAX_BULLETS_PER_SLIDE) {
      issues.push({
        type: "bullet-overload",
        count: bodyItems.length,
        max: MAX_BULLETS_PER_SLIDE,
      });
    }

    // Text overflow estimation
    let totalTextLen = 0;
    for (const item of bodyItems) {
      totalTextLen += typeof item === "string" ? item.length : String(item).length;
    }
    const maxWidth = layout.maxWidth || 800;
    const maxHeight = layout.spacing ? 5.5 : 5.0; // approximate usable height in inches
    const charsPerInch = 12; // rough estimate for 14pt body text
    const maxChars = Math.floor(maxHeight * charsPerInch * (maxWidth / 800));

    if (totalTextLen > maxChars * 1.2 && layout.density !== "dense") {
      issues.push({
        type: "text-overflow",
        charCount: totalTextLen,
        estimatedCapacity: maxChars,
      });
    }

    // Visual element overflow for charts/diagrams
    if (["bar-chart", "line-chart"].includes(spec.visualType)) {
      const series = spec.visualSpec?.series || [];
      if (series.length > 0) {
        const dataPoints = series.reduce(
          (sum, s) => sum + (s.values?.length || s.points?.length || 0),
          0,
        );
        if (dataPoints > 20) {
          issues.push({
            type: "chart-overload",
            dataPoints,
            maxRecommended: 20,
          });
        }
      }
    }

    if (issues.length > 0) {
      overflowReport.push({
        slideIndex: spec.index || i + 1,
        title: spec.title || "Untitled",
        role: spec.role,
        issues,
      });
    }
  }

  return overflowReport;
}

// ── Stage 4: Pagination Manager ──────────────────────────────────

function paginateContent(slideSpecs, overflowReport) {
  const paginationDecisions = [];

  if (overflowReport.length === 0) return paginationDecisions;

  for (const overflow of overflowReport) {
    const spec = slideSpecs.find((s) => s.index === overflow.slideIndex);
    if (!spec) continue;

    const bodyItems = Array.isArray(spec.body) ? [...spec.body] : [];

    // For bullet overload: split into chunks
    if (bodyItems.length > MAX_BULLETS_PER_SLIDE) {
      const chunkSize = MAX_BULLETS_PER_SLIDE;
      const chunks = [];
      for (let i = 0; i < bodyItems.length; i += chunkSize) {
        chunks.push(bodyItems.slice(i, i + chunkSize));
      }

      if (chunks.length > 1) {
        paginationDecisions.push({
          originalSlide: spec.index || 0,
          originalTitle: spec.title,
          originalRole: spec.role,
          splitCount: chunks.length,
          pages: chunks.map((chunk, idx) => ({
            pageNum: idx + 1,
            totalPages: chunks.length,
            title: idx === 0 ? spec.title : `${spec.title} (continued)`,
            bodyItems: chunk,
            indicator: idx > 0 ? "continued..." : null,
          })),
        });
      }
    }
  }

  return paginationDecisions;
}

// ── Stage 5: Theme Resolver ──────────────────────────────────────

function resolveThemes(layoutPlan, slideSpecs) {
  if (!layoutPlan || !layoutPlan.themeTokens) {
    return { resolved: true, warnings: [] };
  }

  const warnings = [];
  const fontMap = {};

  // Extract font families from theme tokens
  const fonts = layoutPlan.themeTokens.fonts || {};
  fontMap.heading = fonts.heading || "Arial";
  fontMap.body = fonts.body || "Arial";

  // Check each slide's layout for font consistency
  if (layoutPlan.layouts) {
    const fontVariants = new Set();
    for (const layout of layoutPlan.layouts) {
      if (layout.fontSize) {
        fontVariants.add(JSON.stringify(layout.fontSize));
      }
    }

    if (fontVariants.size > 3) {
      warnings.push({
        type: COMPILER_ERRORS.THEME_RESOLUTION,
        message: `${fontVariants.size} different font configurations found — consider unifying`,
        severity: "warn",
      });
    }
  }

  return { resolved: true, fontMap, warnings };
}

// ── Stage 6: Resource Optimizer ──────────────────────────────────

function optimizeResources(slideSpecs, layoutPlan) {
  const resourceCache = new Map();
  const deduplicationCount = { icons: 0, charts: 0, diagrams: 0 };

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const visualType = spec.visualType || "";

    if (["bar-chart", "line-chart"].includes(visualType) && spec.visualSpec?.series) {
      const cacheKey = resourceKey("chart", spec.visualSpec.series);
      if (resourceCache.has(cacheKey)) {
        deduplicationCount.charts++;
        // Mark this slide to reference the cached resource
        if (!spec._cachedResource) spec._cachedResource = [];
        spec._cachedResource.push(cacheKey);
      } else {
        resourceCache.set(cacheKey, { type: "chart", index: i });
      }
    }

    if (["process", "timeline"].includes(visualType) && spec.visualSpec?.steps) {
      const cacheKey = resourceKey("diagram", { type: visualType, steps: spec.visualSpec.steps });
      if (resourceCache.has(cacheKey)) {
        deduplicationCount.diagrams++;
        if (!spec._cachedResource) spec._cachedResource = [];
        spec._cachedResource.push(cacheKey);
      } else {
        resourceCache.set(cacheKey, { type: "diagram", index: i });
      }
    }
  }

  return {
    resourceCache: Object.fromEntries(resourceCache),
    deduplicationCount,
    totalCached: resourceCache.size,
  };
}

// ── Stage 7: Render Plan Generator ───────────────────────────────

function generateRenderPlan(
  slideSpecs,
  layoutPlan,
  analysis,
  overflowReport,
  paginationDecisions,
  themeResolution,
  resourceOptimization,
) {
  const slides = [];

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan?.layouts?.find((l) => l.slideId === spec.id);

    const entry = {
      no: spec.index || i + 1,
      type: spec.role || "content",
      title: spec.title || "",
      renderMethod: layout?.renderMethod || "adapter",
      adapter: layout?.adapter || `${spec.role || "content"}-adapter`,
      theme: layout?.theme || "default",
      resources: spec._cachedResource || [],
      overflow: null,
      pagination: null,
    };

    // Attach overflow info
    const overflowEntry = overflowReport.find((o) => o.slideIndex === entry.no);
    if (overflowEntry && overflowEntry.issues.length > 0) {
      entry.overflow = overflowEntry.issues.map((issue) => issue.type);
    }

    slides.push(entry);
  }

  // Build meta summary
  const meta = {
    totalSlides: slides.length,
    themesResolved: themeResolution.resolved,
    paginationDecisions: paginationDecisions.length,
    resourceDeduplication: resourceOptimization.totalCached,
    estimatedDuration: analysis.estimatedDuration,
    overflowWarnings: overflowReport.length,
  };

  return { meta, slides, resources: { cached: resourceOptimization.resourceCache } };
}

// ── Main Entry Point ─────────────────────────────────────────────

function compilePresentation(slideSpecs, layoutPlan, options = {}) {
  const mode = options.mode || DEFAULT_MODE;
  const isOptimized = mode === COMPILER_MODES.OPTIMIZED;
  const isFast = mode === COMPILER_MODES.FAST;

  // Skip fast mode entirely — pass through unchanged
  if (isFast) {
    return {
      renderPlan: {
        meta: {
          totalSlides: slideSpecs.length,
          themesResolved: true,
          paginationDecisions: 0,
          resourceDeduplication: 0,
        },
        slides: [],
        resources: {},
      },
      analysis: {},
      overflowReport: [],
      paginationDecisions: [],
      themeResolution: { resolved: true },
      resourceOptimization: { totalCached: 0 },
      mode: COMPILER_MODES.FAST,
      warnings: [],
    };
  }

  // Stage 1: Input Analysis
  const analysis = analyzeInput(slideSpecs, layoutPlan);

  // Stage 2: Constraint Solving
  const { resolvedLayouts, warnings: constraintWarnings } = solveConstraints(
    slideSpecs,
    layoutPlan,
    mode,
  );

  // Stage 3: Overflow Detection
  const overflowReport = detectOverflow(slideSpecs, layoutPlan);

  // Stage 4: Pagination
  const paginationDecisions = isOptimized ? paginateContent(slideSpecs, overflowReport) : [];

  // Stage 5: Theme Resolution
  const themeResolution = isOptimized
    ? resolveThemes(layoutPlan, slideSpecs)
    : { resolved: true, warnings: [] };

  // Stage 6: Resource Optimization
  const resourceOptimization = isOptimized
    ? optimizeResources(slideSpecs, layoutPlan)
    : { resourceCache: {}, deduplicationCount: {}, totalCached: 0 };

  // Stage 7: Render Plan Generation
  const renderPlan = generateRenderPlan(
    slideSpecs,
    layoutPlan,
    analysis,
    overflowReport,
    paginationDecisions,
    themeResolution,
    resourceOptimization,
  );

  const allWarnings = [...constraintWarnings, ...themeResolution.warnings];

  return {
    renderPlan,
    analysis,
    overflowReport,
    paginationDecisions,
    themeResolution,
    resourceOptimization,
    mode,
    warnings: allWarnings,
  };
}

module.exports = {
  compilePresentation,
  analyzeInput,
  solveConstraints,
  detectOverflow,
  paginateContent,
  resolveThemes,
  optimizeResources,
  generateRenderPlan,
  COMPILER_MODES,
};
