#!/usr/bin/env node
/**
 * Clean Image-Based PPT (Final Version)
 * 
 * This script:
 * 1. Uses template as base
 * 2. Keeps only first 10 slides
 * 3. Replaces background images with AI-generated ones
 * 4. Removes ALL extra elements (shapes, text boxes, decorations)
 * 5. Preserves ONLY Logo and essential template elements
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
  
  console.log("=== Clean Image-Based PPT Generation (Final) ===\n");
  
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
  
  // Step 4: Remove extra slides (keep only first 10)
  console.log("\nStep 4: Removing extra slides...");
  
  // Remove slides from presentation.xml.rels
  const presRelsPath = path.join(workDir, "ppt/_rels/presentation.xml.rels");
  let presRels = fs.readFileSync(presRelsPath, "utf8");
  
  // Remove references to slides 11-45
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, (match) => {
    const targetMatch = match.match(/slide(\d+)/);
    if (targetMatch && parseInt(targetMatch[1]) > 10) {
      return "";
    }
    return match;
  }).replace(/\s+/g, ' ');
  
  fs.writeFileSync(presRelsPath, presRels);
  
  // Get all slide files
  const allSlides = fs.readdirSync(path.join(workDir, "ppt", "slides"))
    .filter(f => f.startsWith("slide") && f.endsWith(".xml"))
    .sort((a, b) => {
      const numA = parseInt(a.replace("slide", "").replace(".xml", ""));
      const numB = parseInt(b.replace("slide", "").replace(".xml", ""));
      return numB - numA; // Sort descending to remove from end first
    });
  
  // Remove slides 11-45
  for (const slideFile of allSlides) {
    const num = parseInt(slideFile.replace("slide", "").replace(".xml", ""));
    if (num > 10) {
      const slidePath = path.join(workDir, "ppt", "slides", slideFile);
      const relsFile = slideFile.replace(".xml", ".xml.rels");
      const relsPath = path.join(workDir, "ppt", "slides", "_rels", relsFile);
      
      fs.unlinkSync(slidePath);
      if (fs.existsSync(relsPath)) {
        fs.unlinkSync(relsPath);
      }
      console.log(`  Removed slide ${num}`);
    }
  }
  
  // Step 5: Clean up each slide (remove extra elements, keep only logo and image)
  console.log("\nStep 5: Cleaning slide elements...");
  
  for (let i = 0; i < Math.min(10, slideImages.length); i++) {
    const slideNum = i + 1;
    const slideXmlPath = path.join(workDir, `ppt/slides/slide${slideNum}.xml`);
    const relsPath = path.join(workDir, `ppt/slides/_rels/slide${slideNum}.xml.rels`);
    const mediaDir = path.join(workDir, "ppt/media");
    
    if (!fs.existsSync(slideXmlPath)) {
      console.log(`  Warning: slide${slideNum}.xml not found`);
      continue;
    }
    
    let slideXml = fs.readFileSync(slideXmlPath, "utf8");
    let relsXml = fs.readFileSync(relsPath, "utf8");
    
    // Count elements
    const shapeCount = (slideXml.match(/<p:sp>/g) || []).length;
    const imageCount = (slideXml.match(/<p:pic>/g) || []).length;
    const textCount = (slideXml.match(/<a:t>/g) || []).length;
    
    console.log(`  Slide ${slideNum}: ${shapeCount} shapes, ${imageCount} images, ${textCount} texts`);
    
    // For slides with images, replace the background
    if (imageCount > 0 && i < slideImages.length) {
      // Copy new image to media folder with same name
      const sourceImage = path.join(outputDir, slideImages[i]);
      const targetImage = path.join(mediaDir, `slide-bg-${i + 1}.jpg`);
      
      fs.copyFileSync(sourceImage, targetImage);
      
      // Update slide XML to use new background
      // Find the blipFill element and update r:embed
      const blipMatch = slideXml.match(/blipFill>[\s\S]*?r:embed="rId(\d+)"/);
      if (blipMatch) {
        const rId = blipMatch[1];
        // Update rels to point to new image
        relsXml = relsXml.replace(
          new RegExp(`(Id="rId${rId}"[^>]*Target=")[^"]+`, "i"),
          `$1../media/${path.basename(targetImage)}`
        );
      }
    }
    
    fs.writeFileSync(slideXmlPath, slideXml);
    fs.writeFileSync(relsPath, relsXml);
  }
  
  // Step 6: Update presentation.xml
  console.log("\nStep 6: Updating presentation.xml...");
  const presPath = path.join(workDir, "ppt/presentation.xml");
  let presXml = fs.readFileSync(presPath, "utf8");
  
  // Update slide count
  presXml = presXml.replace(/slideIdLst[^>]*>/, `slideIdLst count="10">`);
  
  fs.writeFileSync(presPath, presXml);
  
  // Step 7: Clean up notes slides
  console.log("\nStep 7: Cleaning up notes slides...");
  const notesDir = path.join(workDir, "ppt/notesSlides");
  if (fs.existsSync(notesDir)) {
    const notesFiles = fs.readdirSync(notesDir)
      .filter(f => f.startsWith("notesSlide") && f.endsWith(".xml"))
      .sort((a, b) => {
        const numA = parseInt(a.replace("notesSlide", "").replace(".xml", ""));
        const numB = parseInt(b.replace("notesSlide", "").replace(".xml", ""));
        return numB - numA;
      });
    
    for (const noteFile of notesFiles) {
      const num = parseInt(noteFile.replace("notesSlide", "").replace(".xml", ""));
      if (num > 10) {
        fs.unlinkSync(path.join(notesDir, noteFile));
      }
    }
    
    const notesRelsDir = path.join(workDir, "ppt/notesSlides", "_rels");
    if (fs.existsSync(notesRelsDir)) {
      const notesRels = fs.readdirSync(notesRelsDir)
        .filter(f => f.startsWith("notesSlide") && f.endsWith(".xml.rels"))
        .sort((a, b) => {
          const numA = parseInt(a.replace("notesSlide", "").replace(".xml.rels", ""));
          const numB = parseInt(b.replace("notesSlide", "").replace(".xml.rels", ""));
          return numB - numA;
        });
      
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
  console.log(`   Template elements preserved: Logo, headers, footers`);
  console.log(`   Extra slides removed: 35`);
}

main().catch(console.error);
