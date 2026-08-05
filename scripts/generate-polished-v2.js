#!/usr/bin/env node
/**
 * POLISHED v2 — Premium design layout
 *
 * Design upgrades vs v1 (from aesthetic diagnosis):
 * 1. NO L-shaped color blocks (remove left vertical bar + hard bottom bar)
 * 2. Soft gradient title zone instead of flat navy bar
 * 3. Big title top-left (large negative space in bg image)
 * 4. Thin accent line + subtle footer, minimal
 * 5. Logo top-right, small and unobtrusive
 * 6. Page number bottom-right, light
 * 7. No duplicated title/keyMessage in footer
 */

"use strict";

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const NAVY = "0A2540";
const BLUE = "134B6E";
const LIGHT = "7FB4D9";
const WHITE = "FFFFFF";
const GOLD = "C9A96A"; // subtle premium accent

const slides = [
  { title: "沈阳医学院附属中心医院", keyMessage: "数智病理科建设方案", body: "项目背景 · 建设目标 · 技术方案 · 预期效益" },
  { title: "汇报提纲", keyMessage: "AGENDA", body: "数智病理科建设总体汇报" },
  { title: "项目背景", keyMessage: "PROJECT BACKGROUND", body: "传统病理诊断效率低 · 人才缺口大 · 远程会诊能力不足" },
  { title: "建设目标", keyMessage: "GOALS", body: "全流程数字化 · AI 辅助诊断 · 远程会诊平台 · 数据资产化" },
  { title: "总体技术方案", keyMessage: "SOLUTION", body: "扫描仪 · AI 诊断 · 远程会诊 · 数据安全" },
  { title: "数字病理扫描仪", keyMessage: "SCANNER", body: "20x-40x 物镜 · 全自动连续扫描 · 30 秒/张" },
  { title: "AI 辅助诊断系统", keyMessage: "AI DIAGNOSIS", body: "宫颈细胞学 AI 筛查 · 病灶识别 · 临床验证" },
  { title: "远程会诊平台", keyMessage: "REMOTE CONSULTATION", body: "区域联动 · 多方会诊 · 质控与教育" },
  { title: "预期效益", keyMessage: "BENEFITS", body: "效率 +50% · 准确率提升 · 覆盖 10+ 机构 · 数据资产" },
  { title: "谢谢聆听", keyMessage: "THANK YOU", body: "沈阳医学院附属中心医院 · 数智病理科" },
];

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  const logoPath = path.join(outputDir, "assets", "91360-logo.png");

  const slideImages = fs.readdirSync(outputDir)
    .filter(f => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.replace("slide-", "")) - parseInt(b.replace("slide-", "")));

  console.log(`Found ${slideImages.length} AI images`);
  if (!fs.existsSync(logoPath)) { console.error("Logo missing:", logoPath); process.exit(1); }
  const logoBuf = fs.readFileSync(logoPath);

  const pptx = new PptxGenJS();
  pptx.author = "AWE Presentation-OS";
  pptx.title = "沈阳医学院附属中心医院数智病理科建设方案";
  pptx.company = "沈阳医学院附属中心医院";

  pptx.defineLayout({ name: "WIDE_16x9", width: 10, height: 5.625 });
  pptx.layout = "WIDE_16x9";

  const W = 10;
  const H = 5.625;

  for (let i = 0; i < slides.length && i < slideImages.length; i++) {
    const spec = slides[i];
    const imgPath = path.join(outputDir, slideImages[i]);
    if (!fs.existsSync(imgPath)) { console.log(`skip ${imgPath}`); continue; }

    const slide = pptx.addSlide();
    const imgBuf = fs.readFileSync(imgPath);

    // Full-bleed premium bg (bottom layer)
    slide.addImage({
      data: "data:image/jpeg;base64," + imgBuf.toString("base64"),
      x: 0, y: 0, w: W, h: H,
      sizing: { type: "cover", w: W, h: H },
    });

    // Soft dark gradient scrim on LEFT for text readability
    // layered rects simulate a smooth left-to-right fade (dark -> transparent)
    const scrim = pptx.ShapeType.rect;
    slide.addShape(scrim, {
      x: 0, y: 0, w: W * 0.62, h: H,
      fill: { color: NAVY, transparency: 52 },
      line: { type: "none" },
    });
    slide.addShape(scrim, {
      x: 0, y: 0, w: W * 0.46, h: H,
      fill: { color: "0A1F38", transparency: 48 },
      line: { type: "none" },
    });
    slide.addShape(scrim, {
      x: 0, y: 0, w: W * 0.30, h: H,
      fill: { color: "060D18", transparency: 45 },
      line: { type: "none" },
    });
    slide.addShape(scrim, {
      x: 0, y: 0, w: W * 0.14, h: H,
      fill: { color: "04080F", transparency: 35 },
      line: { type: "none" },
    });

    // Logo top-right (small, unobtrusive)
    slide.addImage({
      data: "data:image/png;base64," + logoBuf.toString("base64"),
      x: W - 1.95, y: 0.22, w: 1.75, h: 0.22,
      sizing: { type: "contain", w: 1.75, h: 0.22 },
    });

    // Title (top-left, big, white)
    slide.addText(spec.title, {
      x: 0.65, y: H * 0.30, w: 8.4, h: 0.95,
      fontSize: 40, bold: true,
      fontFace: "Microsoft YaHei",
      color: WHITE, align: "left", valign: "middle",
      margin: 0,
    });

    // Thin cool accent line under title (light blue, matches cold palette)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.68, y: H * 0.30 + 1.02, w: 1.6, h: 0.035,
      fill: { color: "5FA8D3" },
      line: { type: "none" },
    });

    // Key message (English, smaller, light)
    slide.addText(spec.keyMessage, {
      x: 0.68, y: H * 0.30 + 1.18, w: 8.4, h: 0.5,
      fontSize: 15, fontFace: "Arial",
      color: LIGHT, align: "left", valign: "middle",
      charSpacing: 3,
      margin: 0,
    });

    // Body line (bottom-left, larger & brighter for readability)
    slide.addText(spec.body, {
      x: 0.68, y: H - 0.52, w: 8.4, h: 0.4,
      fontSize: 14, fontFace: "Microsoft YaHei",
      color: "D8E8F5", align: "left", valign: "middle",
      margin: 0,
    });

    // Page number bottom-right (light)
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: W - 0.85, y: H - 0.42, w: 0.5, h: 0.26,
      fontSize: 11, color: "8FA8C0", align: "right",
      margin: 0,
    });

    console.log(`✓ Slide ${i + 1}: ${spec.title}`);
  }

  const outPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: outPath });
  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ PPTX saved: ${outPath} (${mb} MB, ${slides.length} slides)`);
}

main().catch(e => { console.error(e); process.exit(1); });
