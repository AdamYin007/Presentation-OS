/**
 * Theme Defaults — canonical color palette and typographic settings.
 *
 * Derived from components/helpers.js and src/theme.js.
 * Pure data, no rendering, no pptxgenjs.
 */

const COLORS = {
  navy: "0F172A",
  blue: "2563EB",
  lightBlue: "EFF6FF",
  gray: "64748B",
  lightGray: "F8FAFC",
  border: "E2E8F0",
  green: "059669",
  orange: "EA580C",
  red: "DC2626",
  white: "FFFFFF",
  cyan: "0891B2",
};

const FONTS = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "zh-CN",
};

const DIMENSIONS = {
  width: 12.7,
  height: 7.5,
};

/**
 * Medical Consulting theme preset.
 * Matches the existing slide output exactly.
 */
function createMedicalConsultingTheme() {
  return {
    name: "medical-consulting",
    colors: {
      ...COLORS,
      _legacy: { ...COLORS },
    },
    fonts: {
      ...FONTS,
      heading: {
        face: FONTS.headFontFace,
        size: 24,
        bold: true,
        color: COLORS.navy,
      },
      subtitle: {
        face: FONTS.bodyFontFace,
        size: 12,
        bold: false,
        color: COLORS.gray,
      },
      footer: {
        face: FONTS.bodyFontFace,
        size: 8,
        bold: false,
        color: "94A3B8",
      },
    },
    dimensions: { ...DIMENSIONS },
    spacing: {
      slideMargin: 0.55,
      cardGap: 0.15,
      sectionGap: 0.5,
    },
  };
}

module.exports = {
  COLORS,
  FONTS,
  DIMENSIONS,
  createMedicalConsultingTheme,
};
