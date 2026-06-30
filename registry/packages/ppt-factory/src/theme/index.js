/**
 * Theme Engine v1 — Phase 0 Core
 *
 * Pure data + helpers. No rendering, no pptxgenjs, no PPT output changes.
 *
 * Exports:
 *   getTheme(name)          — retrieve theme by name
 *   createTheme(name, def)  — register a new theme
 *   listThemes()            — list all theme names
 *   resolveColor(theme, path) — resolve "colors.blue" → "2563EB"
 *   applyTypography(theme, role) — get font config for a role
 *   computeSpacing(theme, unit)  — get spacing value by unit
 */

const { getTheme, createTheme, listThemes } = require("./registry");
const { resolveColor, applyTypography, computeSpacing } = require("./helpers");

module.exports = {
  getTheme,
  createTheme,
  listThemes,
  resolveColor,
  applyTypography,
  computeSpacing,
};
