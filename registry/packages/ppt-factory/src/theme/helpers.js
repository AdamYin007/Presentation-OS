/**
 * Theme Helpers — utility functions for working with theme data.
 *
 * Pure functions. No rendering, no pptxgenjs.
 */

/**
 * Resolve a color token from a theme by path.
 * Supports dot-notation paths: "blue", "_legacy.navy", "heading.color"
 *
 * @param {object} theme - Theme object
 * @param {string} tokenPath - Dot-notation path to color token
 * @returns {string|null} Hex color string or null
 */
function resolveColor(theme, tokenPath) {
  if (!theme || !tokenPath) return null;

  const parts = tokenPath.split(".");
  let current = theme;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return null;
    current = current[part];
  }

  return typeof current === "string" ? current : null;
}

/**
 * Apply typography settings for a given role.
 * Returns a normalized font config object suitable for pptxgenJS addText.
 *
 * Roles: "heading", "subtitle", "footer", "body"
 *
 * @param {object} theme - Theme object
 * @param {string} role - Typography role
 * @returns {object|null} Font config or null
 */
function applyTypography(theme, role) {
  if (!theme || !theme.fonts) return null;

  const fontDef = theme.fonts[role];
  if (!fontDef) return null;

  return {
    face: fontDef.face || "Arial",
    size: fontDef.size || 12,
    bold: fontDef.bold || false,
    color: fontDef.color || "000000",
    align: fontDef.align || "left",
  };
}

/**
 * Compute a spacing value in inches from a theme unit.
 *
 * Units: "margin" (slideMargin), "gap" (cardGap), "section" (sectionGap)
 * Falls back to 0.5 inches for unknown units.
 *
 * @param {object} theme - Theme object
 * @param {string} unit - Spacing unit name
 * @returns {number} Spacing value in inches
 */
function computeSpacing(theme, unit) {
  if (!theme || !theme.spacing) return 0.5;

  const value = theme.spacing[unit];
  if (typeof value === "number") return value;

  // Default margin fallback
  return 0.5;
}

module.exports = { resolveColor, applyTypography, computeSpacing };
