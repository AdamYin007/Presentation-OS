#!/usr/bin/env node
/**
 * POLISHED v3 — Professional layout per pptxgenjs-template-workflow skill
 *
 * Layout (10 × 5.625 in):
 * - Header bar top: 0.95" navy with teal accent line + section label
 * - Content zone: y 1.1–5.4"
 * - LEFT 45%: title + key message + body (on the bg's clean navy zone)
 * - RIGHT 55%: the bg's visual motif breathes
 * - Logo top-right, page number bottom-right
 *
 * Design tokens (medical-tech custom theme):
 * - Navy bg      #0A2540
 * - Blue         #134B6E
 * - Accent teal  #39C2D4
 * - Accent line  #5FA8D3
 * - Text white   #FFFFFF
 * - Body light   #D8E8F5
 */

"use strict";

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const C = {
  navy: "0A2540",
  blue: "134B6E",
  teal: "39C2D4",
  accent: "5FA8D3",
  white: "FFFFFF",
  body: "D8E8F5",
  soft: "9FB8D0",
};

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const HEADER_H = 0.95;
const SAFE_BOTTOM = 5.4;

const slides = [
  { section: "SHENYANG MEDICAL COLLEGE", title: "沈阳医学院附属中心医院", key: "数智病理科建设方案", body: "项目背景 · 建设目标 · 技术方案 · 预期效益" },
  { section: "AGENDA", title: "汇报提纲", key: "数智病理科建设总体汇报", body: "01 项目背景  02 建设目标  03 技术方案  04 预期效益" },
  { section: "PROJECT BACKGROUND", title: "项目背景", key: "提升病理诊断效率与准确性", body: "传统病理诊断效率低 · 人才缺口大 · 远程会诊能力不足" },
  { section: "GOALS", title: "建设目标", key: "打造数智化病理科", body: "全流程数字化 · AI 辅助诊断 · 远程会诊平台 · 数据资产化" },
  { section: "SOLUTION", title: "总体技术方案", key: "四大核心技术模块", body: "扫描仪 · AI 诊断 · 远程会诊 · 数据安全" },
  { section: "SCANNER", title: "数字病理扫描仪", key: "高分辨率全切片成像", body: "20x-40x 物镜 · 全自动连续扫描 · 30 秒/张" },
  { section: "AI DIAGNOSIS", title: "AI 辅助诊断系统", key: "深度学习辅助诊断", body: "宫颈细胞学 AI 筛查 · 病灶识别 · 临床验证" },
  { section: "REMOTE CONSULTATION", title: "远程会诊平台", key: "连接基层与上级医院", body: "区域联动 · 多方会诊 · 质控与教育" },
  { section: "BENEFITS", title: "预期效益", key: "多维度价值提升", body: "效率 +50% · 准确率提升 · 覆盖 10+ 机构 · 数据资产" },
  { section: "THANK YOU", title: "谢谢聆听", key: "数智病理 · 服务临床", body: "沈阳医学院附属中心医院" },
];

// fresh shadow object each call (PptxGenJS mutates in place)
const makeShadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.2 });

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

    // 1. Full-bleed bg (bottom)
    slide.addImage({
      data: "data:image/jpeg;base64," + imgBuf.toString("base64"),
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      sizing: { type: "cover", w: SLIDE_W, h: SLIDE_H },
    });

    // 2. Header bar (navy, semi-transparent so bg shows through)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
      fill: { color: C.navy, transparency: 15 },
      line: { type: "none" },
    });
    // teal accent line under header
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: HEADER_H - 0.04, w: SLIDE_W, h: 0.04,
      fill: { color: C.teal, transparency: 30 },
      line: { type: "none" },
    });
    // section label top-left
    slide.addText(spec.section, {
      x: 0.6, y: 0.22, w: 6.5, h: 0.5,
      fontSize: 13, fontFace: "Arial",
      color: C.soft, align: "left", valign: "middle",
      charSpacing: 2, margin: 0,
    });

    // 3. Logo top-right
    slide.addImage({
      data: "data:image/png;base64," + logoBuf.toString("base64"),
      x: SLIDE_W - 2.3, y: 0.3, w: 2.1, h: 0.26,
      sizing: { type: "contain", w: 2.1, h: 0.26 },
    });

    // 4. Title (left zone, big)
    slide.addText(spec.title, {
      x: 0.65, y: 2.0, w: 4.4, h: 1.1,
      fontSize: 34, bold: true,
      fontFace: "微软雅黑",
      color: C.white, align: "left", valign: "middle",
      margin: 0, shadow: makeShadow(),
    });

    // 5. Teal accent line under title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.68, y: 3.25, w: 1.3, h: 0.045,
      fill: { color: C.teal },
      line: { type: "none" },
    });

    // 6. Key message
    slide.addText(spec.key, {
      x: 0.68, y: 3.45, w: 4.3, h: 0.55,
      fontSize: 16, fontFace: "微软雅黑",
      color: C.body, align: "left", valign: "middle",
      margin: 0,
    });

    // 7. Body line (bottom of left zone)
    slide.addText(spec.body, {
      x: 0.68, y: 4.85, w: 4.3, h: 0.42,
      fontSize: 13, fontFace: "微软雅黑",
      color: C.soft, align: "left", valign: "middle",
      margin: 0,
    });

    // 8. Page number bottom-right
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: SLIDE_W - 0.85, y: SLIDE_H - 0.45, w: 0.5, h: 0.26,
      fontSize: 11, color: C.soft, align: "right",
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
