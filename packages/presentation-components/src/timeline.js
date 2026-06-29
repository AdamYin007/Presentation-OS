// Timeline component — horizontal stage-based timeline with nodes and connector
// Usage: timeline(slide, stages, pptx)
// Enhanced: supports vertical mode, auto-centering, connector style options

const { C } = require("./helpers");
const { card } = require("./card");

/**
 * @param {pptxgen.JsLibSlide} slide
 * @param {Array<{label:string, title:string, body:string, color?:string}>} stages
 * @param {object} pptx
 * @param {object} [opts] — { vertical, connectorWidth, showArrows }
 */
function timeline(slide, stages, pptx, opts) {
  opts = opts || {};
  const count = stages.length;
  if (count === 0) return slide;

  pptx = pptx || slide._pptx;

  if (opts.vertical) {
    return _renderVerticalTimeline(slide, stages, pptx, opts);
  }
  return _renderHorizontalTimeline(slide, stages, pptx, opts);
}

function _renderHorizontalTimeline(slide, stages, pptx, opts) {
  const count = stages.length;
  const gap = 0.3;
  const cardW = 2.5;
  const totalW = count * cardW + (count - 1) * gap;
  const startX = (12.8 - totalW) / 2;
  const startY = 2.8;
  const dotY = 2.15;
  const dotSize = 0.75;

  // Connector line
  const lineY = dotY + dotSize / 2;
  const lineW = totalW - cardW / 2;
  const lineX = startX + cardW / 4;
  slide.addShape(pptx.ShapeType.line, {
    x: lineX,
    y: lineY,
    w: lineW,
    h: 0,
    line: { color: C.border, width: opts.connectorWidth || 2 }
  });

  // Arrow connectors between stages
  if (opts.showArrows) {
    for (let i = 0; i < count - 1; i++) {
      const x1 = startX + i * (cardW + gap) + cardW;
      const x2 = startX + (i + 1) * (cardW + gap);
      const arrowY = dotY + dotSize / 2;
      slide.addShape(pptx.ShapeType.rightArrow, {
        x: x1, y: arrowY - 0.04,
        w: x2 - x1 - 0.08, h: 0.08,
        fill: { color: C.border },
        line: { color: C.border }
      });
    }
  }

  stages.forEach((s, i) => {
    const x = startX + i * (cardW + gap);
    const color = s.color || C.blue;

    // Stage label above
    slide.addText(s.label || "", {
      x, y: 1.55, w: cardW, h: 0.25,
      fontSize: 12, color: C.gray, align: "center", margin: 0
    });

    // Numbered circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + cardW / 2 - dotSize / 2,
      y: dotY,
      w: dotSize,
      h: dotSize,
      fill: { color },
      line: { color }
    });
    slide.addText(String(i + 1), {
      x: x + cardW / 2 - dotSize / 2 + 0.12,
      y: dotY + 0.19,
      w: 0.3,
      h: 0.25,
      fontSize: 15,
      bold: true,
      color: C.white,
      margin: 0
    });

    // Card below
    card(slide, x, startY, cardW, s.body ? 1.7 : 1.2, s.title || "", s.body || "", color, pptx);
  });

  return slide;
}

function _renderVerticalTimeline(slide, stages, pptx, opts) {
  const count = stages.length;
  const cardW = 4.8;
  const cardH = 0.9;
  const gap = 0.15;
  const dotR = 0.15;
  const startX = 1.0;
  const startY = 1.6;

  // Vertical connector line
  const lineBottom = startY + count * (cardH + gap) - gap;
  slide.addShape(pptx.ShapeType.line, {
    x: startX + cardW / 2,
    y: startY + dotR,
    w: 0,
    h: lineBottom - startY - dotR * 2,
    line: { color: C.border, width: opts.connectorWidth || 2 }
  });

  stages.forEach((s, i) => {
    const y = startY + i * (cardH + gap);
    const color = s.color || C.blue;
    const cx = startX + cardW / 2;
    const cy = y + cardH / 2;

    // Dot on the line
    slide.addShape(pptx.ShapeType.ellipse, {
      x: cx - dotR, y: cy - dotR,
      w: dotR * 2, h: dotR * 2,
      fill: { color },
      line: { color }
    });
    slide.addText(String(i + 1), {
      x: cx - dotR + 0.02, y: cy - dotR + 0.02,
      w: dotR * 2 - 0.04, h: dotR * 2 - 0.04,
      fontSize: 8, bold: true, color: C.white,
      align: "center", margin: 0
    });

    // Card to the right
    card(slide, startX + dotR * 2 + 0.1, y, cardW - dotR * 2 - 0.1, cardH,
      s.label || `Step ${i + 1}`, s.title || "", color, pptx);
  });

  return slide;
}

module.exports = { timeline };
