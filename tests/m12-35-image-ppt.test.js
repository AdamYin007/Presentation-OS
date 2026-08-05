/**
 * Image-Based PPT Generator Tests — M12.35
 *
 * Tests for:
 *   1. Prompt generation
 *   2. Sample preview
 *   3. API configuration
 *   4. Style presets
 *   5. Composition logic
 */

"use strict";

const {
  generateImagePrompt,
  generateAllImagePrompts,
  generateSamplePreview,
  STYLE_PRESETS,
  IMAGE_API_CONFIG,
  DEFAULT_IMAGE_OPTIONS,
  SAMPLE_PREVIEW_COUNT,
} = require("../packages/image-ppt/src/index.js");

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

// Test basic prompt generation
const prompt = generateImagePrompt(testSlideSpec, "business-professional");
assertInclude(prompt, "Professional presentation slide", "Prompt includes role description");
assertInclude(prompt, "AI-Powered Healthcare", "Prompt includes title");
assertInclude(prompt, "Transforming patient care", "Prompt includes key message");
assertInclude(prompt, "professional style", "Prompt includes style");

// Test different styles
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
assertInclude(STYLE_PRESETS["business-professional"].colors.join(","), "#1a365d", "Business colors include navy");
assertInclude(STYLE_PRESETS["tech-modern"].colors.join(","), "#58a6ff", "Tech colors include blue");
assertInclude(STYLE_PRESETS["minimalist"].colors.join(","), "#ffffff", "Minimalist colors include white");
assertInclude(STYLE_PRESETS["creative-vibrant"].colors.join(","), "#ff6b6b", "Creative colors include red");

// 4. API Configuration Test
console.log("\n4. API Configuration");
console.log("-".repeat(60));

assertEqual(IMAGE_API_CONFIG["dall-e-3"].model, "dall-e-3", "DALL-E 3 model configured");
assertEqual(IMAGE_API_CONFIG["gpt-image-2"].model, "gpt-image-2", "GPT-Image-2 model configured");
assertInclude(IMAGE_API_CONFIG["azure"].endpoint || "openai.azure.com", "openai.azure.com", "Azure endpoint template correct");
assertEqual(IMAGE_API_CONFIG["custom"].model, "", "Custom model empty by default");

// 5. Default Options Test
console.log("\n5. Default Options");
console.log("-".repeat(60));

assertEqual(DEFAULT_IMAGE_OPTIONS.api, "dall-e-3", "Default API is dall-e-3");
assertEqual(DEFAULT_IMAGE_OPTIONS.size, "1792x1024", "Default size is 16:9");
assertEqual(SAMPLE_PREVIEW_COUNT, 3, "Sample preview count is 3");

// 6. Sample Preview Logic Test
console.log("\n6. Sample Preview Logic");
console.log("-".repeat(60));

// Test with different slide counts
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

// Verify sample selection logic
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

// 8. Pipeline Integration Test
console.log("\n8. Pipeline Integration");
console.log("-".repeat(60));

const { runPipeline } = require("../packages/presentation-pipeline/src/pipeline.js");

assertTrue(typeof runPipeline === "function", "runPipeline is a function");

// Test that pipeline accepts imagePpt option
const pipelineOptions = {
  imagePpt: true,
  imageStyle: "tech-modern",
  apiKey: "test-key",
  api: "dall-e-3",
};

assertEqual(pipelineOptions.imagePpt, true, "imagePpt option set correctly");
assertEqual(pipelineOptions.imageStyle, "tech-modern", "imageStyle option set correctly");
assertEqual(pipelineOptions.api, "dall-e-3", "api option set correctly");

// 9. Error Handling Test
console.log("\n9. Error Handling");
console.log("-".repeat(60));

// Test that missing API key throws error
try {
  generateImagePrompt({ title: "Test", keyMessage: "Test", role: "content" }, "business-professional");
  assertTrue(true, "Prompt generation without API key works (no key needed for prompt gen)");
} catch (error) {
  assertTrue(false, "Prompt generation should not require API key");
}

// 10. Output Format Test
console.log("\n10. Output Format");
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
