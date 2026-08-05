#!/usr/bin/env node
/**
 * Generate PPTX with EMBEDDED images (not external URLs)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  
  const templateColors = ["#17406D", "#0F6FC6", "#009DD9", "#0BD0D9", "#10CF9B", "#7CCA62", "#A5C249", "#F49100"];
  
  // Slide specs
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

  // Find all slide images
  const slideImages = fs.readdirSync(outputDir)
    .filter(f => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort();
  
  console.log(`Found ${slideImages.length} slide images`);
  
  if (slideImages.length === 0) {
    console.error("No slide images found!");
    process.exit(1);
  }

  // Read a base PPTX template
  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const baseZip = new AdmZip("./deliverables/bingli-presentation/output.pptx");
  const baseEntries = baseZip.getEntries();
  
  console.log("Base PPTX entries:", baseEntries.length);
  
  // Create new PPTX from scratch
  const PptxGenJS = require("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.author = "AWE Presentation-OS";
  pptx.title = "沈阳医学院附属中心医院数智病理科建设方案";

  console.log("\nGenerating PPTX with embedded images...");

  for (let i = 0; i < slides.length && i < slideImages.length; i++) {
    const slide = slides[i];
    const imagePath = path.join(outputDir, slideImages[i]);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`Warning: ${imagePath} not found, skipping`);
      continue;
    }

    const pptxSlide = pptx.addSlide();
    
    // Embed image as background
    const imgBuffer = fs.readFileSync(imagePath);
    pptxSlide.background = { 
      data: imgBuffer,
      size: { w: 13.33, h: 7.5 } // 16:9 aspect ratio
    };

    // Add text overlay
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.5, w: 9, h: 1,
      fontSize: 44, fontFace: "Arial",
      color: templateColors[0], bold: true, align: "left",
    });

    pptxSlide.addText(slide.keyMessage, {
      x: 0.5, y: 1.8, w: 9, h: 0.8,
      fontSize: 24, fontFace: "Arial",
      color: templateColors[2], align: "left",
    });

    pptxSlide.addText(slide.body, {
      x: 0.5, y: 2.8, w: 9, h: 3,
      fontSize: 18, fontFace: "Arial",
      color: templateColors[0], align: "left", valign: "top",
    });

    console.log(`✓ Slide ${i + 1}: ${slide.title}`);
  }

  const pptxPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });
  
  const sizeMB = Math.round(fs.statSync(pptxPath).size / 1024 / 1024 * 100) / 100;
  console.log(`\n✅ PPTX saved to: ${pptxPath}`);
  console.log(`   Size: ${sizeMB} MB`);
}

main().catch(console.error);
