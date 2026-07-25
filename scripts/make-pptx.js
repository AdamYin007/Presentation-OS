#!/usr/bin/env node
/**
 * M12.11 CLI — Generate PPTX from markdown input
 *
 * A thin, domain-agnostic CLI entrypoint for the existing
 * end-to-end markdown-to-pptx pipeline.
 *
 * Usage:
 *   node scripts/make-pptx.js <input.md> <output.pptx> [options]
 *
 * Options:
 *   --style <name>      Theme style (default: minimal-modern)
 *   --dry-run           Run pipeline but do not write output file
 *   --json              Print pipeline result as JSON to stdout
 *   --help              Show this help message
 *
 * Examples:
 *   node scripts/make-pptx.js presentation.md deck.pptx
 *   node scripts/make-pptx.js presentation.md deck.pptx --style business-consulting
 *   node scripts/make-pptx.js presentation.md --dry-run --json
 */
"use strict";

const fs = require("fs");
const path = require("path");

const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

// ── Argument parsing ────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    inputFile: null,
    outputFile: null,
    style: "minimal-modern",
    dryRun: false,
    json: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      result.help = true;
      i++;
      continue;
    }
    if (a === "--dry-run") {
      result.dryRun = true;
      i++;
      continue;
    }
    if (a === "--json") {
      result.json = true;
      i++;
      continue;
    }
    if (a === "--style") {
      i++;
      if (i >= args.length) {
        console.error("Error: --style requires a value");
        process.exit(1);
      }
      result.style = args[i];
      i++;
      continue;
    }
    if (!a.startsWith("-")) {
      if (!result.inputFile) {
        result.inputFile = a;
      } else if (!result.outputFile) {
        result.outputFile = a;
      } else {
        console.error(`Error: unexpected argument: ${a}`);
        process.exit(1);
      }
      i++;
      continue;
    }
    console.error(`Error: unknown option: ${a}`);
    process.exit(1);
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    console.log(fs.readFileSync(path.join(__dirname, "make-pptx-help.txt"), "utf8"));
    process.exit(0);
  }

  if (!opts.inputFile) {
    console.error("Error: missing input markdown file");
    console.error(
      "Usage: node scripts/make-pptx.js <input.md> <output.pptx> [--style <name>] [--dry-run] [--json]",
    );
    process.exit(1);
  }

  if (!opts.outputFile && !opts.dryRun && !opts.json) {
    console.error("Error: missing output pptx file (or use --dry-run / --json)");
    process.exit(1);
  }

  const inputPath = path.resolve(opts.inputFile);
  const outputPath = opts.outputFile ? path.resolve(opts.outputFile) : null;

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Read and validate input
  let markdownInput;
  try {
    markdownInput = fs.readFileSync(inputPath, "utf8");
  } catch (e) {
    console.error(`Error reading ${inputPath}: ${e.message}`);
    process.exit(1);
  }

  if (!markdownInput.trim()) {
    console.error("Error: input file is empty");
    process.exit(1);
  }

  // Validate style is one of the known themes
  const knownStyles = ["minimal-modern", "business-consulting", "academic-clean"];
  if (!knownStyles.includes(opts.style)) {
    console.error(`Error: unknown style "${opts.style}". Known styles: ${knownStyles.join(", ")}`);
    process.exit(1);
  }

  if (!opts.json) {
    console.log("AWE M12.11 — markdown to PPTX");
    console.log(`  Input:  ${inputPath}`);
    console.log(`  Style:  ${opts.style}`);
    console.log(`  Output: ${opts.dryRun ? "(dry-run)" : outputPath || "(JSON)"}`);
    console.log("");
  }

  try {
    const result = await runPipeline(markdownInput, { 
      style: opts.style,
      // Suppress pipeline console.log when --json is used (stdout must be pure JSON)
      _quiet: opts.json || opts.dryRun,
    });

    const summary = {
      slideCount: result.slideCount,
      format: result.format,
      topic: result.intent.topic,
      purpose: result.intent.purpose,
      slideSpecs: result.slideSpecs.map((s) => ({
        id: s.id,
        index: s.index,
        role: s.role,
        title: s.title,
        layout: s.layout,
      })),
      pptxSizeBytes: result.pptxBuffer.length,
    };

    if (opts.dryRun) {
      if (opts.json) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(
          `Dry-run complete: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`,
        );
      }
      process.exit(0);
      return;
    }

    // Write output file (create parent dirs if needed)
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, result.pptxBuffer);
    if (opts.json) {
      console.log(JSON.stringify({ ...summary, outputPath }, null, 2));
    } else {
      console.log(
        `Done: ${outputPath} (${result.pptxBuffer.length} bytes, ${result.slideCount} slides)`,
      );
    }
  } catch (e) {
    console.error(`Pipeline failed: ${e.message}`);
    process.exit(1);
  }
}

main();
