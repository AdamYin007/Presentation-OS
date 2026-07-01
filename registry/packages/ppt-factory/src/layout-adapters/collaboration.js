/**
 * Collaboration Layout Adapter — regional network hub + satellites.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   blue rounded-rect center "区域病理\n中心" + 4 satellite cards
 *   with connector lines from each satellite to center.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function collaborationAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  const { zones, constraints } = plan;
  const { satelliteCount, hasConnectors } = constraints || {};

  const center = { x: 6.4, y: 3.5, w: 2.4, h: 1.2 };

  // Center hub
  s.addShape(pptx.ShapeType.roundRect, {
    x: center.x, y: center.y, w: center.w, h: center.h,
    rectRadius: 0.08,
    fill: { color: comp.C.blue },
    line: { color: comp.C.blue }
  });
  s.addText("区域病理\n中心", {
    x: center.x + 0.3, y: center.y + 0.25,
    w: center.w - 0.6, h: 0.7,
    fontSize: 16, bold: true, color: comp.C.white,
    align: "center", margin: 0, breakLine: true
  });

  // Satellite cards
  const satellites = [
    { label: "三甲医院", x: 0.5, y: 0.8 },
    { label: "社区医院", x: 10.5, y: 0.8 },
    { label: "县级医院", x: 0.5, y: 6.0 },
    { label: "乡镇卫生院", x: 10.5, y: 6.0 },
  ];

  // Override with zone content if available
  for (let i = 0; i < satellites.length && i < zones.length; i++) {
    const zone = zones[i + 1]; // skip center hub (zone 0)
    if (zone && zone.content && zone.content.title) {
      satellites[i].label = zone.content.title;
    }
  }

  satellites.forEach(sat => {
    comp.card(s, sat.x, sat.y, 2.2, 0.7, sat.label, "", comp.C.green, pptx,
      { variant: "icon", iconChar: "●" });
    // Line to center
    const dx = (sat.x + 1.1) - (center.x + center.w / 2);
    const dy = (sat.y + 0.35) - (center.y + center.h / 2);
    const len = Math.sqrt(dx * dx + dy * dy);
    const sx = center.x + center.w / 2 + (dx / len) * center.w / 2;
    const sy = center.y + center.h / 2 + (dy / len) * center.h / 2;
    s.addShape(pptx.ShapeType.line, {
      x: sx, y: sy,
      w: (sat.x + 1.1) - sx, h: (sat.y + 0.35) - sy,
      line: { color: comp.C.border, width: 1 }
    });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = collaborationAdapter;
