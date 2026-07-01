/**
 * Governance Layout Adapter — 2x2 quadrant cycle cards.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   4 info cards (标准制定, 过程监控, 异常处置, 持续改进)
 *   with descriptions, in a 2x2 grid with arrow connectors.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function governanceAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  const { zones, constraints } = plan;
  const { cardWidthIn, cardHeightIn, hasCycleArrows } = constraints || {};
  const CARD_W = cardWidthIn || 5.7;
  const CARD_H = cardHeightIn || 1.9;
  const GAP_X = 0.3;
  const GAP_Y = 0.3;
  const START_X = 0.55;
  const START_Y = 2.0;

  // Card content from plan zones
  const cards = [];
  const fallbackCards = [
    { title: "标准制定", desc: "CAP/ISO 15189 合规基线", color: comp.C.blue },
    { title: "过程监控", desc: "全流程质控指标实时采集", color: comp.C.blue },
    { title: "异常处置", desc: "偏差检测、告警与闭环整改", color: comp.C.blue },
    { title: "持续改进", desc: "PDCA 循环驱动质量螺旋上升", color: comp.C.blue },
  ];

  for (let i = 0; i < 4; i++) {
    const zone = zones[i];
    if (zone && zone.content) {
      const c = zone.content;
      cards.push({
        title: c.title || zone.label || fallbackCards[i].title,
        desc: c.desc || c.body || fallbackCards[i].desc,
        color: comp.C[c.color] || c.color || comp.C.blue,
      });
    } else {
      cards.push(fallbackCards[i]);
    }
  }

  comp.makeTitle(s, slide.title, slide.message);

  // Render 2x2 grid matching legacy positions
  const positions = [
    { x: 0.7, y: 2.0 },   // tl
    { x: 6.8, y: 2.0 },   // tr
    { x: 6.8, y: 4.3 },   // br
    { x: 0.7, y: 4.3 },   // bl
  ];
  const legacyColors = [comp.C.blue, comp.C.cyan, comp.C.orange, comp.C.green];

  for (let i = 0; i < 4; i++) {
    comp.card(s, positions[i].x, positions[i].y, CARD_W, CARD_H,
      cards[i].title, cards[i].desc, cards[i].color, pptx,
      { variant: "icon", iconChar: "●" });
  }

  // Cycle arrows (text arrows matching legacy)
  const arrowPositions = [
    { x: 6.5, y: 2.9, text: "\u2192" },
    { x: 6.5, y: 5.2, text: "\u2193" },
    { x: 0.4, y: 5.2, text: "\u2190" },
    { x: 0.4, y: 2.9, text: "\u2191" },
  ];
  arrowPositions.forEach(a => {
    s.addText(a.text, {
      x: a.x, y: a.y, w: 0.3, h: 0.3,
      fontSize: 18, color: comp.C.border, margin: 0, bold: true
    });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = governanceAdapter;
