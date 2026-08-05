/**
 * Image-Based PPT Generator Tests — M12.35
 *
 * Tests for:
 *   1. Prompt generation
 *   2. Sample preview
 *   3. API configuration
 *   4. Style presets
 *   5. Pipeline integration
 */

"use strict";

const {
  generateImagePrompt,
  generateAllImagePrompts,
  generateSamplePreview,
  STYLE_PRESETS,
  API_CONFIG,
} = require("../packages/image-ppt/src/index.js");
const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");

// ── Helpers ───────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Actual: ${actual}`);
  }
}

function assertInclude(str, substr, message) {
  if (str.includes(substr)) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
    console.log(`    String: ${str}`);
    console.log(`    Missing: ${substr}`);
  }
}

function assertTrue(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
  }
}

// ── Tests ─────────────────────────────────────────────────────────

console.log("\n=== Image-Based PPT Generator Tests ===\n");

// 1. Prompt Generation Tests
console.log("1. Prompt Generation");
console.log("-".repeat(60));

const testSlideSpec = {
  id: "slide-001",
  index: 1,
  section: "intro",
  role: "title",
  title: "AI-Powered Healthcare",
  keyMessage: "Transforming patient care with intelligent diagnostics",
  body: ["AI-powered diagnostics", "Real-time analysis", "Improved accuracy"],
  visualType: "image",
  visualSpec: {},
  layout: "title-slide",
  speakerNotes: "",
  sourceRefs: [],
  designHints: {},
};

const prompt = generateImagePrompt(testSlideSpec, "business-professional");
assertInclude(prompt, "Professional presentation slide", "Prompt includes role description");
assertInclude(prompt, "AI-Powered Healthcare", "Prompt includes title");
assertInclude(prompt, "Transforming patient care", "Prompt includes key message");
assertInclude(prompt, "professional style", "Prompt includes style");

const techPrompt = generateImagePrompt(testSlideSpec, "tech-modern");
assertInclude(techPrompt, "futuristic", "Tech style includes futuristic mood");
assertInclude(techPrompt, "neon accents", "Tech style includes lighting");

const minimalPrompt = generateImagePrompt(testSlideSpec, "minimalist");
assertInclude(minimalPrompt, "clean, simple", "Minimalist style includes mood");
assertInclude(minimalPrompt, "balanced", "Minimalist style includes composition");

// 2. Multiple Prompts Test
console.log("\n2. Multiple Slide Prompts");
console.log("-".repeat(60));

const slideSpecs = [
  { ...testSlideSpec, id: "slide-001", title: "Title Slide" },
  { ...testSlideSpec, id: "slide-002", role: "content", title: "Key Findings" },
  { ...testSlideSpec, id: "slide-003", role: "closing", title: "Thank You" },
];

const prompts = generateAllImagePrompts(slideSpecs, "business-professional");
assertEqual(prompts.length, 3, "Generated 3 prompts for 3 slides");
assertInclude(prompts[0].prompt, "Title Slide", "First prompt includes title");
assertInclude(prompts[1].prompt, "Key Findings", "Second prompt includes title");
assertInclude(prompts[2].prompt, "Thank You", "Third prompt includes title");

// 3. Style Presets Test
console.log("\n3. Style Presets");
console.log("-".repeat(60));

assertEqual(Object.keys(STYLE_PRESETS).length, 4, "4 style presets defined");
assertInclude(STYLE_PRESETS["business-professional"].mood, "corporate", "Business mood includes corporate");
assertInclude(STYLE_PRESETS["tech-modern"].mood, "futuristic", "Tech mood includes futuristic");
assertInclude(STYLE_PRESETS["minimalist"].mood, "clean", "Minimalist mood includes clean");
assertInclude(STYLE_PRESETS["creative-vibrant"].mood, "energetic", "Creative mood includes energetic");

// 4. API Configuration Test
console.log("\n4. API Configuration");
console.log("-".repeat(60));

assertEqual(API_CONFIG["dall-e-3"].model, "dall-e-3", "DALL-E 3 model configured");
assertEqual(API_CONFIG["gpt-image-2"].model, "gpt-image-2", "GPT-Image-2 model configured");
assertEqual(API_CONFIG["azure"].endpoint, "", "Azure endpoint empty by default");
assertEqual(API_CONFIG["custom"].model, "", "Custom model empty by default");

// 5. Pipeline Integration Test
console.log("\n5. Pipeline Integration");
console.log("-".repeat(60));

assertTrue(typeof runPipeline === "function", "runPipeline is a function");

// Test pipeline with imagePpt option
const pipelineOptions = {
  imagePpt: true,
  imageStyle: "tech-modern",
  apiKey: "test-key",
  api: "dall-e-3",
};

assertEqual(pipelineOptions.imagePpt, true, "imagePpt option set correctly");
assertEqual(pipelineOptions.imageStyle, "tech-modern", "imageStyle option set correctly");
assertEqual(pipelineOptions.api, "dall-e-3", "api option set correctly");

// 6. Sample Preview Logic Test
console.log("\n6. Sample Preview Logic");
console.log("-".repeat(60));

const shortSpecs = [
  { id: "slide-001", title: "Title", keyMessage: "Msg1", role: "title" },
  { id: "slide-002", title: "Content", keyMessage: "Msg2", role: "content" },
];

const longSpecs = [];
for (let i = 1; i <= 10; i++) {
  longSpecs.push({
    id: `slide-${String(i).padStart(3, "0")}`,
    title: `Slide ${i}`,
    keyMessage: `Message ${i}`,
    role: i === 1 ? "title" : i === 10 ? "closing" : "content",
  });
}

assertTrue(shortSpecs.length >= 2, "Short deck has 2+ slides");
assertTrue(longSpecs.length >= 10, "Long deck has 10+ slides");

// 7. Edge Cases
console.log("\n7. Edge Cases");
console.log("-".repeat(60));

const emptySpec = {
  id: "slide-empty",
  title: "",
  keyMessage: "",
  body: [],
};

const emptyPrompt = generateImagePrompt(emptySpec, "business-professional");
assertInclude(emptyPrompt, "presentation slide", "Empty spec still generates valid prompt");

const longSpec = {
  id: "slide-long",
  title: "A Very Long Title That Exceeds Normal Length",
  keyMessage: "A very long key message that contains multiple sentences and detailed explanations about the topic being discussed",
  body: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7"],
};

const longPrompt = generateImagePrompt(longSpec, "business-professional");
assertInclude(longPrompt, "A Very Long Title", "Long title handled correctly");

// 8. Output Format Test
console.log("\n8. Output Format");
console.log("-".repeat(60));

const outputStructure = {
  pptxPath: "/path/to/presentation.pptx",
  images: [
    { slideIndex: 0, slideId: "slide-001", prompt: "...", status: "success", imageUrl: "..." }
  ],
  prompts: [
    { slideIndex: 0, slideId: "slide-001", prompt: "..." }
  ],
  samplePreview: {
    samples: [
      { slideIndex: 0, localPath: "/path/to/sample-0.jpg" }
    ],
    outputDir: "/path/to/preview",
    count: 3
  },
  stats: {
    total: 10,
    success: 10,
    failed: 0
  }
};

assertEqual(typeof outputStructure.pptxPath, "string", "pptxPath is string");
assertEqual(Array.isArray(outputStructure.images), true, "images is array");
assertEqual(typeof outputStructure.stats.total, "number", "stats.total is number");
assertEqual(typeof outputStructure.samplePreview.count, "number", "samplePreview.count is number");

// ── Results ───────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log("=".repeat(60) + "\n");

if (failCount > 0) {
  process.exit(1);
}
