// Layered Architecture component — stacked horizontal layers
// Usage: layeredArchitecture(slide, layers, pptx)
// Enhanced: supports side labels, connector arrows, gradient simulation

const { C } = require("./helpers");

/**
 * @param {pptxgen.JsLibSlide} slide
 * @param {Array<{name:string, desc:string, color?:string, sideLabel?:string}>} layers
 * @param {object} pptx
 * @param {object} [opts] — { showArrows, sidePanel }
 */
function layeredArchitecture(slide, layers, pptx, opts) {
  opts = opts || {};
  pptx = pptx || slide._pptx;

  const layerH = 0.75;
  const gap = 0.05;
  const startY = 1.75;
  const boxX = opts.sidePanel ? 3.2 : 1.4;
  const boxW = opts.sidePanel ? 8.6 : 10.4;

  // Side panel labels (left column)
  if (opts.sidePanel) {
    layers.forEach((l, i) => {
      const y = startY + i * (layerH + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.3, y, w: 1.0, h: layerH,
        rectRadius: 0.06,
        fill: { color: l.color || C.blue },
        line: { color: l.color || C.blue, width: 1 }
      });
      slide.addText(l.sideLabel || `L${i + 1}`, {
        x: 0.3, y: y + 0.21,
        w: 1.0, h: 0.25,
        fontSize: 11, bold: true, color: C.white,
        align: "center", margin: 0
      });
    });
  }

  layers.forEach((l, i) => {
    const y = startY + i * (layerH + gap);
    const color = l.color || (i === 0 ? C.blue : C.white);
    const textColor = i === 0 ? C.white : C.navy;
    const descColor = i === 0 ? C.white : C.gray;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: boxX, y, w: boxW, h: layerH,
      rectRadius: 0.06,
      fill: { color },
      line: { color: i === 0 ? color : C.border, width: 1 }
    });

    slide.addText(l.name, {
      x: boxX + 0.35, y: y + 0.21,
      w: 1.6, h: 0.25,
      fontSize: 15, bold: true, color: textColor, margin: 0
    });

    slide.addText(l.desc, {
      x: boxX + 2.15, y: y + 0.21,
      w: boxW - 2.5, h: 0.25,
      fontSize: 13, color: descColor, margin: 0
    });

    // Downward arrow connector between layers
    if (opts.showArrows && i < layers.length - 1) {
      const arrowY = y + layerH;
      slide.addShape(pptx.ShapeType.downArrow, {
        x: boxX + 0.15, y: arrowY,
        w: 0.2, h: gap,
        fill: { color: C.border },
        line: { color: C.border }
      });
    }
  });

  return slide;
}

module.exports = { layeredArchitecture };
