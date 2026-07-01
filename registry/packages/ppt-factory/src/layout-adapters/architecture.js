/**
 * Architecture Layout Adapter — layered architecture diagram.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   4 stacked layers (应用层, 平台层, 数据层, 连接层)
 *   with side panel labels (V, IV, III, I) and downward arrows.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function architectureAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s, comp.C.lightGray);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded layers matching legacy layeredArchSlide() renderer
  const layers = [
    { name: "应用层", desc: "阅片、AI、会诊、科研、教学", color: comp.C.blue, sideLabel: "V" },
    { name: "平台层", desc: "流程编排、质控、权限、日志、接口", color: comp.C.lightBlue, sideLabel: "IV" },
    { name: "数据层", desc: "切片、病例、诊断、标注、模型结果", color: comp.C.lightBlue, sideLabel: "III" },
    { name: "连接层", desc: "LIS、扫描仪、存储、AI、院内系统", color: comp.C.lightBlue, sideLabel: "I" },
  ];

  // Override with zone content if available
  if (plan && plan.zones) {
    for (let i = 0; i < layers.length && i < plan.zones.length; i++) {
      const zone = plan.zones[i];
      if (zone && zone.content) {
        if (zone.content.name) layers[i].name = zone.content.name;
        if (zone.content.desc) layers[i].desc = zone.content.desc;
        if (zone.content.sideLabel) layers[i].sideLabel = zone.content.sideLabel;
        if (zone.content.color) {
          layers[i].color = comp.C[zone.content.color] || zone.content.color;
        }
      }
    }
  }

  comp.layeredArchitecture(s, layers, pptx, { sidePanel: true, showArrows: true });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = architectureAdapter;
