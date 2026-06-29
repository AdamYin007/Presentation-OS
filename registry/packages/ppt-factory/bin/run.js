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

const C = {
  navy: "0F172A",
  blue: "2563EB",
  lightBlue: "EFF6FF",
  gray: "64748B",
  lightGray: "F8FAFC",
  border: "E2E8F0",
  green: "059669",
  orange: "EA580C",
  red: "DC2626",
  white: "FFFFFF"
};

function footer(slide, n) {
  slide.addText(`AWE Presentation OS · ${story.style} · ${n}`, {
    x: 0.55,
    y: 7.12,
    w: 5,
    h: 0.2,
    fontSize: 8,
    color: "94A3B8",
    margin: 0
  });
}

function title(slide, text, sub) {
  slide.addText(text, {
    x: 0.55,
    y: 0.35,
    w: 11.8,
    h: 0.45,
    fontSize: 24,
    bold: true,
    color: C.navy,
    margin: 0
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.57,
      y: 0.9,
      w: 11.4,
      h: 0.35,
      fontSize: 12,
      color: C.gray,
      margin: 0
    });
  }
}

function card(slide, x, y, w, h, header, body, color = C.blue) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.08,
    fill: { color },
    line: { color }
  });
  slide.addText(header, {
    x: x + 0.18,
    y: y + 0.22,
    w: w - 0.36,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color: C.navy,
    margin: 0
  });
  slide.addText(body, {
    x: x + 0.18,
    y: y + 0.72,
    w: w - 0.36,
    h: h - 0.9,
    fontSize: 10.5,
    color: C.gray,
    fit: "shrink",
    margin: 0
  });
}

function cover(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.lightGray };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 4.2,
    h: 7.5,
    fill: { color: C.navy },
    line: { color: C.navy }
  });
  slide.addText("DIGITAL\nPATHOLOGY", {
    x: 0.55,
    y: 0.65,
    w: 3.1,
    h: 1.3,
    fontSize: 24,
    bold: true,
    color: C.white,
    margin: 0,
    breakLine: false
  });
  slide.addText(s.title, {
    x: 4.75,
    y: 2.05,
    w: 7.7,
    h: 1.1,
    fontSize: 32,
    bold: true,
    color: C.navy,
    margin: 0,
    fit: "shrink"
  });
  slide.addText(s.message, {
    x: 4.78,
    y: 3.42,
    w: 7,
    h: 0.45,
    fontSize: 15,
    color: C.gray,
    margin: 0
  });
  slide.addText(story.audience, {
    x: 4.78,
    y: 6.35,
    w: 5.5,
    h: 0.25,
    fontSize: 10,
    color: "94A3B8",
    margin: 0
  });
}

function executive(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  card(slide, 0.75, 2.05, 3.6, 2.3, "01 不是设备采购", "数字病理建设不能停留在扫描仪参数比较，而应转向平台能力建设。", C.blue);
  card(slide, 4.85, 2.05, 3.6, 2.3, "02 软件是中枢", "平台连接 LIS、阅片、AI、质控、归档与会诊，决定长期价值。", C.green);
  card(slide, 8.95, 2.05, 3.6, 2.3, "03 AI 是增量能力", "AI 嵌入诊断工作流，提升效率、质量、科研和区域协同能力。", C.orange);
  footer(slide, s.no);
}

function whyNow(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  ["诊断需求增长", "病理医生稀缺", "AI 技术成熟", "区域协同需求"].forEach((t, i) => {
    card(slide, 0.8 + i * 3.05, 2.05, 2.55, 2.4, t, ["肿瘤诊疗增长推动病理需求持续上升。", "优质病理资源分布不均，基层能力不足。", "AI 已从算法演示进入工作流整合阶段。", "医联体和远程会诊需要统一数字底座。"][i], [C.blue, C.green, C.orange, C.red][i]);
  });
  footer(slide, s.no);
}

function problem(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.lightGray };
  title(slide, s.title, s.message);
  const items = [
    ["效率瓶颈", "玻片流转、人工阅片和报告周期压力增加"],
    ["质控瓶颈", "过程记录分散，复核和追溯成本高"],
    ["协同瓶颈", "远程会诊、区域病理和多院区协同困难"],
    ["数据瓶颈", "切片、诊断和科研数据难以沉淀复用"]
  ];
  items.forEach((it, i) => {
    card(slide, i % 2 === 0 ? 1.1 : 6.9, i < 2 ? 1.75 : 4.05, 5.1, 1.55, it[0], it[1], i % 2 === 0 ? C.blue : C.orange);
  });
  footer(slide, s.no);
}

function transformation(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  const xs = [0.9, 4.7, 8.5];
  const heads = ["硬件数字化", "平台流程化", "AI 智能化"];
  const bodies = ["完成切片扫描与图像采集", "打通业务流程、质控与协同", "形成辅助诊断与数据资产能力"];
  heads.forEach((h, i) => {
    card(slide, xs[i], 2.35, 3.1, 2.0, h, bodies[i], [C.gray, C.blue, C.green][i]);
    if (i < 2) {
      slide.addText("→", { x: xs[i] + 3.25, y: 3.08, w: 0.6, h: 0.4, fontSize: 28, color: C.blue, margin: 0 });
    }
  });
  footer(slide, s.no);
}

function platformHub(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.0,
    y: 2.45,
    w: 3.2,
    h: 1.45,
    fill: { color: C.blue },
    line: { color: C.blue }
  });
  slide.addText("数字病理\n软件平台", {
    x: 5.45,
    y: 2.78,
    w: 2.3,
    h: 0.7,
    fontSize: 20,
    bold: true,
    color: C.white,
    align: "center",
    margin: 0
  });
  const nodes = [
    ["LIS", 1.0, 1.75], ["扫描仪", 3.2, 4.65], ["AI 模型", 5.2, 5.35],
    ["数字阅片", 8.8, 4.65], ["质控", 10.2, 1.75], ["归档/会诊", 1.0, 5.0]
  ];
  nodes.forEach(([n, x, y]) => card(slide, x, y, 2.0, 0.85, n, "", C.green));
  footer(slide, s.no);
}

function layered(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.lightGray };
  title(slide, s.title, s.message);
  const layers = [
    ["应用层", "阅片、AI、会诊、科研、教学"],
    ["平台层", "流程编排、质控、权限、日志、接口"],
    ["数据层", "切片、病例、诊断、标注、模型结果"],
    ["连接层", "LIS、扫描仪、存储、AI、院内系统"]
  ];
  layers.forEach((l, i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.4,
      y: 1.75 + i * 1.05,
      w: 10.4,
      h: 0.75,
      rectRadius: 0.06,
      fill: { color: i === 0 ? C.blue : C.white },
      line: { color: C.border, width: 1 }
    });
    slide.addText(l[0], { x: 1.75, y: 1.96 + i * 1.05, w: 1.6, h: 0.25, fontSize: 15, bold: true, color: i === 0 ? C.white : C.navy, margin: 0 });
    slide.addText(l[1], { x: 3.55, y: 1.96 + i * 1.05, w: 7.6, h: 0.25, fontSize: 13, color: i === 0 ? C.white : C.gray, margin: 0 });
  });
  footer(slide, s.no);
}

function roadmap(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  const stages = [
    ["阶段一", "扫描阅片", "完成数字化入口"],
    ["阶段二", "平台协同", "打通流程与质控"],
    ["阶段三", "AI 应用", "接入辅助诊断与科研"],
    ["阶段四", "区域运营", "形成会诊与数据资产"]
  ];
  stages.forEach((st, i) => {
    const x = 0.9 + i * 3.05;
    slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.85, y: 2.0, w: 0.75, h: 0.75, fill: { color: C.blue }, line: { color: C.blue } });
    slide.addText(String(i + 1), { x: x + 1.07, y: 2.19, w: 0.3, h: 0.25, fontSize: 15, bold: true, color: C.white, margin: 0 });
    card(slide, x, 3.05, 2.55, 1.7, st[1], st[2], C.blue);
    slide.addText(st[0], { x, y: 1.55, w: 2.55, h: 0.25, fontSize: 12, color: C.gray, align: "center", margin: 0 });
  });
  slide.addShape(pptx.ShapeType.line, { x: 1.75, y: 2.38, w: 9.1, h: 0, line: { color: C.border, width: 2 } });
  footer(slide, s.no);
}

function generic(s) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  title(slide, s.title, s.message);
  card(slide, 0.9, 2.0, 3.4, 2.1, "核心价值", "围绕业务流程形成持续改进能力。", C.blue);
  card(slide, 4.9, 2.0, 3.4, 2.1, "平台能力", "连接数据、应用、AI 与治理体系。", C.green);
  card(slide, 8.9, 2.0, 3.4, 2.1, "长期演进", "支撑科研、教学、区域协同与智能化升级。", C.orange);
  footer(slide, s.no);
}

function renderSlide(s) {
  if (s.type === "cover") return cover(s);
  if (s.type === "executive-summary") return executive(s);
  if (s.type === "why-now") return whyNow(s);
  if (s.type === "problem") return problem(s);
  if (s.type === "transformation") return transformation(s);
  if (s.type === "solution") return platformHub(s);
  if (s.type === "architecture") return layered(s);
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
