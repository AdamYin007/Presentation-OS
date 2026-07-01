/**
 * Why-Now Layout Adapter — renders 4 icon cards in a row.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   4 horizontal icon cards (诊断需求增长, 病理医生稀缺, AI 技术成熟, 区域协同需求).
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function whyNowAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  const { zones, constraints } = plan;
  const { cardWidthIn, cardHeightIn, cardGapIn, startXIn, startYIn } = constraints || {};
  const CARD_W = cardWidthIn || 2.55;
  const CARD_H = cardHeightIn || 2.4;
  const GAP = cardGapIn || 0.45;
  const START_X = startXIn || 0.8;
  const START_Y = startYIn || 2.05;

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
      { title: "诊断需求增长", desc: "肿瘤诊疗增长推动病理需求持续上升。", color: comp.C.blue, iconChar: "▲" },
      { title: "病理医生稀缺", desc: "优质病理资源分布不均，基层能力不足。", color: comp.C.green, iconChar: "👤" },
      { title: "AI 技术成熟", desc: "AI 已从算法演示进入工作流整合阶段。", color: comp.C.orange, iconChar: "◆" },
      { title: "区域协同需求", desc: "医联体和远程会诊需要统一数字底座。", color: comp.C.red, iconChar: "◎" }
    );
  }

  comp.makeTitle(s, slide.title, slide.message);

  cards.forEach((card, i) => {
    comp.card(s, START_X + i * (CARD_W + GAP), START_Y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "icon", iconChar: card.iconChar });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = whyNowAdapter;
