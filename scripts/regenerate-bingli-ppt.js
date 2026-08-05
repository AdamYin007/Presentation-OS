#!/usr/bin/env node
/**
 * Re-generate Bilingual Pathology PPT with Image-Based Style
 * Uses EXPLICIT template colors (hardcoded from analysis)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");

async function main() {
  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const markdownPath = "/tmp/bingli-presentation.md";

  console.log("=== Image-Based PPT Generation with Template Colors ===\n");

  // Step 1: Read template colors (extracted manually from theme XML)
  console.log("Step 1: Loading template colors...");
  const templateColors = [
    "#17406D", // Primary dark blue
    "#0F6FC6", // Blue
    "#009DD9", // Light blue
    "#0BD0D9", // Cyan
    "#10CF9B", // Green
    "#7CCA62", // Light green
    "#A5C249", // Lime
    "#F49100", // Orange
  ];
  console.log(`  Template colors: ${templateColors.join(', ')}`);

  // Step 2: Create brand config
  const brandConfig = {
    primaryColor: templateColors[0],
    accentColor: templateColors[2],
    themeColors: templateColors,
    fonts: {
      majorLatin: "Calibri Light",
      minorLatin: "Calibri",
      majorEastAsian: "宋体",
    },
  };
  console.log("\nStep 2: Brand config created");

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
