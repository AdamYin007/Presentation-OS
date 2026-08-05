/**
 * Story Planner Tests — M12.3 Enhanced
 *
 * Tests for:
 *   1. Document length auto-compression
 *   2. Custom narrative patterns
 *   3. Outline preview generation
 *   4. Core planning logic
 */

"use strict";

const assert = require("assert");
const { planDeck, generateOutlinePreview, calculateTargetSlideCount } = require("../packages/story-planner/src/planner.js");

// ─── Helpers ─────────────────────────────────────────────────────

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertInclude(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(`Assertion failed: ${message}\n  String does not include: ${substr}`);
  }
}

// ─── Test Data ───────────────────────────────────────────────────

const mockSourceDocument = {
  title: "Test Document",
  lineCount: 150,
  sections: [
    { title: "背景", originalText: "This is the background section", sectionPath: ["背景"] },
    { title: "方案", originalText: "This is the solution section", sectionPath: ["方案"] },
    { title: "实施", originalText: "This is the implementation section", sectionPath: ["实施"] },
  ],
  paragraphs: [
    { sourceId: "p1", originalText: "背景介绍内容", sectionPath: ["背景"] },
    { sourceId: "p2", originalText: "方案详细描述", sectionPath: ["方案"] },
    { sourceId: "p3", originalText: "实施计划安排", sectionPath: ["实施"] },
  ],
};

const mockIntent = {
  topic: "Test Presentation",
  audience: "management",
  purpose: "inform",
  language: "zh-CN",
};

// ─── Test Suite 1: Document Length Compression ─────────────────

console.log("\n[Test Suite 1] Document Length Auto-Compression");
console.log("-".repeat(70));

// Test 1.1: Short document gets minimum slide count
const shortDoc = {
  lineCount: 50,
  title: "Short Doc",
  sections: [],
  paragraphs: [],
};
const result1 = calculateTargetSlideCount(shortDoc, {});
assert(result1 >= 5, "Minimum 5 slides for short doc");
assert(result1 <= 40, "Maximum 40 slides");
assertEqual(result1, 5, "50 lines -> min 5 slides");

// Test 1.2: Long document gets compressed
const longDoc = {
  lineCount: 2000,
  title: "Long Doc",
  sections: [],
  paragraphs: [],
};
const result2 = calculateTargetSlideCount(longDoc, {});
assertEqual(result2, 40, "2000 lines -> capped at 40 slides");

// Test 1.3: Medium document
const mediumDoc = {
  lineCount: 300,
  title: "Medium Doc",
  sections: [],
  paragraphs: [],
};
const result3 = calculateTargetSlideCount(mediumDoc, {});
assertEqual(result3, 10, "300 lines -> 10 slides");

// Test 1.4: Intent min/max overrides
const result4 = calculateTargetSlideCount(longDoc, { minSlides: 5, maxSlides: 15 });
assertEqual(result4, 15, "Max slides override applied");

const result5 = calculateTargetSlideCount(shortDoc, { minSlides: 10, maxSlides: 20 });
assertEqual(result5, 10, "Min slides override applied");

console.log("  PASS  Short document compression");
console.log("  PASS  Long document compression");
console.log("  PASS  Medium document calculation");
console.log("  PASS  Min/max override");

// ─── Test Suite 2: Custom Narrative Patterns ────────────────────

console.log("\n[Test Suite 2] Custom Narrative Patterns");
console.log("-".repeat(70));

// Test 2.1: Custom pattern with explicit sections
const customPattern = {
  id: "custom-medical",
  name: "Medical Proposal",
  sections: [
    { id: "intro", title: "项目背景", slideAllocation: 2 },
    { id: "analysis", title: "现状分析", slideAllocation: 3 },
    { id: "solution", title: "建设方案", slideAllocation: 5 },
    { id: "budget", title: "投资预算", slideAllocation: 2 },
    { id: "timeline", title: "实施计划", slideAllocation: 2 },
  ],
  defaultSlideCount: 14,
};

const intent2 = {
  ...mockIntent,
  customPattern,
  targetSlideCount: 12,
};

const result6 = planDeck(intent2, mockSourceDocument);
assertEqual(result6.narrativePattern, "custom-medical", "Custom pattern used");
assertEqual(result6.sections.length, 5, "5 sections created");
// 12 content slides + 4 section dividers + 1 closing = 17
assert(result6.slides.length >= 12, "At least 12 content slides");

// Test 2.2: Pattern with different slide allocation
const customPattern2 = {
  id: "custom-pitch",
  name: "Pitch Deck",
  sections: [
    { id: "problem", title: "问题", slideAllocation: 2 },
    { id: "solution", title: "解决方案", slideAllocation: 3 },
    { id: "market", title: "市场", slideAllocation: 2 },
    { id: "business", title: "商业模式", slideAllocation: 2 },
  ],
  defaultSlideCount: 9,
};

const intent3 = {
  ...mockIntent,
  customPattern: customPattern2,
};

const result7 = planDeck(intent3, mockSourceDocument);
assertEqual(result7.narrativePattern, "custom-pitch", "Custom pitch pattern used");
assertEqual(result7.sections.length, 4, "4 sections");
assert(result7.slides.length >= 9, "At least 9 slides");

console.log("  PASS  Custom pattern with sections");
console.log("  PASS  Pattern with slide allocation");

// ─── Test Suite 3: Outline Preview ──────────────────────────────

console.log("\n[Test Suite 3] Outline Preview Generation");
console.log("-".repeat(70));

const deckPlan = {
  deckTitle: "数智病理科建设方案",
  narrativePattern: "problem-insight-solution-action",
  slides: [
    { slideId: "slide-001", index: 1, role: "title", section: "Title", keyMessage: "数智病理科建设方案", candidateVisual: "none" },
    { slideId: "slide-002", index: 2, role: "section-divider", section: "背景", keyMessage: "建设背景与目标", candidateVisual: "none" },
    { slideId: "slide-003", index: 3, role: "content", section: "背景", keyMessage: "医院现状分析", candidateVisual: "none" },
    { slideId: "slide-004", index: 4, role: "data-chart", section: "分析", keyMessage: "病理科室数据统计", candidateVisual: "bar-chart" },
    { slideId: "slide-005", index: 5, role: "closing", section: "Closing", keyMessage: "感谢聆听", candidateVisual: "none" },
  ],
  sections: [
    { title: "背景", slideAllocation: 2 },
    { title: "分析", slideAllocation: 1 },
    { title: "Closing", slideAllocation: 1 },
  ],
};

const preview = generateOutlinePreview(deckPlan);
assertInclude(preview, "数智病理科建设方案", "Includes deck title");
assertInclude(preview, "背景", "Includes section title");
assertInclude(preview, "病理科室数据统计", "Includes content slide");
assertInclude(preview, "📊", "Includes visual type indicator");
assertInclude(preview, "Presentation Outline Preview", "Includes preview title");

console.log("  PASS  Generates outline preview");
console.log("  PASS  Includes title and sections");
console.log("  PASS  Shows visual types");

// ─── Test Suite 4: Core Planning Logic ──────────────────────────

console.log("\n[Test Suite 4] Core Planning Logic");
console.log("-".repeat(70));

// Test 4.1: Default pattern selection
const intent4 = {
  ...mockIntent,
  purpose: "inform",
};
const result8 = planDeck(intent4, mockSourceDocument);
assert(result8.narrativePattern.length > 0, "Pattern selected");
assert(result8.slides.length >= 5, "Minimum slides generated");
assert(result8.slides.length <= 40, "Maximum slides respected");

// Test 4.2: Title from source document
const intent5 = {
  ...mockIntent,
  topic: "Override Title",
};
const result9 = planDeck(intent5, { ...mockSourceDocument, title: "源文档标题" });
assertEqual(result9.deckTitle, "源文档标题", "Title from source document");

// Test 4.3: Subtitle construction
const intent6 = {
  ...mockIntent,
  audience: "executives",
  purpose: "persuade",
};
const result10 = planDeck(intent6, mockSourceDocument);
assertInclude(result10.subtitle, "executives", "Subtitle includes audience");
assertInclude(result10.subtitle, "persuade", "Subtitle includes purpose");

console.log("  PASS  Default pattern selection");
console.log("  PASS  Title from source document");
console.log("  PASS  Subtitle construction");

// ─── Test Suite 5: Edge Cases ───────────────────────────────────

console.log("\n[Test Suite 5] Edge Cases");
console.log("-".repeat(70));

// Test 5.1: Empty source document
const intent7 = { ...mockIntent };
const result11 = planDeck(intent7, null);
assert(result11.slides.length >= 5, "Generates slides even without source doc");

// Test 5.2: Very small document
const tinyDoc = { lineCount: 10, sections: [], paragraphs: [] };
const result12 = calculateTargetSlideCount(tinyDoc, {});
assertEqual(result12, 5, "Minimum 5 slides for tiny doc");

// Test 5.3: Very large document
const hugeDoc = { lineCount: 10000, sections: [], paragraphs: [] };
const result13 = calculateTargetSlideCount(hugeDoc, {});
assertEqual(result13, 40, "Maximum 40 slides for huge doc");

console.log("  PASS  Empty source document handling");
console.log("  PASS  Tiny document minimum");
console.log("  PASS  Huge document maximum");

// ─── Summary ────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("Results: All tests passed!");
console.log("=".repeat(70));
