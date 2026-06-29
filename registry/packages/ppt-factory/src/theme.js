// Presentation Theme — shared color palette and font config
// Origin: extracted from components/helpers.js

const C = {
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
  cyan: "0891B2"
};

const theme = {
  colors: C,
  fonts: {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: "zh-CN"
  },
  dimensions: {
    width: 12.7,
    height: 7.5
  }
};

module.exports = theme;
module.exports.C = C;
