/**
 * Differentiation Layout Adapter — comparison matrix (3-column table).
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   3-column comparison matrix with header row (评估维度, 传统病理, 数字病理)
 *   + 5 data rows with alternating backgrounds.
 *   This is NOT a card layout — it uses manual shapes/text for precise table layout.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function differentiationAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded comparison data matching legacy differentiation() renderer
  const criteria = [
    { name: "建设重心", legacy: "扫描仪参数", digital: "平台能力" },
    { name: "可替换性", legacy: "硬件可更换", digital: "软件难迁移" },
    { name: "扩展性", legacy: "单点功能", digital: "模块化扩展" },
    { name: "数据价值", legacy: "消耗型投入", digital: "生产型资产" },
    { name: "合规能力", legacy: "事后追溯", digital: "全流程闭环" },
  ];

  const colW = 3.5;
  const colX = [0.7, 4.5, 8.3];
  const headers = ["评估维度", "传统病理", "数字病理"];
  const headerColors = [comp.C.navy, comp.C.gray, comp.C.blue];

  // Header row
  headers.forEach((h, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: colX[i], y: 2.0, w: colW, h: 0.45,
      rectRadius: 0.06,
      fill: { color: headerColors[i] },
      line: { color: headerColors[i], width: 1 }
    });
    s.addText(h, {
      x: colX[i], y: 2.05, w: colW, h: 0.35,
      fontSize: 13, bold: true,
      color: headerColors[i] === comp.C.navy ? comp.C.white : comp.C.white,
      align: i === 0 ? "left" : "center",
      margin: 0
    });
  });

  // Data rows
  criteria.forEach((c, i) => {
    const y = 2.55 + i * 0.85;

    // Alternating row bg
    s.addShape(pptx.ShapeType.roundRect, {
      x: colX[0], y, w: colW * 3, h: 0.75,
      rectRadius: 0.04,
      fill: { color: i % 2 === 0 ? comp.C.white : comp.C.lightGray },
      line: { color: comp.C.border, width: 1 }
    });

    // Criteria name (left column)
    s.addText(c.name, {
      x: colX[0] + 0.15, y: y + 0.15, w: colW - 0.3, h: 0.35,
      fontSize: 11, bold: true, color: comp.C.navy, margin: 0
    });

    // Legacy value (middle column)
    s.addText(c.legacy, {
      x: colX[1], y: y + 0.15, w: colW - 0.2, h: 0.35,
      fontSize: 10.5, color: comp.C.gray, align: "center", margin: 0
    });

    // Digital value (right column)
    s.addText(c.digital, {
      x: colX[2], y: y + 0.15, w: colW - 0.2, h: 0.35,
      fontSize: 10.5, bold: true, color: comp.C.blue, align: "center", margin: 0
    });
  });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = differentiationAdapter;
