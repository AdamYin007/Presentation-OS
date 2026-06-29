#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const comp = require("../../../../components");

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const storyName = getArg("story", "digital-pathology-15");
const out = getArg("out", path.join(process.cwd(), "output", "ppt-factory"));
const storyPath = path.join(process.cwd(), "registry/packages/ppt-factory/story", storyName + ".json");

if (!fs.existsSync(storyPath)) {
  console.error("❌ story not found:", storyPath);
  process.exit(1);
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

fs.mkdirSync(out, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AWE Presentation OS";

pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "zh-CN"
};

const { getSlide, bg } = require("../src/layout/base");

// ── Slide Renderers ──────────────────────────────────────

function cover(s) {
  const slide = getSlide(pptx);
  bg(slide, comp.C.lightGray);
  slide.addShape('rect', {
    x: 0, y: 0, w: 4.2, h: 7.5,
    fill: { color: comp.C.navy },
    line: { color: comp.C.navy }
  });
  slide.addText("DIGITAL\nPATHOLOGY", {
    x: 0.55, y: 0.65, w: 3.1, h: 1.3,
    fontSize: 24, bold: true, color: comp.C.white, margin: 0, breakLine: false
  });
  slide.addText(s.title, {
    x: 4.75, y: 2.05, w: 7.7, h: 1.1,
    fontSize: 32, bold: true, color: comp.C.navy, margin: 0, fit: "shrink"
  });
  slide.addText(s.message, {
    x: 4.78, y: 3.42, w: 7, h: 0.45,
    fontSize: 15, color: comp.C.gray, margin: 0
  });
  slide.addText(story.audience, {
    x: 4.78, y: 6.35, w: 5.5, h: 0.25,
    fontSize: 10, color: "94A3B8", margin: 0
  });
}

function executive(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  comp.card(slide, 0.75, 2.05, 3.6, 2.3, "01 不是设备采购",
    "数字病理建设不能停留在扫描仪参数比较，而应转向平台能力建设。", comp.C.blue, pptx);
  comp.card(slide, 4.85, 2.05, 3.6, 2.3, "02 软件是中枢",
    "平台连接 LIS、阅片、AI、质控、归档与会诊，决定长期价值。", comp.C.green, pptx);
  comp.card(slide, 8.95, 2.05, 3.6, 2.3, "03 AI 是增量能力",
    "AI 嵌入诊断工作流，提升效率、质量、科研和区域协同能力。", comp.C.orange, pptx);
  comp.makeFooter(slide, pptx, story, s.no);
}

function whyNow(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  const items = [
    ["诊断需求增长", "肿瘤诊疗增长推动病理需求持续上升。", comp.C.blue],
    ["病理医生稀缺", "优质病理资源分布不均，基层能力不足。", comp.C.green],
    ["AI 技术成熟", "AI 已从算法演示进入工作流整合阶段。", comp.C.orange],
    ["区域协同需求", "医联体和远程会诊需要统一数字底座。", comp.C.red]
  ];
  items.forEach((it, i) => {
    comp.card(slide, 0.8 + i * 3.05, 2.05, 2.55, 2.4, it[0], it[1], it[2], pptx);
  });
  comp.makeFooter(slide, pptx, story, s.no);
}

function problem(s) {
  const slide = getSlide(pptx);
  bg(slide, comp.C.lightGray);
  comp.makeTitle(slide, s.title, s.message);
  const items = [
    ["效率瓶颈", "玻片流转、人工阅片和报告周期压力增加", comp.C.blue],
    ["质控瓶颈", "过程记录分散，复核和追溯成本高", comp.C.orange],
    ["协同瓶颈", "远程会诊、区域病理和多院区协同困难", comp.C.blue],
    ["数据瓶颈", "切片、诊断和科研数据难以沉淀复用", comp.C.orange]
  ];
  items.forEach((it, i) => {
    comp.card(slide, i % 2 === 0 ? 1.1 : 6.9, i < 2 ? 1.75 : 4.05, 5.1, 1.55, it[0], it[1], it[2], pptx);
  });
  comp.makeFooter(slide, pptx, story, s.no);
}

function transformation(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  const heads = ["硬件数字化", "平台流程化", "AI 智能化"];
  const bodies = ["完成切片扫描与图像采集", "打通业务流程、质控与协同", "形成辅助诊断与数据资产能力"];
  heads.forEach((h, i) => {
    comp.card(slide, 0.9 + i * 3.5, 2.35, 3.1, 2.0, h, bodies[i], comp.C.gray, pptx);
    if (i < 2) {
      slide.addText("→", {
        x: 0.9 + i * 3.5 + 3.25, y: 3.08, w: 0.6, h: 0.4,
        fontSize: 28, color: comp.C.blue, margin: 0
      });
    }
  });
  comp.makeFooter(slide, pptx, story, s.no);
}

function platformHubSlide(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  comp.platformHub(slide, "数字病理\n软件平台", [
    { label: "LIS", x: 1.0, y: 1.75 },
    { label: "扫描仪", x: 3.2, y: 4.65 },
    { label: "AI 模型", x: 5.2, y: 5.35 },
    { label: "数字阅片", x: 8.8, y: 4.65 },
    { label: "质控", x: 10.2, y: 1.75 },
    { label: "归档/会诊", x: 1.0, y: 5.0 }
  ], pptx);
  comp.makeFooter(slide, pptx, story, s.no);
}

function layeredArchSlide(s) {
  const slide = getSlide(pptx);
  bg(slide, comp.C.lightGray);
  comp.makeTitle(slide, s.title, s.message);
  const layers = [
    { name: "应用层", desc: "阅片、AI、会诊、科研、教学", color: comp.C.blue },
    { name: "平台层", desc: "流程编排、质控、权限、日志、接口" },
    { name: "数据层", desc: "切片、病例、诊断、标注、模型结果" },
    { name: "连接层", desc: "LIS、扫描仪、存储、AI、院内系统" }
  ];
  comp.layeredArchitecture(slide, layers, pptx);
  comp.makeFooter(slide, pptx, story, s.no);
}

function roadmap(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  const stages = [
    { label: "阶段一", title: "扫描阅片", body: "完成数字化入口", color: comp.C.blue },
    { label: "阶段二", title: "平台协同", body: "打通流程与质控", color: comp.C.cyan },
    { label: "阶段三", title: "AI 应用", body: "接入辅助诊断与科研", color: comp.C.green },
    { label: "阶段四", title: "区域运营", body: "形成会诊与数据资产", color: comp.C.orange }
  ];
  comp.timeline(slide, stages, pptx);
  comp.makeFooter(slide, pptx, story, s.no);
}

function generic(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  comp.card(slide, 0.9, 2.0, 3.4, 2.1, "核心价值",
    "围绕业务流程形成持续改进能力。", comp.C.blue, pptx);
  comp.card(slide, 4.9, 2.0, 3.4, 2.1, "平台能力",
    "连接数据、应用、AI 与治理体系。", comp.C.green, pptx);
  comp.card(slide, 8.9, 2.0, 3.4, 2.1, "长期演进",
    "支撑科研、教学、区域协同与智能化升级。", comp.C.orange, pptx);
  comp.makeFooter(slide, pptx, story, s.no);
}

function renderSlide(s) {
  if (s.type === "cover") return cover(s);
  if (s.type === "executive-summary") return executive(s);
  if (s.type === "why-now") return whyNow(s);
  if (s.type === "problem") return problem(s);
  if (s.type === "transformation") return transformation(s);
  if (s.type === "solution") return platformHubSlide(s);
  if (s.type === "architecture") return layeredArchSlide(s);
  if (s.type === "roadmap") return roadmap(s);
  return generic(s);
}

story.slides.forEach(renderSlide);

const pptPath = path.join(out, `${story.name}.pptx`);
const planPath = path.join(out, `${story.name}-slide-plan.json`);

fs.writeFileSync(planPath, JSON.stringify(story, null, 2));

pptx.writeFile({ fileName: pptPath }).then(() => {
  console.log("✅ PPT generated:");
  console.log(pptPath);
  console.log("✅ slide plan:");
  console.log(planPath);
});
