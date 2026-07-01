/**
 * Research Layout Adapter — center hub + 4 orbiting cards.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   ellipse center "病理数据\n资产" + 4 green capability cards
 *   with connector lines from each card to center.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function researchAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  const { zones, constraints } = plan;
  const { hubSize, satelliteCount, hasConnectors } = constraints || {};

  const cx = 6.4, cy = 3.75;

  // Center hub ellipse
  s.addShape(pptx.ShapeType.ellipse, {
    x: cx, y: cy, w: 2.8, h: 2.0,
    fill: { color: comp.C.blue },
    line: { color: comp.C.blue }
  });
  s.addText("病理数据\n资产", {
    x: cx + 0.3, y: cy + 0.4,
    w: 2.2, h: 1.2,
    fontSize: 18, bold: true, color: comp.C.white,
    align: "center", margin: 0, breakLine: true
  });

  // Satellite cards from zones or fallback
  const satellites = [
    { label: "数字切片", x: 0.5, y: 1.5 },
    { label: "诊断标签", x: 10.5, y: 1.5 },
    { label: "病例数据", x: 0.5, y: 5.5 },
    { label: "标注集", x: 10.5, y: 5.5 },
  ];

  // Override with zone content if available
  for (let i = 0; i < satellites.length && i < zones.length; i++) {
    const zone = zones[i + 1]; // skip hub (zone 0)
    if (zone && zone.content && zone.content.title) {
      satellites[i].label = zone.content.title;
    }
  }

  satellites.forEach(cap => {
    comp.card(s, cap.x, cap.y, 2.2, 0.7, cap.label, "", comp.C.green, pptx,
      { variant: "icon", iconChar: "◆" });
  });

  // Connector lines from each card to center
  if (hasConnectors) {
    satellites.forEach(c => {
      const dx = (c.x + 1.1) - cx;
      const dy = (c.y + 0.35) - cy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const sx = cx + (dx / len) * 1.4;
      const sy = cy + (dy / len) * 1.0;
      s.addShape(pptx.ShapeType.line, {
        x: sx, y: sy,
        w: (c.x + 1.1) - sx, h: (c.y + 0.35) - sy,
        line: { color: comp.C.border, width: 1 }
      });
    });
  }

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = researchAdapter;
