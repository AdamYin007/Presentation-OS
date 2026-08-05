#!/usr/bin/env node
/**
 * Re-generate Bilingual Pathology PPT with Image-Based Style
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");

async function main() {
  // Read markdown content
  const markdownPath = "/tmp/bingli-presentation.md";
  const markdownInput = fs.readFileSync(markdownPath, "utf8");

  // Output directory
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

  console.log("Starting image-based PPT generation...");
  console.log("Input:", markdownPath);
  console.log("Output:", outputDir);
  console.log("");

  try {
    const result = await runPipeline(markdownInput, {
      imagePpt: true,
      imageStyle: "business-professional",
      apiKey: "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe",
      api: "agnes-image-2.1-flash",
      outputDir: outputDir,
    });

    console.log("\n=== Generation Complete ===");
    console.log("PPTX Path:", result.pptxPath);
    console.log("Slide Count:", result.slideCount);
    console.log("Image Stats:", JSON.stringify(result.imageStats, null, 2));
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
