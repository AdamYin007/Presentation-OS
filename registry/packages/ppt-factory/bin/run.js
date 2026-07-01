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
const useHero = args.includes("--hero");
const heroSeqArg = getArg("hero-sequence", null);
const forceLegacy = args.includes("--legacy-renderer") || process.env.AWE_LEGACY_RENDERER === "1";
const useLayoutEngine = !forceLegacy;
const out = getArg("out", path.join(process.cwd(), "output", "ppt-factory"));

// ── Pack validator (early exit, no runtime loading) ─────────────

const validatePackArg = getArg("validate-pack", null);
if (validatePackArg) {
  const { validatePack } = require("../src/pack-validator");
  const result = validatePack(validatePackArg);
  if (result.ok) {
    console.log("Pack validation passed");
    console.log("Pack: " + (result.manifest ? result.manifest.name : "(unknown)"));
    console.log("Version: " + (result.manifest ? result.manifest.version : "(unknown)"));
    console.log("Status: " + (result.manifest ? result.manifest.status : "(unknown)"));
    console.log("Stories: " + ((result.assets.stories || []).length));
    console.log("Hero sequences: " + ((result.assets.heroSequences || []).length));
    console.log("Terminology: " + ((result.assets.terminology || []).length));
    console.log("References: " + ((result.assets.references || []).length));
    if (result.warnings.length > 0) {
      console.log("Warnings: " + result.warnings.length);
      for (const w of result.warnings) {
        console.log("  " + w);
      }
    }
    process.exit(0);
  } else {
    console.error("Pack validation failed");
    for (const err of result.errors) {
      console.error("  Error: " + err);
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.error("  Warning: " + w);
      }
    }
    process.exit(1);
  }
}

const storyPath = path.join(process.cwd(), "registry/packages/ppt-factory/story", storyName + ".json");

if (!fs.existsSync(storyPath)) {
  console.error("❌ story not found:", storyPath);
  process.exit(1);
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

// ── Hero Engine Integration ──────────────────────────────────────

const { enrichStoryWithHero } = require("../src/hero-engine");

let heroSequence = null;
let heroSequencePath = null;

if (useHero) {
  if (heroSeqArg) {
    heroSequencePath = path.join(process.cwd(), "registry/packages/ppt-factory/story", heroSeqArg + ".json");
  } else {
    heroSequencePath = path.join(process.cwd(), "registry/packages/ppt-factory/story", storyName + "-hero-sequence.json");
  }

  if (fs.existsSync(heroSequencePath)) {
    heroSequence = JSON.parse(fs.readFileSync(heroSequencePath, "utf8"));
    const enriched = enrichStoryWithHero(story, heroSequence, { overrideTitle: true });
    Object.keys(story).forEach(k => delete story[k]);
    Object.assign(story, enriched);
    console.log("🦸 Hero Engine activated — narrative enrichment applied.");
  } else {
    console.warn("⚠️  Hero sequence file not found at:", heroSequencePath);
    console.warn("   Falling back to original story without hero enrichment.");
  }
}

// ── Layout Engine (optional) ──────────────────────────────────────

const { compileLayoutPlan } = useLayoutEngine
  ? require("../src/layout-engine")
  : { compileLayoutPlan: () => null };

const { dispatchAdapter } = useLayoutEngine
  ? require("../src/layout-adapters")
  : { dispatchAdapter: () => false };

// Pre-compile layout plans when layout engine is enabled
const layoutPlans = useLayoutEngine
  ? story.slides.map(slide => ({ slide, plan: compileLayoutPlan(slide) }))
  : [];

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
  comp.card(slide, 0.75, 2.05, 3.6, 2.3, "不是设备采购",
    "数字病理建设不能停留在扫描仪参数比较，而应转向平台能力建设。", comp.C.blue, pptx,
    { variant: "badge", badgeText: "01" });
  comp.card(slide, 4.85, 2.05, 3.6, 2.3, "软件是中枢",
    "平台连接 LIS、阅片、AI、质控、归档与会诊，决定长期价值。", comp.C.green, pptx,
    { variant: "badge", badgeText: "02" });
  comp.card(slide, 8.95, 2.05, 3.6, 2.3, "AI 是增量能力",
    "AI 嵌入诊断工作流，提升效率、质量、科研和区域协同能力。", comp.C.orange, pptx,
    { variant: "badge", badgeText: "03" });
  comp.makeFooter(slide, pptx, story, s.no);
}

function whyNow(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  const items = [
    ["诊断需求增长", "肿瘤诊疗增长推动病理需求持续上升。", comp.C.blue, "▲"],
    ["病理医生稀缺", "优质病理资源分布不均，基层能力不足。", comp.C.green, "👤"],
    ["AI 技术成熟", "AI 已从算法演示进入工作流整合阶段。", comp.C.orange, "◆"],
    ["区域协同需求", "医联体和远程会诊需要统一数字底座。", comp.C.red, "◎"]
  ];
  items.forEach((it, i) => {
    comp.card(slide, 0.8 + i * 3.05, 2.05, 2.55, 2.4, it[0], it[1], it[2], pptx,
      { variant: "icon", iconChar: it[3] });
  });
  comp.makeFooter(slide, pptx, story, s.no);
}

function problem(s) {
  const slide = getSlide(pptx);
  bg(slide, comp.C.lightGray);
  comp.makeTitle(slide, s.title, s.message);
  const items = [
    ["效率瓶颈", "玻片流转、人工阅片和报告周期压力增加", comp.C.blue, "⏱"],
    ["质控瓶颈", "过程记录分散，复核和追溯成本高", comp.C.orange, "⚠"],
    ["协同瓶颈", "远程会诊、区域病理和多院区协同困难", comp.C.blue, "🔗"],
    ["数据瓶颈", "切片、诊断和科研数据难以沉淀复用", comp.C.orange, "📊"]
  ];
  items.forEach((it, i) => {
    comp.card(slide, i % 2 === 0 ? 1.1 : 6.9, i < 2 ? 1.75 : 4.05, 5.1, 1.55, it[0], it[1], it[2], pptx,
      { variant: "icon", iconChar: it[3] });
  });
  comp.makeFooter(slide, pptx, story, s.no);
}

function transformation(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  const heads = ["硬件数字化", "平台流程化", "AI 智能化"];
  const bodies = ["完成切片扫描与图像采集", "打通业务流程、质控与协同", "形成辅助诊断与数据资产能力"];
  const icons = ["📷", "⚙", "🧠"];
  heads.forEach((h, i) => {
    comp.card(slide, 0.9 + i * 3.5, 2.35, 3.1, 2.0, h, bodies[i], comp.C.gray, pptx,
      { variant: "icon", iconChar: icons[i] });
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
    { label: "LIS", icon: "📋" },
    { label: "扫描仪", icon: "📷" },
    { label: "AI 模型", icon: "🧠" },
    { label: "数字阅片", icon: "🖥" },
    { label: "质控", icon: "✅" },
    { label: "归档/会诊", icon: "📁" }
  ], pptx, { autoLayout: true, radius: 3.8 });
  comp.makeFooter(slide, pptx, story, s.no);
}

function layeredArchSlide(s) {
  const slide = getSlide(pptx);
  bg(slide, comp.C.lightGray);
  comp.makeTitle(slide, s.title, s.message);
  const layers = [
    { name: "应用层", desc: "阅片、AI、会诊、科研、教学", color: comp.C.blue, sideLabel: "V" },
    { name: "平台层", desc: "流程编排、质控、权限、日志、接口", color: comp.C.lightBlue, sideLabel: "IV" },
    { name: "数据层", desc: "切片、病例、诊断、标注、模型结果", color: comp.C.lightBlue, sideLabel: "III" },
    { name: "连接层", desc: "LIS、扫描仪、存储、AI、院内系统", color: comp.C.lightBlue, sideLabel: "I" }
  ];
  comp.layeredArchitecture(slide, layers, pptx, { sidePanel: true, showArrows: true });
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
  comp.timeline(slide, stages, pptx, { showArrows: true, connectorWidth: 2.5 });
  comp.makeFooter(slide, pptx, story, s.no);
}

function workflow(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // AI workflow pipeline: 5 step horizontal cards with arrows
  const steps = [
    { title: "数据接入", desc: "批量/实时切片导入", color: comp.C.blue },
    { title: "预处理", desc: "去噪、配准、归一化", color: comp.C.cyan },
    { title: "AI 推理", desc: "筛查、分割、分类", color: comp.C.green },
    { title: "医生复核", desc: "人机协同诊断决策", color: comp.C.orange },
    { title: "报告归档", desc: "结构化报告与质控", color: comp.C.navy }
  ];
  const cardW = 2.0;
  const gap = 0.15;
  const totalW = steps.length * cardW + (steps.length - 1) * gap;
  const startX = (12.8 - totalW) / 2;
  const startY = 2.2;

  steps.forEach((st, i) => {
    const x = startX + i * (cardW + gap);
    comp.card(slide, x, startY, cardW, 1.3, st.title, st.desc, st.color, pptx,
      { variant: "icon", iconChar: "●" });
    // Arrow between cards
    if (i < steps.length - 1) {
      slide.addShape(pptx.ShapeType.rightArrow, {
        x: x + cardW, y: startY + 0.55,
        w: gap, h: 0.15,
        fill: { color: comp.C.border },
        line: { color: comp.C.border }
      });
    }
  });

  // Bottom insight bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 4.2, w: 11.4, h: 0.7,
    rectRadius: 0.06,
    fill: { color: comp.C.lightBlue },
    line: { color: comp.C.blue, width: 1 }
  });
  slide.addText("AI 嵌入工作流，不替代医生决策 — 每步均可追溯、可审计、可优化。", {
    x: 0.9, y: 4.3, w: 11, h: 0.5,
    fontSize: 12, color: comp.C.navy, margin: 0, bold: true
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function governance(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Closed-loop governance: 4 quadrants in a cycle
  const quadrants = [
    { title: "标准制定", desc: "CAP/ISO 15189 合规基线", color: comp.C.blue, pos: "tl" },
    { title: "过程监控", desc: "全流程质控指标实时采集", color: comp.C.cyan, pos: "tr" },
    { title: "异常处置", desc: "偏差检测、告警与闭环整改", color: comp.C.orange, pos: "br" },
    { title: "持续改进", desc: "PDCA 循环驱动质量螺旋上升", color: comp.C.green, pos: "bl" }
  ];

  const positions = {
    tl: { x: 0.7, y: 2.0 },
    tr: { x: 6.8, y: 2.0 },
    br: { x: 6.8, y: 4.3 },
    bl: { x: 0.7, y: 4.3 }
  };

  quadrants.forEach(q => {
    const pos = positions[q.pos];
    comp.card(slide, pos.x, pos.y, 5.7, 1.9, q.title, q.desc, q.color, pptx,
      { variant: "icon", iconChar: "●" });
  });

  // Cycle arrows (circular flow indicators)
  const arrowPositions = [
    { x: 6.5, y: 2.9, text: "→" },
    { x: 6.5, y: 5.2, text: "↓" },
    { x: 0.4, y: 5.2, text: "←" },
    { x: 0.4, y: 2.9, text: "↑" }
  ];
  arrowPositions.forEach(a => {
    slide.addText(a.text, {
      x: a.x, y: a.y, w: 0.3, h: 0.3,
      fontSize: 18, color: comp.C.border, margin: 0, bold: true
    });
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function research(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Data flywheel: center hub + 4 orbiting capability cards
  const cx = 6.4, cy = 3.75;
  // Center hub
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx, y: cy, w: 2.8, h: 2.0,
    fill: { color: comp.C.blue },
    line: { color: comp.C.blue }
  });
  slide.addText("病理数据\n资产", {
    x: cx + 0.3, y: cy + 0.4,
    w: 2.2, h: 1.2,
    fontSize: 18, bold: true, color: comp.C.white,
    align: "center", margin: 0, breakLine: true
  });

  // Orbiting capability cards
  const caps = [
    { label: "数字切片", x: 0.5, y: 1.5 },
    { label: "诊断标签", x: 10.5, y: 1.5 },
    { label: "病例数据", x: 0.5, y: 5.5 },
    { label: "标注集", x: 10.5, y: 5.5 }
  ];
  caps.forEach(c => {
    comp.card(slide, c.x, c.y, 2.2, 0.7, c.label, "", comp.C.green, pptx,
      { variant: "icon", iconChar: "◆" });
  });

  // Connection lines
  caps.forEach(c => {
    const dx = (c.x + 1.1) - cx;
    const dy = (c.y + 0.35) - cy;
    const len = Math.sqrt(dx*dx + dy*dy);
    const sx = cx + (dx/len) * 1.4;
    const sy = cy + (dy/len) * 1.0;
    slide.addShape(pptx.ShapeType.line, {
      x: sx, y: sy,
      w: (c.x + 1.1) - sx, h: (c.y + 0.35) - sy,
      line: { color: comp.C.border, width: 1 }
    });
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function collaboration(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Regional network: central hospital hub + satellite hospitals
  const center = { x: 6.4, y: 3.5, w: 2.4, h: 1.2 };
  slide.addShape(pptx.ShapeType.roundRect, {
    x: center.x, y: center.y, w: center.w, h: center.h,
    rectRadius: 0.08,
    fill: { color: comp.C.blue },
    line: { color: comp.C.blue }
  });
  slide.addText("区域病理\n中心", {
    x: center.x + 0.3, y: center.y + 0.25,
    w: center.w - 0.6, h: 0.7,
    fontSize: 16, bold: true, color: comp.C.white,
    align: "center", margin: 0, breakLine: true
  });

  const satellites = [
    { label: "三甲医院", x: 0.5, y: 0.8 },
    { label: "社区医院", x: 10.5, y: 0.8 },
    { label: "县级医院", x: 0.5, y: 6.0 },
    { label: "乡镇卫生院", x: 10.5, y: 6.0 }
  ];

  satellites.forEach(sat => {
    comp.card(slide, sat.x, sat.y, 2.2, 0.7, sat.label, "", comp.C.green, pptx,
      { variant: "icon", iconChar: "●" });
    // Line to center
    const dx = (sat.x + 1.1) - (center.x + center.w / 2);
    const dy = (sat.y + 0.35) - (center.y + center.h / 2);
    const len = Math.sqrt(dx*dx + dy*dy);
    const sx = center.x + center.w / 2 + (dx/len) * center.w / 2;
    const sy = center.y + center.h / 2 + (dy/len) * center.h / 2;
    slide.addShape(pptx.ShapeType.line, {
      x: sx, y: sy,
      w: (sat.x + 1.1) - sx, h: (sat.y + 0.35) - sy,
      line: { color: comp.C.border, width: 1 }
    });
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function roi(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Value bridge: 4 pillars with value metrics
  const pillars = [
    { title: "效率提升", metric: "阅片效率 +40%", desc: "缩短报告周转时间", color: comp.C.blue },
    { title: "质量改善", metric: "一致性 +25%", desc: "降低误诊漏诊率", color: comp.C.green },
    { title: "协同扩展", metric: "覆盖 3x 机构", desc: "打破地域与院区间壁垒", color: comp.C.cyan },
    { title: "科研赋能", metric: "数据资产 ×∞", desc: "从消耗品变为生产要素", color: comp.C.orange }
  ];

  const pillarW = 2.6;
  const gap = 0.3;
  const totalW = pillars.length * pillarW + (pillars.length - 1) * gap;
  const startX = (12.8 - totalW) / 2;
  const startY = 2.0;

  pillars.forEach((p, i) => {
    const x = startX + i * (pillarW + gap);
    // Pillar card
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: startY, w: pillarW, h: 2.0,
      rectRadius: 0.08,
      fill: { color: comp.C.white },
      line: { color: p.color, width: 2 }
    });
    // Color top bar
    slide.addShape(pptx.ShapeType.rect, {
      x, y: startY, w: pillarW, h: 0.08,
      fill: { color: p.color },
      line: { color: p.color }
    });
    // Title
    slide.addText(p.title, {
      x: x + 0.15, y: startY + 0.25, w: pillarW - 0.3, h: 0.35,
      fontSize: 14, bold: true, color: comp.C.navy, margin: 0
    });
    // Metric
    slide.addText(p.metric, {
      x: x + 0.15, y: startY + 0.7, w: pillarW - 0.3, h: 0.4,
      fontSize: 16, bold: true, color: p.color, margin: 0
    });
    // Description
    slide.addText(p.desc, {
      x: x + 0.15, y: startY + 1.2, w: pillarW - 0.3, h: 0.5,
      fontSize: 10, color: comp.C.gray, margin: 0
    });
  });

  // Bottom summary bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 4.8, w: 11.4, h: 0.6,
    rectRadius: 0.06,
    fill: { color: comp.C.lightBlue },
    line: { color: comp.C.blue, width: 1 }
  });
  slide.addText("数字病理 ROI 不仅是设备投入产出比，更是组织能力与数据资产的长期复利。", {
    x: 0.9, y: 4.9, w: 11, h: 0.4,
    fontSize: 11, color: comp.C.navy, margin: 0, bold: true
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function differentiation(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Comparison matrix: 3 columns (criteria vs traditional vs digital)
  const criteria = [
    { name: "建设重心", legacy: "扫描仪参数", digital: "平台能力" },
    { name: "可替换性", legacy: "硬件可更换", digital: "软件难迁移" },
    { name: "扩展性", legacy: "单点功能", digital: "模块化扩展" },
    { name: "数据价值", legacy: "消耗型投入", digital: "生产型资产" },
    { name: "合规能力", legacy: "事后追溯", digital: "全流程闭环" }
  ];

  const colW = 3.5;
  const colX = [0.7, 4.5, 8.3];
  const headers = ["评估维度", "传统病理", "数字病理"];
  const headerColors = [comp.C.navy, comp.C.gray, comp.C.blue];

  // Header row
  headers.forEach((h, i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colX[i], y: 2.0, w: colW, h: 0.45,
      rectRadius: 0.06,
      fill: { color: headerColors[i] },
      line: { color: headerColors[i], width: 1 }
    });
    slide.addText(h, {
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
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colX[0], y, w: colW * 3, h: 0.75,
      rectRadius: 0.04,
      fill: { color: i % 2 === 0 ? comp.C.white : comp.C.lightGray },
      line: { color: comp.C.border, width: 1 }
    });
    // Criteria name
    slide.addText(c.name, {
      x: colX[0] + 0.15, y: y + 0.15, w: colW - 0.3, h: 0.35,
      fontSize: 11, bold: true, color: comp.C.navy, margin: 0
    });
    // Legacy value
    slide.addText(c.legacy, {
      x: colX[1], y: y + 0.15, w: colW - 0.2, h: 0.35,
      fontSize: 10.5, color: comp.C.gray, align: "center", margin: 0
    });
    // Digital value
    slide.addText(c.digital, {
      x: colX[2], y: y + 0.15, w: colW - 0.2, h: 0.35,
      fontSize: 10.5, bold: true, color: comp.C.blue, align: "center", margin: 0
    });
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function recommendation(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);

  // Final recommendation: 3 action cards with emphasis
  const actions = [
    { title: "定位升级", desc: "从设备采购升级为平台能力建设，以软件为核心驱动力", color: comp.C.blue, priority: "首要" },
    { title: "分步实施", desc: "按扫描→平台→AI→区域的节奏渐进式部署，控制风险", color: comp.C.green, priority: "关键" },
    { title: "持续运营", desc: "建立数据资产运营体系，形成科研、教学、区域协同闭环", color: comp.C.orange, priority: "长期" }
  ];

  actions.forEach((a, i) => {
    comp.card(slide, 0.7 + i * 4.0, 2.0, 3.6, 3.2, a.title, a.desc, a.color, pptx,
      { variant: "badge", badgeText: a.priority });
  });

  // Bottom emphasis bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.8, w: 11.8, h: 0.6,
    rectRadius: 0.06,
    fill: { color: comp.C.navy },
    line: { color: comp.C.navy }
  });
  slide.addText("建议将数字病理项目定位为 AI 与软件驱动的能力升级工程", {
    x: 0.7, y: 5.9, w: 11.4, h: 0.4,
    fontSize: 14, bold: true, color: comp.C.white,
    align: "center", margin: 0
  });

  comp.makeFooter(slide, pptx, story, s.no);
}

function generic(s) {
  const slide = getSlide(pptx);
  bg(slide);
  comp.makeTitle(slide, s.title, s.message);
  comp.card(slide, 0.9, 2.0, 3.4, 2.1, "核心价值",
    "围绕业务流程形成持续改进能力。", comp.C.blue, pptx,
    { variant: "badge", badgeText: "01" });
  comp.card(slide, 4.9, 2.0, 3.4, 2.1, "平台能力",
    "连接数据、应用、AI 与治理体系。", comp.C.green, pptx,
    { variant: "badge", badgeText: "02" });
  comp.card(slide, 8.9, 2.0, 3.4, 2.1, "长期演进",
    "支撑科研、教学、区域协同与智能化升级。", comp.C.orange, pptx,
    { variant: "badge", badgeText: "03" });
  comp.makeFooter(slide, pptx, story, s.no);
}

const { createRendererEngine } = require("../src/renderer-engine");
const { registerLegacyRenderer } = require("../src/renderer-engine/registry");

// ── Register legacy renderers ──────────────────────────────────

registerLegacyRenderer("cover", cover);
registerLegacyRenderer("executive-summary", executive);
registerLegacyRenderer("why-now", whyNow);
registerLegacyRenderer("problem", problem);
registerLegacyRenderer("transformation", transformation);
registerLegacyRenderer("solution", platformHubSlide);
registerLegacyRenderer("architecture", layeredArchSlide);
registerLegacyRenderer("roadmap", roadmap);
registerLegacyRenderer("workflow", workflow);
registerLegacyRenderer("governance", governance);
registerLegacyRenderer("research", research);
registerLegacyRenderer("collaboration", collaboration);
registerLegacyRenderer("roi", roi);
registerLegacyRenderer("differentiation", differentiation);
registerLegacyRenderer("recommendation", recommendation);
registerLegacyRenderer("generic", generic);

// ── Create renderer engine ─────────────────────────────────────

const renderSlide = createRendererEngine({
  useLayoutEngine,
  layoutPlans,
  legacyRenderer: (s, comp, pptx, story) => {
    // Legacy renderers expect only slide, but we pass context
    // This wrapper adapts the signature
    const legacyFn = require("../src/renderer-engine/registry").getLegacyRenderer(s.type);
    if (legacyFn) legacyFn(s);
  },
});

// ── Render all slides ──────────────────────────────────────────

story.slides.forEach(slide => {
  renderSlide(slide, comp, pptx, story);
});

const pptPath = path.join(out, `${story.name}.pptx`);
const planPath = path.join(out, `${story.name}-slide-plan.json`);

fs.writeFileSync(planPath, JSON.stringify(story, null, 2));

pptx.writeFile({ fileName: pptPath }).then(() => {
  console.log("✅ PPT generated:");
  console.log(pptPath);
  console.log("✅ slide plan:");
  console.log(planPath);
});
