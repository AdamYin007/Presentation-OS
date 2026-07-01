/**
 * Recommendation Layout Adapter — renders the recommendation slide.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   3 horizontal action cards with priority badges + bottom emphasis bar.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function recommendationAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  const { zones, constraints } = plan;
  const { cardWidthIn, cardHeightIn, hasEmphasisBar } = constraints || {};
  const CARD_W = cardWidthIn || 3.6;
  const CARD_H = cardHeightIn || 3.2;
  const GAP = 0.3;
  const START_X = 0.7;
  const START_Y = 2.0;

  // Card content from plan zones
  const cards = [];
  for (let i = 0; i < 3; i++) {
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

  // Fallback to legacy hardcoded content
  if (cards.length === 0) {
    cards.push(
      { title: "定位升级", desc: "从设备采购升级为平台能力建设，以软件为核心驱动力", color: comp.C.blue, badge: "首要" },
      { title: "分步实施", desc: "按扫描→平台→AI→区域的节奏渐进式部署，控制风险", color: comp.C.green, badge: "关键" },
      { title: "持续运营", desc: "建立数据资产运营体系，形成科研、教学、区域协同闭环", color: comp.C.orange, badge: "长期" }
    );
  }

  comp.makeTitle(s, slide.title, slide.message);

  cards.forEach((card, i) => {
    comp.card(s, START_X + i * (CARD_W + GAP), START_Y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "badge", badgeText: card.badge });
  });

  // Bottom emphasis bar (from legacy L562-572)
  if (hasEmphasisBar !== false) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 5.8, w: 11.8, h: 0.6,
      rectRadius: 0.06,
      fill: { color: comp.C.navy },
      line: { color: comp.C.navy }
    });
    s.addText("建议将数字病理项目定位为 AI 与软件驱动的能力升级工程", {
      x: 0.7, y: 5.9, w: 11.4, h: 0.4,
      fontSize: 14, bold: true, color: comp.C.white,
      align: "center", margin: 0
    });
  }

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = recommendationAdapter;
