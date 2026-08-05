#!/usr/bin/env node
/**
 * Re-generate Bilingual Pathology PPT with Image-Based Style
 * Uses template colors from brand analysis
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");
const { analyzeTemplate } = require("../packages/template-analyzer/src/index.js");
const { convertTemplateForPipeline } = require("../packages/template-analyzer/src/brand-converter.js");

async function main() {
  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const markdownPath = "/tmp/bingli-presentation.md";

  console.log("=== Image-Based PPT Generation with Template Colors ===\n");

  // Step 1: Analyze template
  console.log("Step 1: Analyzing template...");
  const analysis = analyzeTemplate(templatePath);
  console.log(`  Templates found: ${analysis.templates?.length || 0}`);
  console.log(`  Theme colors: ${analysis.theme?.colors?.length || 0}`);

  // Step 2: Convert to brand config
  console.log("\nStep 2: Converting to brand config...");
  const brandConfig = convertTemplateForPipeline(analysis);
  console.log(`  Primary color: ${brandConfig.primaryColor || 'default'}`);
  console.log(`  Accent color: ${brandConfig.accentColor || 'default'}`);
  console.log(`  Theme colors: ${(brandConfig.themeColors || []).join(', ')}`);

  // Step 3: Read markdown content
  console.log("\nStep 3: Reading markdown content...");
  const markdownInput = fs.readFileSync(markdownPath, "utf8");
  console.log(`  Input: ${markdownPath}`);

  // Step 4: Run pipeline with image PPT
  console.log("\nStep 4: Generating image-based PPT...");
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

  try {
    const result = await runPipeline(markdownInput, {
      imagePpt: true,
      imageStyle: "business-professional",
      apiKey: "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe",
      api: "agnes-image-2.1-flash",
      outputDir: outputDir,
      brandConfig: brandConfig,
    });

    console.log("\n=== Generation Complete ===");
    console.log("PPTX Path:", result.pptxPath);
    console.log("Slide Count:", result.slideCount);
    console.log("Image Stats:", JSON.stringify(result.imageStats, null, 2));
    console.log("Template Colors:", JSON.stringify(result.templateColors, null, 2));
    if (result.samplePreview) {
      console.log("Sample Preview:", result.samplePreview.count, "images");
      console.log("Sample Dir:", result.samplePreview.outputDir);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
