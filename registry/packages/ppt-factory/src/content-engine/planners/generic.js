/**
 * Generic fallback content — 3-card badge layout.
 *
 * Used for slide types that have no dedicated content planner yet.
 */

const { contentCard, buildSlideContent } = require("../schema");

/**
 * Compile generic slide content.
 *
 * @param {object} slide - story slide object
 * @returns {object} validated slide content
 */
function compileGenericContent(slide) {
  const cards = [
    contentCard({
      badge: "01",
      title: "核心价值",
      body: "围绕业务流程形成持续改进能力。",
      color: "blue",
    }),
    contentCard({
      badge: "02",
      title: "平台能力",
      body: "连接数据、应用、AI 与治理体系。",
      color: "green",
    }),
    contentCard({
      badge: "03",
      title: "长期演进",
      body: "支撑科研、教学、区域协同与智能化升级。",
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

module.exports = { compileGenericContent };
