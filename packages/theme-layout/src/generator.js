/**
 * Theme and Layout Generator — M12.5
 *
 * Converts SlideSpec[] into a LayoutPlan with concrete layout assignments,
 * theme tokens, and visual specifications ready for the renderer (M12.6).
 */

"use strict";

const { LAYOUT_FAMILIES, THEME_TOKENS, DEFAULT_THEME, getThemeTokens } = require("./schema.js");

/**
 * Map SlideSpec layout hints to concrete layout families.
 * Uses density + role + visualType to select the best layout.
 */
function resolveLayout(slideSpec) {
  const layout = slideSpec.layout || "title-and-bullets";
  const role = slideSpec.role || "content";
  const density = (slideSpec.designHints && slideSpec.designHints.density) || "medium";
  const bodyLength = Array.isArray(slideSpec.body) ? slideSpec.body.length : 0;

  // Section dividers always use section-divider layout
  if (role === "section-divider") return "section-divider";
  if (role === "title") return "title-slide";
  if (role === "closing") return "closing";
  if (role === "agenda") return "agenda";
  if (role === "executive-summary") return "executive-summary";

  // Content slides: choose based on visual type and density
  if (slideSpec.visualType === "table" && bodyLength <= 5) {
    return "table";
  }
  if (["bar-chart", "line-chart", "area-chart", "pie-chart", "scatter-chart"].includes(slideSpec.visualType)) {
    return "chart-and-insight";
  }
  if (slideSpec.visualType === "comparison") {
    return "comparison";
  }
  if (slideSpec.visualType === "process" || slideSpec.visualType === "timeline" || slideSpec.visualType === "roadmap") {
    return "horizontal-process";
  }
  if (slideSpec.visualType === "image") {
    return "image-and-text";
  }
  if (bodyLength >= 4 && density === "dense") {
    return "three-card";
  }
  if (bodyLength === 2) {
    return "two-column";
  }

  // Default: title-and-bullets
  return "title-and-bullets";
}

/**
 * Select theme based on deck metadata or SlideSpec hints.
 * Falls back to minimal-modern.
 */
function selectTheme(deckMetadata) {
  if (deckMetadata && deckMetadata.style && THEME_TOKENS[deckMetadata.style]) {
    return deckMetadata.style;
  }
  return DEFAULT_THEME;
}

/**
 * Generate color palette from theme for a specific slide.
 * Uses designHints emphasis to determine accent usage.
 */
function generateColorPalette(themeName, slideSpec) {
  const tokens = getThemeTokens(themeName);
  const emphasis = (slideSpec.designHints && slideSpec.designHints.emphasis) || "low";

  return {
    background: tokens.colors.background,
    text: tokens.colors.primary,
    secondaryText: tokens.colors.secondary,
    mutedText: tokens.colors.muted,
    accent: emphasis === "high" ? tokens.colors.accent : tokens.colors.border,
    surface: tokens.colors.surface,
    border: tokens.colors.border,
  };
}

/**
 * Generate spacing values for a slide based on density.
 */
function generateSpacing(layout, density) {
  const base = { padding: 32, margin: 16, gap: 12 };

  if (layout === "title-slide") {
    return { paddingTop: 120, paddingBottom: 80, margin: 0, gap: 24 };
  }
  if (layout === "section-divider") {
    return { paddingTop: 160, paddingBottom: 160, margin: 0, gap: 32 };
  }
  if (layout === "closing") {
    return { paddingTop: 120, paddingBottom: 80, margin: 0, gap: 24 };
  }
  if (density === "sparse") {
    return { ...base, padding: 48, margin: 24, gap: 20 };
  }
  if (density === "dense") {
    return { ...base, padding: 24, margin: 12, gap: 8 };
  }

  return base;
}

/**
 * Main function: converts SlideSpec[] into LayoutPlan.
 */
function generateLayoutPlan(slideSpecs, deckMetadata) {
  const themeName = selectTheme(deckMetadata);
  const themeTokens = getThemeTokens(themeName);
  const layouts = [];

  for (const spec of slideSpecs) {
    const layoutFamily = resolveLayout(spec);
    const colors = generateColorPalette(themeName, spec);
    const spacing = generateSpacing(layoutFamily, spec.designHints?.density || "medium");

    layouts.push({
      slideId: spec.id,
      index: spec.index,
      role: spec.role,
      layoutFamily,
      theme: themeName,
      themeTokens: JSON.parse(JSON.stringify(themeTokens)),
      colors,
      spacing,
      fontSize: computeFontSize(layoutFamily, spec.designHints?.density),
      maxWidth: computeMaxWidth(layoutFamily),
      visualSpec: spec.visualSpec || {},
    });
  }

  return {
    schemaVersion: "1.0.0",
    theme: themeName,
    themeTokens,
    totalSlides: layouts.length,
    layoutFamiliesUsed: [...new Set(layouts.map((l) => l.layoutFamily))],
    layouts,
  };
}

function computeFontSize(layoutFamily, density) {
  if (layoutFamily === "title-slide") return { heading: 44, body: 20 };
  if (layoutFamily === "section-divider") return { heading: 36, body: 16 };
  if (layoutFamily === "closing") return { heading: 36, body: 16 };
  if (layoutFamily === "agenda") return { heading: 28, body: 16 };
  if (layoutFamily === "table") return { heading: 20, body: 14 };
  if (layoutFamily === "chart-and-insight") return { heading: 22, body: 14 };
  if (layoutFamily === "comparison") return { heading: 20, body: 14 };
  if (layoutFamily === "three-card") return { heading: 18, body: 13 };
  if (layoutFamily === "two-column") return { heading: 20, body: 14 };
  if (layoutFamily === "horizontal-process") return { heading: 18, body: 13 };

  // Default: title-and-bullets
  if (density === "dense") return { heading: 22, body: 13 };
  if (density === "sparse") return { heading: 24, body: 15 };
  return { heading: 22, body: 14 };
}

function computeMaxWidth(layoutFamily) {
  if (layoutFamily === "full-width-chart" || layoutFamily === "chart-and-insight") return 960;
  if (layoutFamily === "three-card") return 720;
  if (layoutFamily === "two-column") return 720;
  if (layoutFamily === "comparison") return 720;
  return 800;
}

module.exports = {
  generateLayoutPlan,
  resolveLayout,
  selectTheme,
  generateColorPalette,
};
