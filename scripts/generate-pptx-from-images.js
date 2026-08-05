#!/usr/bin/env node
/**
 * Generate PPTX from existing images (fixed version 2)
 */

"use strict";

const fs = require("fs");
const path = require("path");

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  const PptxGenJS = require("pptxgenjs");
  
  const templateColors = ["#17406D", "#0F6FC6", "#009DD9", "#0BD0D9", "#10CF9B", "#7CCA62", "#A5C249", "#F49100"];
  
  // Slide specs - body as array of strings for pptxgenjs
  const slides = [
    { title: "沈阳医学院附属中心医院", keyMessage: "数智病理科建设方案", body: ["项目背景", "建设目标", "技术方案"] },
    { title: "Agenda", keyMessage: "汇报提纲", body: ["项目背景与需求", "建设目标与方案", "技术架构设计", "实施计划与预期效益"] },
    { title: "项目背景", keyMessage: "提升病理诊断效率与准确性", body: ["传统病理诊断效率低", "诊断准确性依赖医生经验", "远程会诊能力不足"] },
    { title: "建设目标", keyMessage: "打造数智化病理科", body: ["全流程数字化", "AI 辅助诊断", "远程会诊平台", "科研数据资产化"] },
    { title: "技术方案", keyMessage: "四大核心技术模块", body: ["数字病理扫描仪", "AI 辅助诊断系统", "远程会诊平台", "数据安全管理"] },
    { title: "数字病理扫描仪", keyMessage: "高分辨率全切片成像", body: ["20x-40x 物镜", "全自动扫描", "30 秒/切片", "支持多种染色"] },
    { title: "AI 辅助诊断系统", keyMessage: "深度学习辅助诊断", body: ["宫颈癌筛查", "乳腺癌诊断", "前列腺癌检测", "细胞学分析"] },
    { title: "远程会诊平台", keyMessage: "连接基层与上级医院", body: ["实时协作诊断", "疑难病例讨论", "继续教育学习", "质控管理"] },
    { title: "预期效益", keyMessage: "多维度价值提升", body: ["诊断效率提升 50%", "诊断准确率提升 20%", "远程会诊覆盖 10+ 医院", "科研数据资产化"] },
    { title: "Thank You", keyMessage: "感谢聆听", body: ["联系我们", "谢谢！"] },
  ];

  const pptx = new PptxGenJS();
  pptx.author = "AWE Presentation-OS";
  pptx.title = "沈阳医学院附属中心医院数智病理科建设方案";

  console.log("Generating PPTX from existing images...");

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const paddedNum = String(i + 1).padStart(2, '0');
    const imagePath = path.join(outputDir, `slide-${paddedNum}.jpg`);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`Warning: ${imagePath} not found, skipping`);
      continue;
    }

    const pptxSlide = pptx.addSlide();
    pptxSlide.background = { url: imagePath };

    // Add text overlay - title
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.5, w: 9, h: 1,
      fontSize: 44, fontFace: "Arial",
      color: templateColors[0], bold: true, align: "left",
    });

    // Add text overlay - key message
    pptxSlide.addText(slide.keyMessage, {
      x: 0.5, y: 1.8, w: 9, h: 0.8,
      fontSize: 24, fontFace: "Arial",
      color: templateColors[2], align: "left",
    });

    // Add text overlay - body (as array)
    pptxSlide.addText(slide.body, {
      x: 0.5, y: 2.8, w: 9, h: 3,
      fontSize: 18, fontFace: "Arial",
      color: templateColors[0], align: "left", valign: "top",
    });
  }

  const pptxPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });
  console.log(`\n✅ PPTX saved to: ${pptxPath}`);
  console.log(`   Size: ${Math.round(fs.statSync(pptxPath).size / 1024 / 1024 * 100) / 100} MB`);
}

main().catch(console.error);
