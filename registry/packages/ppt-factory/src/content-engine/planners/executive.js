/**
 * Executive Summary — 3 takeaway badge cards.
 *
 * Pure content function. Does NOT depend on hero, layout, theme, or pptxgenjs.
 * Outputs semantic cards; layout is handled by Layout Engine.
 */

const { contentCard, buildSlideContent } = require("../schema");

/**
 * Compile executive-summary slide content.
 *
 * @param {object} slide - story slide object
 * @returns {object} validated slide content
 */
function compileExecutiveContent(slide) {
  const cards = [
    contentCard({
      badge: "01",
      title: "不是设备采购",
      body: "数字病理建设不能停留在扫描仪参数比较，而应转向平台能力建设。",
      color: "blue",
    }),
    contentCard({
      badge: "02",
      title: "软件是中枢",
      body: "平台连接 LIS、阅片、AI、质控、归档与会诊，决定长期价值。",
      color: "green",
    }),
    contentCard({
      badge: "03",
      title: "AI 是增量能力",
      body: "AI 嵌入诊断工作流，提升效率、质量、科研和区域协同能力。",
      color: "orange",
    }),
  ];

  return buildSlideContent({
    slideNo: slide.no,
    type: slide.type,
    cards,
    headline: slide.title,
    support: slide.message,
  });
}

module.exports = { compileExecutiveContent };
