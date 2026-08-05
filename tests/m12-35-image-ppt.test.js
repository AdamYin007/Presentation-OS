/**
 * Image-Based PPT Generator Tests
 *
 * Tests for:
 *   1. Prompt generation
 *   2. Style presets
 *   3. Composition logic
 */

"use strict";

const {
  generateImagePrompt,
  generateAllImagePrompts,
  STYLE_PRESETS,
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
assertInclude(prompt, "business-professional", "Prompt includes style");

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

// 4. Edge Cases
console.log("\n4. Edge Cases");
console.log("-".repeat(60));

const emptySpec = {
  id: "slide-empty",
  title: "",
  keyMessage: "",
  body: [],
};

const emptyPrompt = generateImagePrompt(emptySpec, "business-professional");
assertEqual(emptyPrompt.includes("Presentation Slide"), true, "Empty spec still generates valid prompt");

const longSpec = {
  id: "slide-long",
  title: "A Very Long Title That Exceeds Normal Length",
  keyMessage: "A very long key message that contains multiple sentences and detailed explanations about the topic being discussed",
  body: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7"],
};

const longPrompt = generateImagePrompt(longSpec, "business-professional");
assertInclude(longPrompt, "A Very Long Title", "Long title handled correctly");

// ── Results ───────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log("=".repeat(60) + "\n");

if (failCount > 0) {
  process.exit(1);
}
