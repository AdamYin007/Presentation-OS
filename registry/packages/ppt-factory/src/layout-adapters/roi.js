/**
 * ROI Layout Adapter — 4 pillar cards with metrics + bottom summary bar.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   4 white pillar cards with colored top borders, each containing
 *   title + metric (bold, colored) + description (gray).
 *   Bottom light-blue summary bar with conclusion text.
 *
 * This is NOT a standard card layout — it uses manual shapes/text.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function roiAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded pillar data matching legacy roi() renderer
  const pillars = [
    { title: "效率提升", metric: "阅片效率 +40%", desc: "缩短报告周转时间", color: comp.C.blue },
    { title: "质量改善", metric: "一致性 +25%", desc: "降低误诊漏诊率", color: comp.C.green },
    { title: "协同扩展", metric: "覆盖 3x 机构", desc: "打破地域与院区间壁垒", color: comp.C.cyan },
    { title: "科研赋能", metric: "数据资产 ×∞", desc: "从消耗品变为生产要素", color: comp.C.orange },
  ];

  // Try to override with zone content from planner
  if (plan && plan.zones) {
    for (let i = 0; i < pillars.length && i < plan.zones.length; i++) {
      const zone = plan.zones[i];
      if (zone && zone.content) {
        if (zone.content.title) pillars[i].title = zone.content.title;
        if (zone.content.metric) pillars[i].metric = zone.content.metric;
        if (zone.content.desc) pillars[i].desc = zone.content.desc;
      }
    }
  }

  // Layout constants from legacy
  const pillarW = 2.6;
  const gap = 0.3;
  const totalW = pillars.length * pillarW + (pillars.length - 1) * gap;
  const startX = (12.8 - totalW) / 2;
  const startY = 2.0;

  pillars.forEach((p, i) => {
    const x = startX + i * (pillarW + gap);

    // Pillar card white background with colored border
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: startY, w: pillarW, h: 2.0,
      rectRadius: 0.08,
      fill: { color: comp.C.white },
      line: { color: p.color, width: 2 }
    });

    // Color top bar
    s.addShape(pptx.ShapeType.rect, {
      x, y: startY, w: pillarW, h: 0.08,
      fill: { color: p.color },
      line: { color: p.color }
    });

    // Title
    s.addText(p.title, {
      x: x + 0.15, y: startY + 0.25, w: pillarW - 0.3, h: 0.35,
      fontSize: 14, bold: true, color: comp.C.navy, margin: 0
    });

    // Metric
    s.addText(p.metric, {
      x: x + 0.15, y: startY + 0.7, w: pillarW - 0.3, h: 0.4,
      fontSize: 16, bold: true, color: p.color, margin: 0
    });

    // Description
    s.addText(p.desc, {
      x: x + 0.15, y: startY + 1.2, w: pillarW - 0.3, h: 0.5,
      fontSize: 10, color: comp.C.gray, margin: 0
    });
  });

  // Bottom summary bar
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 4.8, w: 11.4, h: 0.6,
    rectRadius: 0.06,
    fill: { color: comp.C.lightBlue },
    line: { color: comp.C.blue, width: 1 }
  });
  s.addText("数字病理 ROI 不仅是设备投入产出比，更是组织能力与数据资产的长期复利。", {
    x: 0.9, y: 4.9, w: 11, h: 0.4,
    fontSize: 11, color: comp.C.navy, margin: 0, bold: true
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = roiAdapter;
