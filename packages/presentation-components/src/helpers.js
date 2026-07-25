// Presentation Component Library v1
// Shared color palette and theme helpers

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
  cyan: "0891B2",
};

function makeFooter(slide, pptx, storyMeta, page) {
  const style = (storyMeta && storyMeta.style) || "consulting";
  slide.addText(`AWE Presentation OS · ${style} · ${page}`, {
    x: 0.55,
    y: 7.12,
    w: 5,
    h: 0.2,
    fontSize: 8,
    color: "94A3B8",
    margin: 0,
  });
}

function makeTitle(slide, text, subtitle, opts) {
  opts = opts || {};
  slide.addText(text, {
    x: opts.x || 0.55,
    y: opts.y || 0.35,
    w: opts.w || 11.8,
    h: opts.h || 0.45,
    fontSize: opts.fontSize || 24,
    bold: true,
    color: opts.color || C.navy,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: (opts.x || 0.55) + 0.02,
      y: (opts.y || 0.35) + 0.55,
      w: (opts.w || 11.8) - 0.04,
      h: 0.35,
      fontSize: opts.subFontSize || 12,
      color: C.gray,
      margin: 0,
    });
  }
}

module.exports = { C, makeFooter, makeTitle };
