/**
 * Template to Brand Config Converter — M12.31
 *
 * Converts template analysis results (from template-analyzer) into brand config
 * format that the presentation pipeline can use for rendering.
 *
 * This enables template-driven rendering where:
 * 1. Analyze template → Extract colors, fonts, layout patterns
 * 2. Convert to brand config → Map to pipeline format
 * 3. Render with template colors/fonts → Use actual template styling
 */

"use strict";

/**
 * Convert template analysis results to brand config.
 *
 * @param {Object} principles - Output from template-analyzer
 * @returns {Object} Brand config compatible with theme-layout/generator
 */
function convertTemplateToBrandConfig(principles) {
  if (!principles || !principles.styleTokens) {
    return null;
  }

  const tokens = principles.styleTokens;
  const colors = tokens.colors || {};
  const accentColors = tokens.accentColors || {};
  const fonts = tokens.fonts || {};

  // Map template colors to brand palette
  // Theme color roles: dk1=dark text, lt1=light bg, dk2=dark accent, lt2=light bg, accent1-6=accent colors
  const palette = [];

  // Primary color (dk1 or dk2 - dark color for text)
  if (colors.dk1) palette.push(colors.dk1);
  else if (colors.dk2) palette.push(colors.dk2);
  else if (colors.accent1) palette.push(colors.accent1);
  else palette.push("#1A1A1A"); // fallback

  // Secondary color (lt1 or lt2 - light background)
  if (colors.lt1) palette.push(colors.lt1);
  else if (colors.lt2) palette.push(colors.lt2);
  else palette.push("#FFFFFF"); // fallback

  // Accent color (first accent)
  const accentKeys = Object.keys(accentColors).sort();
  if (accentKeys.length > 0) {
    palette.push(accentColors[accentKeys[0]]);
  } else if (colors.accent1) {
    palette.push(colors.accent1);
  } else {
    palette.push("#3B82F6"); // fallback blue
  }

  // Additional colors for surface, border, etc.
  if (colors.accent2) palette.push(colors.accent2);
  if (colors.accent3) palette.push(colors.accent3);
  if (colors.dk1) palette.push(colors.dk1); // dark for text
  if (colors.lt1) palette.push(colors.lt1); // light for background

  // Truncate to 8 colors max
  while (palette.length > 8) palette.pop();

  // Map fonts to typography rules
  const typographyRules = {
    headingFont: fonts.majorLatin || fonts.majorEastAsian || "Arial, sans-serif",
    bodyFont: fonts.minorLatin || fonts.minorEastAsian || "Arial, sans-serif",
    monoFont: "Courier New, monospace",
  };

  // Extract slide types to determine style
  const slideTypes = principles.slideTypes || {};
  const hasCover = (slideTypes.cover || []).length > 0;
  const hasEnd = (slideTypes.end || []).length > 0;

  // Determine if this looks like a business/consulting template
  const isBusiness = Object.keys(accentColors).some(k => k.includes("accent")) &&
                     palette.some(c => /^#[0-9A-Fa-f]{6}$/.test(c) && (c.startsWith("#1") || c.startsWith("#0")));

  // Build brand config
  const brandConfig = {
    brandName: principles.metadata?.sourceFile || "template",
    allowedPalette: palette,
    typographyRules,
    footerConvention: "slide-number",
    titlePlacement: "top",
    requiredTitleSlide: hasCover,
    requiredClosingSlide: hasEnd,
    maxSlidesPerSection: 10,
    // Template-specific metadata
    templateInfo: {
      totalSlides: principles.metadata?.totalSlides || 0,
      slideTypes,
      accentColors: accentColors,
    },
  };

  return brandConfig;
}

/**
 * Generate style tokens from template for use in layout plan.
 *
 * @param {Object} principles - Output from template-analyzer
 * @returns {Object} Theme tokens compatible with theme-layout/schema
 */
function generateThemeTokensFromTemplate(principles) {
  if (!principles || !principles.styleTokens) {
    return null;
  }

  const tokens = principles.styleTokens;
  const colors = tokens.colors || {};
  const accentColors = tokens.accentColors || {};
  const fonts = tokens.fonts || {};

  // Build theme tokens
  const themeTokens = {
    name: "template-derived",
    colors: {
      primary: colors.dk1 || colors.dk2 || "#1A1A1A",
      secondary: colors.accent1 || colors.accent2 || "#6B7280",
      accent: accentColors.accent1 || colors.accent1 || "#3B82F6",
      background: colors.lt1 || "#FFFFFF",
      surface: colors.lt2 || colors.dk2 || "#F5F5F5",
      border: colors.dk2 || "#E5E7EB",
      text: colors.dk1 || colors.dk2 || "#111827",
      muted: colors.dk2 || "#9CA3AF",
    },
    fonts: {
      heading: fonts.majorLatin || fonts.majorEastAsian || "Arial",
      body: fonts.minorLatin || fonts.minorEastAsian || "Arial",
      mono: "Courier New, monospace",
    },
    spacing: { unit: 8, scale: [0, 4, 8, 16, 24, 32, 48, 64] },
    borderRadius: 0,
    shadow: "0 2px 8px rgba(0,0,0,0.08)",
  };

  return themeTokens;
}

/**
 * Map template slide types to layout families.
 *
 * @param {Object} principles - Output from template-analyzer
 * @returns {Object} Map of slide number to layout family
 */
function mapSlideTypesToLayouts(principles) {
  if (!principles || !principles.slideTypes) {
    return {};
  }

  const slideTypes = principles.slideTypes;
  const layoutMap = {};

  // Cover slides
  for (const slideNum of slideTypes.cover || []) {
    layoutMap[slideNum] = "title-slide";
  }

  // End slides
  for (const slideNum of slideTypes.end || []) {
    layoutMap[slideNum] = "closing";
  }

  // Agenda slides
  for (const slideNum of slideTypes.agenda || []) {
    layoutMap[slideNum] = "agenda";
  }

  // Section dividers
  for (const slideNum of slideTypes.sectionDivider || []) {
    layoutMap[slideNum] = "section-divider";
  }

  // Content slides (default)
  for (const slideNum of slideTypes.content || []) {
    layoutMap[slideNum] = "title-and-bullets";
  }

  return layoutMap;
}

/**
 * Full conversion: template analysis → pipeline-ready config.
 *
 * @param {Object} principles - Output from template-analyzer
 * @returns {Object} Complete pipeline config
 */
function convertTemplateForPipeline(principles) {
  const brandConfig = convertTemplateToBrandConfig(principles);
  const themeTokens = generateThemeTokensFromTemplate(principles);
  const layoutMap = mapSlideTypesToLayouts(principles);

  return {
    brandConfig,
    themeTokens,
    layoutMap,
    style: "template-derived",
  };
}

module.exports = {
  convertTemplateToBrandConfig,
  generateThemeTokensFromTemplate,
  mapSlideTypesToLayouts,
  convertTemplateForPipeline,
};
