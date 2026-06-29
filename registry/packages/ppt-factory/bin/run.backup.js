#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const topic = getArg("topic", "数字病理的本质，是 AI 和软件驱动的能力升级");
const out = getArg("out", path.join(process.cwd(), "output", "ppt-factory"));
const slides = Number(getArg("slides", "8"));

fs.mkdirSync(out, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AWE PPT Factory";

pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "zh-CN"
};

function addTitle(slide, text, y = 0.45) {
  slide.addText(text, {
    x: 0.6,
    y,
    w: 12.1,
    h: 0.5,
    fontFace: "Arial",
    fontSize: 24,
    bold: true,
    color: "1F2937",
    margin: 0
  });
}

function addSubtitle(slide, text, y = 1.1) {
  slide.addText(text, {
    x: 0.62,
    y,
    w: 11.6,
    h: 0.6,
    fontFace: "Arial",
    fontSize: 14,
    color: "4B5563",
    margin: 0
  });
}

function addFooter(slide, page) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.6,
    y: 7.0,
    w: 12.1,
    h: 0,
    line: { color: "E5E7EB", width: 1 }
  });
  slide.addText(`AWE PPT Factory · ${page}`, {
    x: 0.6,
    y: 7.08,
    w: 3.5,
    h: 0.25,
    fontSize: 8,
    color: "9CA3AF",
    margin: 0
  });
}

function bulletSlide(title, subtitle, bullets, page) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  addTitle(slide, title);
  addSubtitle(slide, subtitle);

  bullets.forEach((b, idx) => {
    slide.addText(b, {
      x: 1.0,
      y: 2.0 + idx * 0.7,
      w: 10.6,
      h: 0.36,
      fontSize: 17,
      color: "111827",
      bullet: { type: "bullet" },
      margin: 0
    });
  });

  addFooter(slide, page);
}

let page = 1;

let cover = pptx.addSlide();
cover.background = { color: "F8FAFC" };
cover.addText(topic, {
  x: 0.75,
  y: 2.2,
  w: 11.8,
  h: 1.1,
  fontSize: 34,
  bold: true,
  color: "111827",
  margin: 0
});
cover.addText("AWE PPT Factory Enterprise · Consulting Style Draft", {
  x: 0.78,
  y: 3.55,
  w: 10.5,
  h: 0.4,
  fontSize: 15,
  color: "4B5563",
  margin: 0
});
cover.addText(new Date().toISOString().slice(0, 10), {
  x: 0.78,
  y: 6.6,
  w: 3,
  h: 0.3,
  fontSize: 10,
  color: "9CA3AF",
  margin: 0
});
page++;

bulletSlide(
  "核心观点",
  "硬件是数字化入口，AI 与软件才是能力升级的核心。",
  [
    "扫描仪解决的是切片数字化，不等于病理科完成数智化",
    "真正的价值来自诊断协同、质控闭环、AI 辅助和数据资产沉淀",
    "软件平台决定系统能否支撑 CAP、ISO 15189、远程会诊和科研教学"
  ],
  page++
);

bulletSlide(
  "行业痛点",
  "传统病理流程在效率、质量、协同和数据利用上存在结构性瓶颈。",
  [
    "诊断压力增加，优质病理医生资源不足",
    "质控依赖人工经验，难以形成可追溯闭环",
    "远程会诊、区域协同和科研教学缺少统一平台",
    "数据分散在 LIS、扫描仪、阅片端和归档系统中"
  ],
  page++
);

bulletSlide(
  "解决思路",
  "以软件平台为中枢，将扫描、阅片、AI、质控、会诊和科研连接成一体。",
  [
    "统一接入扫描仪、LIS、AI 模型和会诊系统",
    "构建病例、切片、诊断、质控、归档的全流程闭环",
    "用 AI 提升筛查、提示、复核和教学效率",
    "将数据沉淀为医院长期可复用的病理资产"
  ],
  page++
);

bulletSlide(
  "能力框架",
  "数字病理平台应具备四层能力：连接、流程、智能、治理。",
  [
    "连接层：扫描仪、LIS、存储、AI、远程会诊",
    "流程层：登记、取材、制片、扫描、阅片、报告、归档",
    "智能层：AI 辅助诊断、质控提示、科研检索、教学训练",
    "治理层：CAP、ISO 15189、权限、日志、质控与数据安全"
  ],
  page++
);

bulletSlide(
  "为什么不是硬件竞争",
  "硬件可替换，软件能力决定长期运营价值。",
  [
    "不同扫描仪可以完成图像采集，但平台能力差异决定后续价值",
    "医院真正需要的是可运营、可扩展、可质控的病理数字化体系",
    "软件平台越强，越能降低设备绑定风险和后期升级成本"
  ],
  page++
);

bulletSlide(
  "实施路径",
  "建议采用分阶段建设方式，从数字化入口逐步走向智能化闭环。",
  [
    "阶段一：完成切片扫描、数字阅片和归档",
    "阶段二：接入 LIS、远程会诊、质控管理和数据看板",
    "阶段三：部署 AI 辅助诊断、科研教学和区域协同能力",
    "阶段四：建立长期数据治理和持续运营机制"
  ],
  page++
);

bulletSlide(
  "结论",
  "数字病理建设的本质，是 AI 与软件驱动的能力升级。",
  [
    "硬件是基础，软件是中枢，AI 是增量能力",
    "医院采购不应只比较扫描参数，更应比较平台能力",
    "未来竞争的核心，是谁能帮助病理科形成持续进化的数智化能力"
  ],
  page++
);

const pptPath = path.join(out, "ppt-factory-demo.pptx");
const outlinePath = path.join(out, "outline.md");
const notesPath = path.join(out, "speaker-notes.md");

fs.writeFileSync(outlinePath, `# PPT Outline

Topic: ${topic}

Slides:
1. Cover
2. 核心观点
3. 行业痛点
4. 解决思路
5. 能力框架
6. 为什么不是硬件竞争
7. 实施路径
8. 结论
`);

fs.writeFileSync(notesPath, `# Speaker Notes

## Opening
今天我们讨论的核心不是数字病理扫描仪本身，而是病理科如何通过 AI 与软件完成能力升级。

## Key Message
硬件是入口，软件是中枢，AI 是增量能力。

## Closing
未来数字病理项目的成败，不取决于单台设备参数，而取决于平台能否支撑长期运营、质量体系和智能化升级。
`);

pptx.writeFile({ fileName: pptPath }).then(() => {
  console.log("✅ PPT generated:");
  console.log(pptPath);
  console.log("✅ outline:");
  console.log(outlinePath);
  console.log("✅ speaker notes:");
  console.log(notesPath);
});
