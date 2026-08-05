#!/usr/bin/env node
/**
 * TEMPLATE-STYLE v4 — matches 91360 template look & feel
 *
 * Template design tokens (from visual analysis of the real template):
 * - Background: WHITE / very light (#FFFFFF → #F0F7FB)
 * - Title color: deep navy #17406D (bold, 微软雅黑)
 * - Subtitle: navy lighter
 * - Accent teal: #00B4D8 (decor bars, logo)
 * - Accent green: #7CB342 / #40B8A0 (title highlights)
 * - Bottom image band: city/medical photo with navy tone (~15% height)
 * - Top-left: thin teal-green gradient vertical bar
 * - Logo top-right, page number "- N -" bottom-right
 * - Red accent #D32F2F allowed for emphasis text (template uses it)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const C = {
  navy: "17406D",
  navyMid: "2E5C8A",
  teal: "00B4D8",
  green: "7CB342",
  greenTeal: "40B8A0",
  red: "D32F2F",
  white: "FFFFFF",
  lightBg: "F0F7FB",
  gray: "444444",
  lightGray: "888888",
};

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const SAFE_BOTTOM = 5.4;

const slides = [
  { section: "SHENYANG MEDICAL COLLEGE", title: "沈阳医学院附属中心医院", key: "数智病理科建设方案", body: "项目背景 · 建设目标 · 技术方案 · 预期效益" },
  { section: "CONTENTS", title: "汇报提纲", key: "数智病理科建设总体汇报", body: "01 项目背景  02 建设目标  03 技术方案  04 预期效益" },
  { section: "PROJECT BACKGROUND", title: "项目背景", key: "提升病理诊断效率与准确性", body: "传统病理诊断效率低 · 人才缺口大 · 远程会诊能力不足" },
  { section: "GOALS", title: "建设目标", key: "打造数智化病理科", body: "全流程数字化 · AI 辅助诊断 · 远程会诊平台 · 数据资产化" },
  { section: "SOLUTION", title: "总体技术方案", key: "四大核心技术模块", body: "扫描仪 · AI 诊断 · 远程会诊 · 数据安全" },
  { section: "SCANNER", title: "数字病理扫描仪", key: "高分辨率全切片成像", body: "20x-40x 物镜 · 全自动连续扫描 · 30 秒/张" },
  { section: "AI DIAGNOSIS", title: "AI 辅助诊断系统", key: "深度学习辅助诊断", body: "宫颈细胞学 AI 筛查 · 病灶识别 · 临床验证" },
  { section: "REMOTE CONSULTATION", title: "远程会诊平台", key: "连接基层与上级医院", body: "区域联动 · 多方会诊 · 质控与教育" },
  { section: "BENEFITS", title: "预期效益", key: "多维度价值提升", body: "效率 +50% · 准确率提升 · 覆盖 10+ 机构 · 数据资产" },
  { section: "THANK YOU", title: "谢谢聆听", key: "数智病理 · 服务临床", body: "沈阳医学院附属中心医院" },
];

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  const logoPath = path.join(outputDir, "assets", "91360-logo.png");

  const slideImages = fs.readdirSync(outputDir)
    .filter((f) => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.replace("slide-", "")) - parseInt(b.replace("slide-", "")));

  console.log(`Found ${slideImages.length} AI images`);
  if (!fs.existsSync(logoPath)) { console.error("Logo missing:", logoPath); process.exit(1); }
  const logoBuf = fs.readFileSync(logoPath);

  const pptx = new PptxGenJS();
  pptx.author = "AWE Presentation-OS";
  pptx.title = "沈阳医学院附属中心医院数智病理科建设方案";
  pptx.company = "沈阳医学院附属中心医院";

  pptx.defineLayout({ name: "WIDE_16x9", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "WIDE_16x9";

  for (let i = 0; i < slides.length && i < slideImages.length; i++) {
    const spec = slides[i];
    const imgPath = path.join(outputDir, slideImages[i]);
    if (!fs.existsSync(imgPath)) { console.log(`skip ${imgPath}`); continue; }

    const slide = pptx.addSlide();
    const imgBuf = fs.readFileSync(imgPath);

    // 1. Full-bleed light bg (bottom)
    slide.addImage({
      data: "data:image/jpeg;base64," + imgBuf.toString("base64"),
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      sizing: { type: "cover", w: SLIDE_W, h: SLIDE_H },
    });

    // 2. Top-left teal-green gradient vertical bar (template signature)
    // 4 thin strips simulate gradient (teal -> green)
    const barX = 0;
    const barW = 0.14;
    slide.addShape(pptx.ShapeType.rect, { x: barX, y: 0, w: barW, h: SLIDE_H, fill: { color: C.teal }, line: { type: "none" } });
    slide.addShape(pptx.ShapeType.rect, { x: barX, y: 0, w: barW * 0.75, h: SLIDE_H, fill: { color: "008FB0" }, line: { type: "none" } });
    slide.addShape(pptx.ShapeType.rect, { x: barX, y: 0, w: barW * 0.5, h: SLIDE_H, fill: { color: C.greenTeal }, line: { type: "none" } });
    slide.addShape(pptx.ShapeType.rect, { x: barX, y: 0, w: barW * 0.25, h: SLIDE_H, fill: { color: C.green }, line: { type: "none" } });

    // 3. Section label (top, small, gray)
    slide.addText(spec.section, {
      x: 0.45, y: 0.35, w: 6.5, h: 0.4,
      fontSize: 12, fontFace: "Arial",
      color: C.lightGray, align: "left", valign: "middle",
      charSpacing: 2, margin: 0,
    });

    // 4. Logo top-right
    slide.addImage({
      data: "data:image/png;base64," + logoBuf.toString("base64"),
      x: SLIDE_W - 2.4, y: 0.28, w: 2.2, h: 0.28,
      sizing: { type: "contain", w: 2.2, h: 0.28 },
    });

    // 5. Title (navy, bold, big) — template style
    slide.addText(spec.title, {
      x: 0.6, y: 2.05, w: 8.6, h: 0.95,
      fontSize: 36, bold: true,
      fontFace: "微软雅黑",
      color: C.navy, align: "left", valign: "middle",
      margin: 0,
    });

    // 6. Teal accent line under title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.63, y: 3.12, w: 1.6, h: 0.05,
      fill: { color: C.teal },
      line: { type: "none" },
    });

    // 7. Key message (navy mid)
    slide.addText(spec.key, {
      x: 0.63, y: 3.3, w: 8.5, h: 0.55,
      fontSize: 18, fontFace: "微软雅黑",
      color: C.navyMid, align: "left", valign: "middle",
      margin: 0,
    });

    // 8. Body (gray, bottom of content zone)
    slide.addText(spec.body, {
      x: 0.63, y: 3.95, w: 8.5, h: 0.45,
      fontSize: 14, fontFace: "微软雅黑",
      color: C.gray, align: "left", valign: "middle",
      margin: 0,
    });

    // 9. Page number "- N -" bottom-right (template style)
    slide.addText(`- ${i + 1} -`, {
      x: SLIDE_W - 1.3, y: SLIDE_H - 0.5, w: 0.9, h: 0.3,
      fontSize: 11, color: C.navyMid, align: "right",
      margin: 0,
    });

    console.log(`✓ Slide ${i + 1}: ${spec.title}`);
  }

  const outPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: outPath });
  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ PPTX saved: ${outPath} (${mb} MB, ${slides.length} slides)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
