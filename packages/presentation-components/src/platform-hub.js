// Platform Hub component — central platform ellipse with peripheral node cards
// Usage: platformHub(slide, centerLabel, nodes, pptx)
// Enhanced: supports autoLayout mode, node icons, and curved connectors

const { C } = require("./helpers");
const { card } = require("./card");

/**
 * @param {pptxgen.JsLibSlide} slide
 * @param {string} centerLabel
 * @param {Array<{label:string, x?:number, y?:number, icon?:string}>} nodes
 * @param {object} pptx
 * @param {object} [opts] — { autoLayout, radius, centerX, centerY }
 */
function platformHub(slide, centerLabel, nodes, pptx, opts) {
  opts = opts || {};
  pptx = pptx || slide._pptx;

  if (opts.autoLayout) {
    return _autoLayout(slide, centerLabel, nodes, pptx, opts);
  }
  return _manualLayout(slide, centerLabel, nodes, pptx, opts);
}

function _manualLayout(slide, centerLabel, nodes, pptx, opts) {
  const cx = opts.centerX || 5.0;
  const cy = opts.centerY || 2.85;
  const cw = 3.2;
  const ch = 1.45;

  // Central platform ellipse
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx,
    y: cy,
    w: cw,
    h: ch,
    fill: { color: C.blue },
    line: { color: C.blue },
  });
  slide.addText(centerLabel, {
    x: cx + 0.45,
    y: cy + 0.32,
    w: cw - 0.9,
    h: 0.7,
    fontSize: 20,
    bold: true,
    color: C.white,
    align: "center",
    margin: 0,
    breakLine: true,
  });

  _drawNodesAndConnectors(slide, nodes, cx, cy, cw, ch, pptx);

  return slide;
}

function _autoLayout(slide, centerLabel, nodes, pptx, opts) {
  const cx = opts.centerX || 6.4;
  const cy = opts.centerY || 3.75;
  const radius = opts.radius || 3.5;
  const count = nodes.length;
  const cw = 3.2;
  const ch = 1.45;

  // Central platform ellipse
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx,
    y: cy,
    w: cw,
    h: ch,
    fill: { color: C.blue },
    line: { color: C.blue },
  });
  slide.addText(centerLabel, {
    x: cx + 0.45,
    y: cy + 0.32,
    w: cw - 0.9,
    h: 0.7,
    fontSize: 20,
    bold: true,
    color: C.white,
    align: "center",
    margin: 0,
    breakLine: true,
  });

  // Position nodes evenly around the ellipse
  const placedNodes = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const nx = cx + (cw / 2 + radius) * Math.cos(angle);
    const ny = cy + (ch / 2 + radius) * Math.sin(angle);
    placedNodes.push({
      label: nodes[i].label,
      x: nx - 1.0,
      y: ny - 0.425,
      icon: nodes[i].icon,
    });
  }

  _drawNodesAndConnectors(slide, placedNodes, cx, cy, cw, ch, pptx);

  return slide;
}

function _drawNodesAndConnectors(slide, nodes, cx, cy, cw, ch, pptx) {
  nodes.forEach((n) => {
    card(slide, n.x, n.y, 2.0, 0.85, n.label, "", C.green, pptx, {
      variant: n.icon ? "icon" : "default",
      iconChar: n.icon || "●",
    });

    // Draw connector lines from center to nodes
    const dx = n.x + 1.0 - cx;
    const dy = n.y + 0.425 - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;

    // Start from ellipse edge (approximate)
    const sx = cx + (nx * cw) / 2;
    const sy = cy + (ny * ch) / 2;
    // End at card edge
    const ex = n.x + 1.0;
    const ey = n.y + 0.425;

    slide.addShape(pptx.ShapeType.line, {
      x: sx,
      y: sy,
      w: ex - sx,
      h: ey - sy,
      line: { color: C.border, width: 1 },
    });
  });
}

module.exports = { platformHub };
