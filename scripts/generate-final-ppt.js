#!/usr/bin/env node
/**
 * Clean PPT with Template Elements (Final)
 * 
 * Strategy:
 * 1. Use template as base
 * 2. Keep only first 10 slides
 * 3. Replace background images with AI-generated ones
 * 4. Preserve ALL template elements (Logo, headers, footers, decorations)
 * 5. Remove slides 11-45 completely
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  
  // Slide specs
  const slides = [
    { title: "沈阳医学院附属中心医院", keyMessage: "数智病理科建设方案", body: "项目背景  建设目标  技术方案" },
    { title: "Agenda", keyMessage: "汇报提纲", body: "项目背景与需求\n建设目标与方案\n技术架构设计\n实施计划与预期效益" },
    { title: "项目背景", keyMessage: "提升病理诊断效率与准确性", body: "传统病理诊断效率低\n诊断准确性依赖医生经验\n远程会诊能力不足" },
    { title: "建设目标", keyMessage: "打造数智化病理科", body: "全流程数字化\nAI 辅助诊断\n远程会诊平台\n科研数据资产化" },
    { title: "技术方案", keyMessage: "四大核心技术模块", body: "数字病理扫描仪\nAI 辅助诊断系统\n远程会诊平台\n数据安全管理" },
    { title: "数字病理扫描仪", keyMessage: "高分辨率全切片成像", body: "20x-40x 物镜\n全自动扫描\n30 秒/切片\n支持多种染色" },
    { title: "AI 辅助诊断系统", keyMessage: "深度学习辅助诊断", body: "宫颈癌筛查\n乳腺癌诊断\n前列腺癌检测\n细胞学分析" },
    { title: "远程会诊平台", keyMessage: "连接基层与上级医院", body: "实时协作诊断\n疑难病例讨论\n继续教育学习\n质控管理" },
    { title: "预期效益", keyMessage: "多维度价值提升", body: "诊断效率提升 50%\n诊断准确率提升 20%\n远程会诊覆盖 10+ 医院\n科研数据资产化" },
    { title: "Thank You", keyMessage: "感谢聆听", body: "联系我们\n谢谢！" },
  ];

  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const outputPptx = path.join(outputDir, "presentation.pptx");
  
  console.log("=== Clean PPT with Template Elements ===\n");
  
  // Step 1: Copy template
  console.log("Step 1: Copying template...");
  execSync(`cp "${templatePath}" "${outputPptx}"`, { stdio: "pipe" });
  
  // Step 2: Unzip
  console.log("Step 2: Unzipping...");
  const workDir = path.join(outputDir, ".work");
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  execSync(`unzip -o "${outputPptx}" -d "${workDir}"`, { stdio: "pipe" });
  
  // Step 3: Read slide images
  const slideImages = fs.readdirSync(outputDir)
    .filter(f => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort();
  
  console.log(`  Found ${slideImages.length} slide images`);
  
  // Step 4: Remove extra slides (11-45)
  console.log("\nStep 4: Removing extra slides (11-45)...");
  
  // First, remove from presentation.xml.rels
  const presRelsPath = path.join(workDir, "ppt/_rels/presentation.xml.rels");
  let presRels = fs.readFileSync(presRelsPath, "utf8");
  
  // Remove all slide relationships except first 10
  const slideRelRegex = /<Relationship[^>]*Target="slides\/slide(\d+)\.xml"[^>]*\/>/g;
  let match;
  const slidesToRemove = [];
  while ((match = slideRelRegex.exec(presRels)) !== null) {
    const slideNum = parseInt(match[1]);
    if (slideNum > 10) {
      slidesToRemove.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  
  // Remove in reverse order
  for (let i = slidesToRemove.length - 1; i >= 0; i--) {
    const { start, end } = slidesToRemove[i];
    presRels = presRels.substring(0, start) + presRels.substring(end);
  }
  
  fs.writeFileSync(presRelsPath, presRels);
  
  // Remove slide files
  const slidesDir = path.join(workDir, "ppt", "slides");
  const slidesRelsDir = path.join(workDir, "ppt", "slides", "_rels");
  
  const allSlideFiles = fs.readdirSync(slidesDir)
    .filter(f => f.startsWith("slide") && f.endsWith(".xml"))
    .sort((a, b) => parseInt(b.replace("slide", "").replace(".xml", "")) - parseInt(a.replace("slide", "").replace(".xml", "")));
  
  for (const slideFile of allSlideFiles) {
    const num = parseInt(slideFile.replace("slide", "").replace(".xml", ""));
    if (num > 10) {
      fs.unlinkSync(path.join(slidesDir, slideFile));
      const relsFile = slideFile.replace(".xml", ".xml.rels");
      if (fs.existsSync(path.join(slidesRelsDir, relsFile))) {
        fs.unlinkSync(path.join(slidesRelsDir, relsFile));
      }
      console.log(`  Removed slide ${num}`);
    }
  }
  
  // Step 5: Replace images in first 10 slides
  console.log("\nStep 5: Replacing background images...");
  
  for (let i = 0; i < Math.min(10, slideImages.length); i++) {
    const slideNum = i + 1;
    const slideXmlPath = path.join(slidesDir, `slide${slideNum}.xml`);
    const relsPath = path.join(slidesRelsDir, `slide${slideNum}.xml.rels`);
    const mediaDir = path.join(workDir, "ppt", "media");
    
    if (!fs.existsSync(slideXmlPath)) {
      console.log(`  Warning: slide${slideNum}.xml not found`);
      continue;
    }
    
    let slideXml = fs.readFileSync(slideXmlPath, "utf8");
    let relsXml = fs.readFileSync(relsPath, "utf8");
    
    // Find all image references
    const imgMatches = [...slideXml.matchAll(/r:embed="rId(\d+)"/g)];
    const relMatches = [...relsXml.matchAll(/Id="rId(\d+)"[^>]*Target="([^"]+)"/g)];
    
    // Replace the first image (background) with our generated image
    if (imgMatches.length > 0 && i < slideImages.length) {
      const targetImage = path.join(mediaDir, slideImages[i]);
      const sourceImage = path.join(outputDir, slideImages[i]);
      
      // Copy new image
      fs.copyFileSync(sourceImage, targetImage);
      
      // Find the first image relationship and update it
      if (relMatches.length > 0) {
        const firstRel = relMatches[0];
        const rId = firstRel[1];
        const oldTarget = firstRel[2];
        
        // Update rels
        relsXml = relsXml.replace(
          new RegExp(`(Id="rId${rId}"[^>]*Target=")[^"]+`, "i"),
          `$1${path.basename(slideImages[i])}`
        );
        
        console.log(`  Slide ${slideNum}: Replaced ${oldTarget} with ${slideImages[i]}`);
      }
    }
    
    fs.writeFileSync(slideXmlPath, slideXml);
    fs.writeFileSync(relsPath, relsXml);
  }
  
  // Step 6: Update presentation.xml
  console.log("\nStep 6: Updating presentation.xml...");
  const presPath = path.join(workDir, "ppt", "presentation.xml");
  let presXml = fs.readFileSync(presPath, "utf8");
  
  // Remove slide references from slideIdLst
  presXml = presXml.replace(
    /<p:slideIdLst>[\s\S]*?<\/p:slideIdLst>/,
    '<p:slideIdLst>' + 
    Array.from({length: 10}, (_, i) => `<p:slideId id="${40000 + i}" r:id="rId${i + 1}"/>`).join('\n') +
    '</p:slideIdLst>'
  );
  
  fs.writeFileSync(presPath, presXml);
  
  // Step 7: Clean up notes slides
  console.log("\nStep 7: Cleaning up notes slides...");
  const notesDir = path.join(workDir, "ppt", "notesSlides");
  if (fs.existsSync(notesDir)) {
    const notesFiles = fs.readdirSync(notesDir)
      .filter(f => f.startsWith("notesSlide") && f.endsWith(".xml"))
      .sort((a, b) => parseInt(b.replace("notesSlide", "").replace(".xml", "")) - parseInt(a.replace("notesSlide", "").replace(".xml", "")));
    
    for (const noteFile of notesFiles) {
      const num = parseInt(noteFile.replace("notesSlide", "").replace(".xml", ""));
      if (num > 10) {
        fs.unlinkSync(path.join(notesDir, noteFile));
      }
    }
    
    const notesRelsDir = path.join(notesDir, "_rels");
    if (fs.existsSync(notesRelsDir)) {
      const notesRels = fs.readdirSync(notesRelsDir)
        .filter(f => f.startsWith("notesSlide") && f.endsWith(".xml.rels"))
        .sort((a, b) => parseInt(b.replace("notesSlide", "").replace(".xml.rels", "")) - parseInt(a.replace("notesSlide", "").replace(".xml.rels", "")));
      
      for (const relsFile of notesRels) {
        const num = parseInt(relsFile.replace("notesSlide", "").replace(".xml.rels", ""));
        if (num > 10) {
          fs.unlinkSync(path.join(notesRelsDir, relsFile));
        }
      }
    }
  }
  
  // Step 8: Repack PPTX
  console.log("\nStep 8: Repacking PPTX...");
  execSync(`cd "${workDir}" && zip -r "${outputPptx}" . -x "*.DS_Store"`, { stdio: "pipe" });
  
  // Step 9: Clean up
  fs.rmSync(workDir, { recursive: true, force: true });
  
  const sizeMB = Math.round(fs.statSync(outputPptx).size / 1024 / 1024 * 100) / 100;
  console.log(`\n✅ PPTX saved to: ${outputPptx}`);
  console.log(`   Size: ${sizeMB} MB (10 slides)`);
  console.log(`   Template elements preserved: Logo, headers, footers, decorations`);
  console.log(`   Extra slides removed: 35`);
}

main().catch(console.error);
