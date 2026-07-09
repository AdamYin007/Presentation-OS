#!/usr/bin/env node
/**
 * M12.7 CLI — Generate PPTX from markdown input
 *
 * Usage: node scripts/generate-pptx.js <input.md> <output.pptx> [style]
 * Example: node scripts/generate-pptx.js docs/business-review.md output.pptx minimal-modern
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node generate-pptx.js <input.md> <output.pptx> [style]");
    process.exit(1);
  }

  const inputFile = path.resolve(args[0]);
  const outputFile = path.resolve(args[1]);
  const style = args[2] || "minimal-modern";

  // Read input
  let markdownInput;
  try {
    markdownInput = fs.readFileSync(inputFile, "utf8");
  } catch (e) {
    console.error(`Error reading ${inputFile}: ${e.message}`);
    process.exit(1);
  }

  if (!markdownInput.trim()) {
    console.error("Error: input file is empty");
    process.exit(1);
  }

  console.log(`Generating presentation from ${inputFile}...`);
  console.log(`Style: ${style}`);

  try {
    const result = await runPipeline(markdownInput, { style });
    console.log(`Pipeline complete: ${result.slideCount} slides`);
    console.log(`Output: ${outputFile} (${result.pptxBuffer.length} bytes)`);

    fs.writeFileSync(outputFile, result.pptxBuffer);
    console.log("Done.");
  } catch (e) {
    console.error(`Pipeline failed: ${e.message}`);
    process.exit(1);
  }
}

main();
