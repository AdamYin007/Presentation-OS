/**
 * Generic Layout Adapter — renders the generic fallback slide.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   3 horizontal badge cards (核心价值, 平台能力, 长期演进).
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function genericAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  const { zones, constraints } = plan;
  const { cardWidthIn, cardHeightIn, maxCards } = constraints || {};
  const CARD_W = cardWidthIn || 3.4;
  const CARD_H = cardHeightIn || 2.1;
  const CARD_COUNT = maxCards || zones.length || 3;
  const GAP = 0.5;
  const START_X = 0.9;
  const START_Y = 2.0;

  // Card content from plan zones
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const zone = zones[i];
    if (zone && zone.content) {
      const c = zone.content;
      const resolvedColor = comp.C[c.color] || c.color || comp.C.blue;
      cards.push({
        title: c.title,
        desc: c.body || c.desc,
        color: resolvedColor,
        badge: c.badge,
      });
    }
  }

  // Fallback to legacy hardcoded content if zones lack content
  if (cards.length === 0) {
    cards.push(
      { title: "核心价值", desc: "围绕业务流程形成持续改进能力。", color: comp.C.blue, badge: "01" },
      { title: "平台能力", desc: "连接数据、应用、AI 与治理体系。", color: comp.C.green, badge: "02" },
      { title: "长期演进", desc: "支撑科研、教学、区域协同与智能化升级。", color: comp.C.orange, badge: "03" }
    );
  }

  comp.makeTitle(s, slide.title, slide.message);

  cards.forEach((card, i) => {
    comp.card(s, START_X + i * (CARD_W + GAP), START_Y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "badge", badgeText: card.badge || String(i + 1).padStart(2, "0") });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = genericAdapter;
