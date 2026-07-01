/**
 * Problem Layout Adapter — renders 2x2 icon cards grid.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   2x2 grid of icon cards (效率瓶颈, 质控瓶颈, 协同瓶颈, 数据瓶颈).
 *   Background color is lightGray (set by legacy bg()).
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function problemAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  // Legacy sets lightGray background
  bg(s, comp.C.lightGray);

  const { zones, constraints } = plan;
  const { cardWidthIn, cardHeightIn, gridRows, gridCols, startXIn, startYIn } = constraints || {};
  const CARD_W = cardWidthIn || 5.1;
  const CARD_H = cardHeightIn || 1.55;
  const ROWS = gridRows || 2;
  const COLS = gridCols || 2;
  const START_X = startXIn || 1.1;
  const START_Y = startYIn || 1.75;

  // Card content from plan zones
  const cards = [];
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (zone && zone.content) {
      const c = zone.content;
      const resolvedColor = comp.C[c.color] || c.color || comp.C.blue;
      cards.push({
        title: c.title,
        desc: c.body || c.desc,
        color: resolvedColor,
        iconChar: c.badge,
      });
    }
  }

  // Fallback to legacy hardcoded content
  if (cards.length === 0) {
    cards.push(
      { title: "效率瓶颈", desc: "玻片流转、人工阅片和报告周期压力增加", color: comp.C.blue, iconChar: "⏱" },
      { title: "质控瓶颈", desc: "过程记录分散，复核和追溯成本高", color: comp.C.orange, iconChar: "⚠" },
      { title: "协同瓶颈", desc: "远程会诊、区域病理和多院区协同困难", color: comp.C.blue, iconChar: "🔗" },
      { title: "数据瓶颈", desc: "切片、诊断和科研数据难以沉淀复用", color: comp.C.orange, iconChar: "📊" }
    );
  }

  comp.makeTitle(s, slide.title, slide.message);

  // Render in 2x2 grid
  cards.forEach((card, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x = START_X + col * (CARD_W + 0.8); // 0.8 = horizontal gap between cols
    const y = START_Y + row * (CARD_H + 0.3); // 0.3 = vertical gap between rows
    comp.card(s, x, y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "icon", iconChar: card.iconChar });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = problemAdapter;
