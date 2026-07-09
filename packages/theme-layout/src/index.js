/**
 * @awe/theme-layout — Public API (M12.5)
 *
 * Maps SlideSpec[] into LayoutPlan with concrete layout assignments,
 * theme tokens, color palettes, spacing, and font sizes.
 */

const { generateLayoutPlan } = require("./generator.js");
const { LAYOUT_FAMILIES, THEME_TOKENS, DEFAULT_THEME, getThemeTokens } = require("./schema.js");

module.exports = {
  generateLayoutPlan,
  LAYOUT_FAMILIES,
  THEME_TOKENS,
  DEFAULT_THEME,
  getThemeTokens,
};
