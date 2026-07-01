/**
 * Roadmap Layout Adapter — horizontal timeline with 4 stages.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   4 timeline stages (阶段一~四) with numbered circles,
 *   connector line + arrows, and cards below.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function roadmapAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded stages matching legacy roadmap() renderer
  const stages = [
    { label: "阶段一", title: "扫描阅片", body: "完成数字化入口", color: comp.C.blue },
    { label: "阶段二", title: "平台协同", body: "打通流程与质控", color: comp.C.cyan },
    { label: "阶段三", title: "AI 应用", body: "接入辅助诊断与科研", color: comp.C.green },
    { label: "阶段四", title: "区域运营", body: "形成会诊与数据资产", color: comp.C.orange },
  ];

  // Override with zone content if available
  if (plan && plan.zones) {
    for (let i = 0; i < stages.length && i < plan.zones.length; i++) {
      const zone = plan.zones[i];
      if (zone && zone.content) {
        if (zone.content.label) stages[i].label = zone.content.label;
        if (zone.content.title) stages[i].title = zone.content.title;
        if (zone.content.body) stages[i].body = zone.content.body;
        if (zone.content.color) {
          stages[i].color = comp.C[zone.content.color] || zone.content.color;
        }
      }
    }
  }

  comp.timeline(s, stages, pptx, { showArrows: true, connectorWidth: 2.5 });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = roadmapAdapter;
