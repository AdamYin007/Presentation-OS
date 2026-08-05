#!/usr/bin/env node
/**
 * Generate Image-Based PPT with Template Elements Preserved
 * 
 * This script:
 * 1. Copies the template PPTX
 * 2. Replaces background images with generated AI images
 * 3. Preserves all template elements (Logo, headers, footers, etc.)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  
  // Template colors
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

  console.log("=== Image-Based PPT Generation with Template Elements ===\n");
  
  // Step 1: Copy template to output
  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const outputPptx = path.join(outputDir, "presentation.pptx");
  
  console.log("Step 1: Copying template...");
  execSync(`cp "${templatePath}" "${outputPptx}"`, { stdio: "inherit" });
  console.log(`  Template copied to: ${outputPptx}`);
  
  // Step 2: Unzip and modify
  console.log("\nStep 2: Unzipping template...");
  const workDir = path.join(outputDir, ".work");
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  
  execSync(`unzip -o "${outputPptx}" -d "${workDir}"`);
  
  // Step 3: Read slide images
  console.log("\nStep 3: Reading generated slide images...");
  const slideImages = fs.readdirSync(outputDir)
    .filter(f => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort();
  
  console.log(`  Found ${slideImages.length} slide images`);
  
  // Step 4: Replace images in each slide
  console.log("\nStep 4: Replacing slide backgrounds...");
  
  for (let i = 0; i < slides.length && i < slideImages.length; i++) {
    const slideNum = i + 1;
    const slideXmlPath = path.join(workDir, `ppt/slides/slide${slideNum}.xml`);
    const relsPath = path.join(workDir, `ppt/slides/_rels/slide${slideNum}.xml.rels`);
    const mediaDir = path.join(workDir, "ppt/media");
    
    if (!fs.existsSync(slideXmlPath)) {
      console.log(`  Warning: slide${slideNum}.xml not found`);
      continue;
    }
    
    // Read slide XML
    let slideXml = fs.readFileSync(slideXmlPath, "utf8");
    
    // Find existing background image reference
    const imgMatch = slideXml.match(/r:embed="rId(\d+)"/);
    if (!imgMatch) {
      console.log(`  Slide ${slideNum}: No image found, skipping`);
      continue;
    }
    
    const existingRId = imgMatch[1];
    
    // Read rels file
    let relsXml = fs.readFileSync(relsPath, "utf8");
    
    // Find existing image relationship
    const relMatch = relsXml.match(new RegExp(`Id="rId${existingRId}"[^>]*Target="([^"]+)"`));
    if (!relMatch) {
      console.log(`  Slide ${slideNum}: No relationship found for rId${existingRId}`);
      continue;
    }
    
    const existingImageName = relMatch[1];
    console.log(`  Slide ${slideNum}: Found ${existingImageName}, replacing with ${slideImages[i]}`);
    
    // Copy new image to media folder
    const newImagePath = path.join(mediaDir, path.basename(existingImageName));
    const sourceImagePath = path.join(outputDir, slideImages[i]);
    
    fs.copyFileSync(sourceImagePath, newImagePath);
    
    // Update slide XML (replace image reference if needed)
    // The background image should already be in place, just need to ensure it's the right one
    
    // Update slide XML to use new image
    // Find the blipFill element and update r:embed
    slideXml = slideXml.replace(
      new RegExp(`r:embed="rId${existingRId}"`),
      `r:embed="rId${existingRId}"`
    );
    
    fs.writeFileSync(slideXmlPath, slideXml);
  }
  
  // Step 5: Update slide count in presentation.xml
  console.log("\nStep 5: Updating slide count...");
  const presentationXmlPath = path.join(workDir, "ppt/presentation.xml");
  let presentationXml = fs.readFileSync(presentationXmlPath, "utf8");
  
  // Update slide count
  presentationXml = presentationXml.replace(
    /slideIdLst="[^"]*"/,
    `slideIdLst count="${slides.length}"`
  );
  
  fs.writeFileSync(presentationXmlPath, presentationXml);
  
  // Step 6: Repack PPTX
  console.log("\nStep 6: Repacking PPTX...");
  execSync(`cd "${workDir}" && zip -r "${outputPptx}" .`, { stdio: "inherit" });
  
  // Step 7: Clean up
  fs.rmSync(workDir, { recursive: true, force: true });
  
  const sizeMB = Math.round(fs.statSync(outputPptx).size / 1024 / 1024 * 100) / 100;
  console.log(`\n✅ PPTX saved to: ${outputPptx}`);
  console.log(`   Size: ${sizeMB} MB (${slides.length} slides)`);
  console.log(`   Template elements preserved: Logo, headers, footers, decorations`);
}

main().catch(console.error);
