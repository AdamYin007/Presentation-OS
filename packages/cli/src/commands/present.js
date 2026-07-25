/**
 * @awe/cli — Present command (M12.30)
 *
 * Unified CLI entry point for Presentation OS.
 * Usage:
 *   awe present <input.md> [options]
 *
 * Options:
 *   --style <name>          Theme style (default: minimal-modern)
 *   --brand <profile>       Brand profile name or JSON file path
 *   --template <path>       Template PPTX for decorative injection
 *   --template-spec <path>  Template spec .md for auto roleMap generation
 *   --template-bg-dir <dir> Directory with template background images
 *   --output <path>         Output directory (default: ./output)
 *   --architect             Enable Content Architect (structured outline)
 *   --compiler <mode>       Enable compiler (standard|optimized)
 *   --audience-engine       Enable Audience Engine
 *   --visual-qa             Enable Visual QA pipeline
 *   --skip-ai               Skip AI analysis in Visual QA
 *   --manifest              Generate quality manifest
 */

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../../../presentation-pipeline/src/pipeline.js");
const { loadBrandProfile } = require("../../../brand-profiles/src/index.js");

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

function printUsage() {
  console.log(`
Usage: awe present <input.md> [options]

Options:
  --style <name>          Theme style (default: minimal-modern)
  --brand <profile>       Brand profile name or JSON file path
  --template <path>       Template PPTX for decorative injection
  --template-spec <path>  Template spec .md for auto roleMap generation
  --template-bg-dir <dir> Directory with template background images
  --output <path>         Output directory (default: ./output)
  --architect             Enable Content Architect
  --compiler <mode>       Enable compiler (standard|optimized)
  --audience-engine       Enable Audience Engine
  --visual-qa             Enable Visual QA pipeline
  --skip-ai               Skip AI analysis in Visual QA
  --manifest              Generate quality manifest
  --help                  Show this help message
`);
}

module.exports = async function present(args) {
  const inputPath = args[0];
  if (!inputPath || !fs.existsSync(inputPath)) {
    fail(`Input file not found: ${inputPath}`);
  }

  // Parse options
  const opts = {};
  let outputDir = "./output";
  let templateRoleMap = null;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--style":
        opts.style = args[++i] || "minimal-modern";
        break;
      case "--brand": {
        const brandNameOrPath = args[++i];
        try {
          const result = loadBrandProfile(brandNameOrPath);
          opts.brandConfig = result.config;
          console.log(`[Present] Brand loaded: ${result.source}`);
        } catch (e) {
          fail(`Brand profile error: ${e.message}`);
        }
        break;
      }
      case "--template":
        opts.templatePath = args[++i];
        if (!fs.existsSync(opts.templatePath)) {
          fail(`Template file not found: ${opts.templatePath}`);
        }
        break;
      case "--template-spec":
        opts.templateSpecPath = args[++i];
        if (!fs.existsSync(opts.templateSpecPath)) {
          fail(`Template spec not found: ${opts.templateSpecPath}`);
        }
        break;
      case "--template-bg-dir":
        opts.templateBackgroundsDir = args[++i];
        break;
      case "--output":
        outputDir = args[++i];
        break;
      case "--architect":
        opts.contentArchitect = { enabled: true };
        break;
      case "--compiler":
        opts.compiler = args[++i] || "standard";
        break;
      case "--audience-engine":
        opts.audienceEngine = {};
        break;
      case "--visual-qa":
        opts.visualQa = { outputDir: path.join(outputDir, ".visual-qa-output") };
        break;
      case "--skip-ai":
        opts.skipAi = true;
        break;
      case "--manifest":
        opts.emitManifest = true;
        opts.outputDir = outputDir;
        break;
      case "--help":
        printUsage();
        return;
      default:
        // Ignore unknown flags
        break;
    }
  }

  // Read input
  const markdownInput = fs.readFileSync(inputPath, "utf-8");

  console.log("\nPresentation OS Pipeline");
  console.log("========================");
  console.log(`Input:     ${inputPath}`);
  console.log(`Style:     ${opts.style || "minimal-modern"}`);
  console.log(`Output:    ${outputDir}`);
  if (opts.brandConfig) console.log(`Brand:     ${opts.brandConfig.brandName || "custom"}`);
  if (opts.templatePath) console.log(`Template:  ${opts.templatePath}`);
  if (opts.templateSpecPath) console.log(`TemplateSpec: ${opts.templateSpecPath}`);
  console.log("");

  try {
    const result = await runPipeline(markdownInput, opts);

    // Write output PPTX
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "output.pptx");
    fs.writeFileSync(outputPath, result.pptxBuffer);
    console.log(`✅ Output: ${outputPath} (${result.pptxBuffer.length.toLocaleString()} bytes, ${result.slideCount} slides)`);

    // Print summary
    if (result.visualQa) {
      console.log(`🔍 Visual QA: ${result.visualQa.summary?.totalSlides || "?"} slides analyzed`);
    }
    if (result.compiler) {
      console.log(`📐 Compiler: ${result.compiler.mode} mode`);
    }
    if (result.audienceEngine) {
      console.log("👥 Audience Engine: adapted");
    }
    if (result.manifest) {
      console.log(`📋 Quality Manifest: ${result.manifest.path}`);
      console.log(`   Summary: ${result.manifest.summary.passCount}/${result.manifest.summary.passCount + result.manifest.summary.failCount} checks passed`);
    }
    console.log("");
    console.log("Done.");
  } catch (err) {
    fail(`Pipeline failed: ${err.message}`);
  }
};
