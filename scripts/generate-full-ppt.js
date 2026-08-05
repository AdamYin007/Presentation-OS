#!/usr/bin/env node
/**
 * Generate Complete Image-Based PPT with Template Colors
 * Uses longer timeout and batch processing
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");

async function main() {
  const markdownPath = "/tmp/bingli-presentation.md";
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

  console.log("=== Complete Image-Based PPT Generation ===\n");
  console.log("This will take several minutes...");
  console.log("");

  // Read markdown content
  const markdownInput = fs.readFileSync(markdownPath, "utf8");

  // Template colors from analysis
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

  try {
    const result = await runPipeline(markdownInput, {
      imagePpt: true,
      imageStyle: "business-professional",
      apiKey: "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe",
      api: "agnes-image-2.1-flash",
      outputDir: outputDir,
      brandConfig: brandConfig,
      generateSamples: true,
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
    console.error(error.stack);
    process.exit(1);
  }
}

main();
