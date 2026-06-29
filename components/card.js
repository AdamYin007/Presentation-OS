// Card component — rounded rectangle with colored top-bar accent
// Usage: card(slide, x, y, w, h, header, body, color, pptx)
// Enhanced: supports icon, badge, variant modes

const { C } = require("./helpers");

// Supported card variants
const VARIANTS = {
  default: { accentBar: true, icon: false, badge: false },
  icon:    { accentBar: false, icon: true,  badge: false },
  badge:   { accentBar: false, icon: false, badge: true },
  flat:    { accentBar: false, icon: false, badge: false },
};

/**
 * Render a card with optional variant configuration.
 * @param {pptxgen.JsLibSlide} slide
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} header
 * @param {string} body
 * @param {string} color — hex color string
 * @param {object} pptx
 * @param {object} [opts] — { variant, icon, badgeText }
 */
function card(slide, x, y, w, h, header, body, color, pptx, opts) {
  opts = opts || {};
  const variant = VARIANTS[opts.variant] || VARIANTS.default;
  color = color || C.blue;
  pptx = pptx || slide._pptx;

  // White background with border
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 }
  });

  // Accent bar (top)
  if (variant.accentBar) {
    slide.addShape(pptx.ShapeType.rect, {
      x, y,
      w, h: 0.08,
      fill: { color },
      line: { color }
    });
  }

  // Icon indicator (left side)
  if (variant.icon) {
    const iconR = Math.min(w, h) * 0.12;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.2,
      y: y + (h - iconR * 2) / 2 + 0.1,
      w: iconR * 2,
      h: iconR * 2,
      fill: { color },
      line: { color }
    });
    slide.addText(opts.iconChar || "●", {
      x: x + 0.2 + iconR * 0.35,
      y: y + (h - iconR * 2) / 2 + 0.1 + iconR * 0.35,
      w: iconR * 1.3,
      h: iconR * 1.3,
      fontSize: iconR * 1.8,
      color: C.white,
      margin: 0,
      align: "center"
    });
  }

  // Badge (top-right corner)
  if (variant.badge && opts.badgeText) {
    const badgeW = 0.7;
    const badgeH = 0.22;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + w - badgeW - 0.08,
      y: y + 0.12,
      w: badgeW,
      h: badgeH,
      rectRadius: 0.04,
      fill: { color },
      line: { color }
    });
    slide.addText(opts.badgeText, {
      x: x + w - badgeW - 0.08,
      y: y + 0.12,
      w: badgeW,
      h: badgeH,
      fontSize: 7,
      bold: true,
      color: C.white,
      align: "center",
      margin: 0
    });
  }

  // Header text
  const headerY = variant.icon ? y + 0.3 : y + 0.22;
  const headerW = variant.icon ? w - 0.6 : w - 0.36;
  slide.addText(header, {
    x: variant.icon ? x + 0.6 : x + 0.18,
    y: headerY,
    w: headerW,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color: C.navy,
    margin: 0
  });

  // Body text
  const bodyStartY = variant.icon ? y + 0.85 : y + 0.72;
  slide.addText(body, {
    x: variant.icon ? x + 0.6 : x + 0.18,
    y: bodyStartY,
    w: headerW,
    h: h - bodyStartY - 0.15,
    fontSize: 10.5,
    color: C.gray,
    fit: "shrink",
    margin: 0
  });

  return slide;
}

module.exports = { card, VARIANTS };
