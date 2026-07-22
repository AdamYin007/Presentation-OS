#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const comp = require("../../../../components");

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const storyName = getArg("story", "digital-pathology-15");
const useHero = args.includes("--hero");
const heroSeqArg = getArg("hero-sequence", null);
// --legacy-renderer kept for backward compat but is now a no-op (adapter-first is default)
if (args.includes("--legacy-renderer")) {
  console.warn("⚠️  --legacy-renderer is deprecated. Adapter-first rendering is now the only path.");
}
var out = getArg("out", path.join(process.cwd(), "output", "ppt-factory"));

// ── Pack validator (early exit, no runtime loading) ─────────────

const validatePackArg = getArg("validate-pack", null);
if (validatePackArg) {
  const { validatePack } = require("../src/pack-validator");
  const result = validatePack(validatePackArg);
  if (result.ok) {
    console.log("Pack validation passed");
    console.log("Pack: " + (result.manifest ? result.manifest.name : "(unknown)"));
    console.log("Version: " + (result.manifest ? result.manifest.version : "(unknown)"));
    console.log("Status: " + (result.manifest ? result.manifest.status : "(unknown)"));
    console.log("Stories: " + ((result.assets.stories || []).length));
    console.log("Hero sequences: " + ((result.assets.heroSequences || []).length));
    console.log("Terminology: " + ((result.assets.terminology || []).length));
    console.log("References: " + ((result.assets.references || []).length));
    if (result.warnings.length > 0) {
      console.log("Warnings: " + result.warnings.length);
      for (const w of result.warnings) {
        console.log("  " + w);
      }
    }
    process.exit(0);
  } else {
    console.error("Pack validation failed");
    for (const err of result.errors) {
      console.error("  Error: " + err);
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.error("  Warning: " + w);
      }
    }
    process.exit(1);
  }
}

// ── Pack discovery (early exit, loader-backed) ─────────────────

var listPacksArg = args.includes("--list-packs");
if (listPacksArg) {
  var { loadAllPacks } = require("../src/pack-loader");

  var allResult = loadAllPacks();
  if (!allResult.ok) {
    // Map loader errors to user-friendly messages (no stack traces)
    var code = allResult.errorCode || "PACK_LOAD_FAILED";
    switch (code) {
      case "PACKS_DIR_NOT_FOUND":
        console.error("Packs directory not found: " + (allResult.details ? allResult.details.scanDir : "presentation-packs"));
        break;
      case "PACK_LOAD_FAILED":
        console.error(allResult.error || "Failed to load Presentation Packs");
        break;
      default:
        console.error("Pack loader error: " + (allResult.error || code));
        break;
    }
    process.exit(1);
  }

  var packs = allResult.contexts || [];
  if (packs.length === 0) {
    var rootDir = getArg("list-packs-dir", "presentation-packs");
    var rootPath = path.join(process.cwd(), rootDir);
    console.log("No Presentation Packs found in: " + rootPath);
    process.exit(0);
  }

  console.log("Available Presentation Packs:");
  for (var i = 0; i < packs.length; i++) {
    var ctx = packs[i];
    var m = ctx.manifest;
    console.log("- " + ctx.packId);
    console.log("  name: " + (m.displayName || ctx.packId));
    console.log("  version: " + (m.version || "(unknown)"));
    console.log("  status: " + (m.status || "(unknown)"));
    console.log("  path: " + ctx.packRoot);
    console.log("  validation: " + (ctx.validation && ctx.validation.ok ? "passed" : "warning"));
  }
  process.exit(0);
}

// ── CLI help (early exit, no rendering) ─────────────────────────

if (args.includes("--help")) {
  console.log("");
  console.log("AWE Presentation OS CLI");
  console.log("");
  console.log("Usage:");
  console.log("  node registry/packages/ppt-factory/bin/run.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --help                  Show this help message.");
  console.log("  --story <id>            Render a story by id from the existing registry story source.");
  console.log("  --validate-pack <path>  Validate a Presentation Pack manifest and declared assets.");
  console.log("  --list-packs            List available Presentation Packs under presentation-packs/.");
  console.log("  --inspect-pack <id>     Inspect one Presentation Pack by id or directory name.");
  console.log("  --pack-story <pack-id>/<story-id> Render a story explicitly from a Presentation Pack.");
  console.log("                                    Pack story rendering is explicit opt-in.");
  console.log("                                    Default --story still uses registry story sources.");
  console.log("  --validate-pack-story-parity <pack>/<id> Compare registry and pack story slide plans for parity.");
  console.log("                                    Temp outputs isolated under .parity-temp/.");
  console.log("  --legacy-renderer       Deprecated. Adapter-first rendering is now the only path.");
  console.log("  --layout-engine         Accepted for compatibility. Adapter-first rendering is now default.");
  console.log("");
  console.log("Notes:");
  console.log("  - Pack commands (--validate-pack, --list-packs, --inspect-pack) are read-only.");
  console.log("  - --pack-story renders from pack stories (explicit opt-in).");
  console.log("  - --pack-story output goes under output/ppt-factory/packs/<pack-id>/ to avoid collision.");
  console.log("  - --validate-pack-story-parity compares registry and pack slide plans.");
  console.log("  - --validate-pack-story-parity temp outputs are isolated under .parity-temp/.");
  console.log("  - Default --story still uses registry story sources.");
  console.log("  - Pack story rendering does not make packs the default source of truth.");
  console.log("  - Parity validation compares slide plans, not PPTX binary identity.");
  console.log("");
  process.exit(0);
}

// ── CLI unknown argument guard (fail fast, no rendering) ────────

var KNOWN_FLAGS = [
  "help",
  "story",
  "out",
  "hero",
  "hero-sequence",
  "legacy-renderer",
  "layout-engine",
  "validate-pack",
  "list-packs",
  "list-packs-dir",
  "inspect-pack",
  "pack-story",
  "validate-pack-story-parity",
];

function hasUnknownFlag() {
  for (var i = 0; i < args.length; i++) {
    var a = args[i];
    if (a.indexOf("--") !== 0) {
      continue; // positional value or non-flag, skip
    }
    var flagName = a.substring(2);
    if (KNOWN_FLAGS.indexOf(flagName) >= 0) {
      continue; // known flag, skip
    }
    // Check if next arg is a value for this flag (known flags take values)
    var takesValue = [
      "story", "out", "hero-sequence",
      "validate-pack", "list-packs-dir", "inspect-pack", "pack-story",
      "validate-pack-story-parity"
    ];
    if (takesValue.indexOf(flagName) >= 0 && i + 1 < args.length && args[i + 1].indexOf("--") !== 0) {
      continue; // flag with value, skip
    }
    return a; // unknown flag found
  }
  return null;
}

var unknown = hasUnknownFlag();
if (unknown) {
  console.error("Unsupported option: " + unknown);
  console.error("Available options:");
  console.error("  --help");
  console.error("  --story <id>");
  console.error("  --validate-pack <path>");
  console.error("  --list-packs");
  console.error("  --inspect-pack <id>");
  console.error("  --pack-story <pack>/<id>");
  console.error("  --validate-pack-story-parity <pack>/<id>");
  console.error("  --legacy-renderer");
  console.error("  --layout-engine");
  process.exit(1);
}

// ── Pack story parity validation (M5.5) ─────────────────────────

var parityValidationPresent = args.includes("--validate-pack-story-parity");
if (parityValidationPresent) {
  var parityValidationArg = getArg("validate-pack-story-parity", null);
  if (!parityValidationArg) {
    console.error("Missing value for --validate-pack-story-parity");
    console.error("Usage: --validate-pack-story-parity <pack-id>/<story-id>");
    process.exit(1);
  }
  var { validatePackStoryParity } = require("../src/pack-story-parity-validator");
  var useLegacyForParity = args.includes("--legacy-renderer");
  var validationResult = validatePackStoryParity(parityValidationArg, { useLegacy: useLegacyForParity });
  if (validationResult.ok) {
    process.exit(0);
  } else {
    console.error(validationResult.error);
    process.exit(1);
  }
}

// ── Pack story resolution and rendering (explicit opt-in) ────────

var packStoryResolved = null;
var packStoryResolvedPath = null;
var packStoryResolvedId = null;

var packStoryPresent = args.includes("--pack-story");
if (packStoryPresent) {
  var packStoryArg = getArg("pack-story", null);
  if (!packStoryArg) {
    console.error("Missing value for --pack-story");
    console.error("Usage: --pack-story <pack-id>/<story-id>");
    process.exit(1);
  }
  var { resolvePackStory, printPackStoryResolution } = require("../src/pack-story-resolver");
  var packResult = resolvePackStory(packStoryArg);
  var printExit = printPackStoryResolution(packResult);
  if (printExit !== 0) {
    process.exit(printExit);
  }
  // Resolution succeeded — load the resolved story JSON and render
  var resolvedStoryPath = packResult.storyAbsolutePath;
  console.log("Rendering pack story...");
  console.log("");

  // Load the resolved pack story JSON
  var packStoryJson = JSON.parse(fs.readFileSync(resolvedStoryPath, "utf8"));

  // Store resolved story data in local variables for the rendering pipeline below.
  packStoryResolved = packStoryJson;
  packStoryResolvedPath = resolvedStoryPath;
  packStoryResolvedId = packStoryArg;

  // Isolate pack-story output under output/ppt-factory/packs/<pack-id>/
  // to avoid accidental overwrite of --story outputs.
  // Only override if --out was not explicitly provided (e.g., parity validation).
  var packId = packResult.packId;
  var userProvidedOut = args.indexOf("--out") >= 0;
  if (!userProvidedOut) {
    var packOutDir = path.join(process.cwd(), "output", "ppt-factory", "packs", packId);
    out = packOutDir;
  }
}

// ── Pack inspection (early exit, loader-backed) ────────────────

var inspectPackPresent = args.includes("--inspect-pack");
if (inspectPackPresent) {
  var inspectPackArg = getArg("inspect-pack", null);
  if (!inspectPackArg) {
    console.error("Missing value for --inspect-pack");
    console.error("Usage: --inspect-pack <pack-id>");
    process.exit(1);
  }

  // Use loader-backed inspection
  var { inspectPack: inspectPackFn } = require("../src/pack-inspection");
  var result = inspectPackFn(inspectPackArg);

  if (!result.ok) {
    // Map loader errors to user-friendly output (no stack traces)
    var inspectCode = result.errorCode || "PACK_INSPECTION_FAILED";
    switch (inspectCode) {
      case "PACK_NOT_FOUND":
        console.error("Presentation Pack not found: " + inspectPackArg);
        break;
      case "PACKS_DIR_NOT_FOUND":
        console.error("Packs directory not found: " + (result.details ? result.details.scanDir : "presentation-packs"));
        break;
      case "MANIFEST_MISSING":
        console.error("No pack.json found in: " + inspectPackArg);
        break;
      case "MANIFEST_INVALID_JSON":
        console.error("Invalid pack.json: " + (result.details ? result.details.manifestPath || inspectPackArg : inspectPackArg));
        break;
      case "VALIDATION_FAILED":
        console.error("Pack validation failed: " + result.error);
        break;
      case "ASSET_UNSAFE_PATH":
        console.error("Unsafe asset path in pack: " + (result.details ? result.details.entry || inspectPackArg : inspectPackArg));
        break;
      case "ASSET_MISSING":
        console.error("Pack asset missing: " + (result.details ? result.details.entry || inspectPackArg : inspectPackArg));
        break;
      case "DUPLICATE_PACK_ID":
        console.error("Duplicate Presentation Pack id: " + (result.details ? result.details.packId || inspectPackArg : inspectPackArg));
        break;
      default:
        console.error("Pack loader error: " + (result.error || inspectCode));
        break;
    }
    process.exit(1);
  }

  var r = result.result;
  console.log("Presentation Pack: " + r.name);
  console.log("name: " + (r.displayName || r.name));
  console.log("version: " + (r.version || "(unknown)"));
  console.log("status: " + (r.status || "(unknown)"));
  console.log("path: " + r.path);
  console.log("validation: " + r.validation);

  // Print assets — only non-empty groups
  if (r.assets) {
    var assetGroups = ["stories", "heroSequences", "terminology", "references", "content", "planners", "adapters", "themes", "examples"];
    var hasAnyAsset = false;
    for (var i = 0; i < assetGroups.length; i++) {
      if (r.assets[assetGroups[i]] && r.assets[assetGroups[i]].length > 0) {
        hasAnyAsset = true;
        break;
      }
    }
    if (hasAnyAsset) {
      console.log("assets:");
      for (var i = 0; i < assetGroups.length; i++) {
        var group = assetGroups[i];
        var entries = r.assets[group] || [];
        if (!entries.length) {
          continue;
        }
        console.log("  " + group + ":");
        for (var j = 0; j < entries.length; j++) {
          console.log("    - " + entries[j]);
        }
      }
    }
  }

  if (r.runtime) {
    console.log("runtime:");
    console.log("  loadedByDefault: " + r.runtime.loadedByDefault);
    console.log("  requiresPackLoader: " + r.runtime.requiresPackLoader);
  }

  if (r.governance) {
    console.log("governance:");
    // Output field is coreChangesAllowed (opposite of coreChangesRequired)
    var coreAllowed = r.governance.coreChangesRequired === false || r.governance.coreChangesRequired === undefined ? "false" : "true";
    console.log("  coreChangesAllowed: " + coreAllowed);
    console.log("  migrationMode: " + (r.governance.migrationMode || "unknown"));
  }

  process.exit(0);
}

// ── Story Loading ──────────────────────────────────────────────

// When --pack-story was used, skip registry loading and use resolved pack story
var story;
if (packStoryResolved) {
  story = packStoryResolved;
  console.log("Loaded pack story from: " + packStoryResolvedPath);
} else {
  const storyPath = path.join(process.cwd(), "registry/packages/ppt-factory/story", storyName + ".json");

  if (!fs.existsSync(storyPath)) {
    console.error("❌ story not found:", storyPath);
    process.exit(1);
  }

  story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
}

// ── Hero Engine Integration ──────────────────────────────────────

const { enrichStoryWithHero } = require("../src/hero-engine");

let heroSequence = null;
let heroSequencePath = null;

if (useHero) {
  if (heroSeqArg) {
    heroSequencePath = path.join(process.cwd(), "registry/packages/ppt-factory/story", heroSeqArg + ".json");
  } else {
    heroSequencePath = path.join(process.cwd(), "registry/packages/ppt-factory/story", storyName + "-hero-sequence.json");
  }

  if (fs.existsSync(heroSequencePath)) {
    heroSequence = JSON.parse(fs.readFileSync(heroSequencePath, "utf8"));
    const enriched = enrichStoryWithHero(story, heroSequence, { overrideTitle: true });
    Object.keys(story).forEach(k => delete story[k]);
    Object.assign(story, enriched);
    console.log("🦸 Hero Engine activated — narrative enrichment applied.");
  } else {
    console.warn("⚠️  Hero sequence file not found at:", heroSequencePath);
    console.warn("   Falling back to original story without hero enrichment.");
  }
}

// ── Layout Engine (adapter-first, no legacy fallback) ──────────────

const { compileLayoutPlan } = require("../src/layout-engine");
const { dispatchAdapter } = require("../src/layout-adapters");

// Pre-compile layout plans for all slides
const layoutPlans = story.slides.map(slide => ({ slide, plan: compileLayoutPlan(slide) }));

fs.mkdirSync(out, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AWE Presentation OS";

pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "zh-CN"
};


// ── Render all slides via layout adapters ──────────────────────

story.slides.forEach(slide => {
  const lp = layoutPlans.find(p => p.slide.no === slide.no);
  if (lp && dispatchAdapter({ slide, comp, pptx, story, layoutPlan: lp.plan })) {
    return; // adapter handled it
  }
  // No adapter found — skip (should not happen for known slide types)
});

// ── Render all slides ──────────────────────────────────────────

story.slides.forEach(slide => {
  renderSlide(slide, comp, pptx, story);
});

const pptPath = path.join(out, `${story.name}.pptx`);
const planPath = path.join(out, `${story.name}-slide-plan.json`);

fs.writeFileSync(planPath, JSON.stringify(story, null, 2));

pptx.writeFile({ fileName: pptPath }).then(() => {
  console.log("✅ PPT generated:");
  console.log(pptPath);
  console.log("✅ slide plan:");
  console.log(planPath);
});
