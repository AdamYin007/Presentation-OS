/**
 * Transformation Layout Adapter — 3 stage cards with arrows.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   3 icon cards (硬件数字化, 平台流程化, AI 智能化) in a row
 *   with → arrows between them.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function transformationAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded content matching legacy transformation() renderer
  const cards = [
    { title: "硬件数字化", body: "完成切片扫描与图像采集", icon: "📷" },
    { title: "平台流程化", body: "打通业务流程、质控与协同", icon: "⚙" },
    { title: "AI 智能化", body: "形成辅助诊断与数据资产能力", icon: "🧠" },
  ];

  // Override with zone content if available
  if (plan && plan.zones) {
    for (let i = 0; i < cards.length && i < plan.zones.length; i++) {
      const zone = plan.zones[i];
      if (zone && zone.content) {
        if (zone.content.title) cards[i].title = zone.content.title;
        if (zone.content.body) cards[i].body = zone.content.body;
        if (zone.content.icon) cards[i].icon = zone.content.icon;
      }
    }
  }

  const cardW = 3.1;
  const cardH = 2.0;
  const startX = 0.9;
  const startY = 2.35;

  cards.forEach((c, i) => {
    const x = startX + i * 3.5;
    comp.card(s, x, startY, cardW, cardH, c.title, c.body, comp.C.gray, pptx,
      { variant: "icon", iconChar: c.icon });

    // Arrow between cards
    if (i < 2) {
      s.addText("→", {
        x: x + cardW + 0.15, y: startY + 0.35, w: 0.6, h: 0.4,
        fontSize: 28, color: comp.C.blue, margin: 0
      });
    }
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = transformationAdapter;
