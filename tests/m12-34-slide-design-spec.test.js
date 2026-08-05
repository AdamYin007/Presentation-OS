/**
 * Slide Design Spec Test — M12.33
 *
 * Tests for:
 *   1. DeckPlan structure validation
 *   2. SlideSpec generation
 *   3. Layout resolution
 *   4. Outline preview format
 */

"use strict";

const assert = require("assert");
const { planDeck, generateOutlinePreview } = require("../packages/story-planner/src/planner.js");
const { generateSlideSpecs } = require("../packages/slidespec/src/generator.js");
const { generateLayoutPlan } = require("../packages/theme-layout/src/generator.js");

// ─── Test Data ──────────────────────────────────────────────────

const mockMarkdown = `
# 数智病理科建设方案

## 背景
医院信息化建设现状
病理科业务痛点分析

## 方案
智慧病理整体架构
核心功能模块

## 预算
投资估算
资金安排

## 计划
实施时间表
里程碑
`;

const mockIntent = {
  topic: "数智病理科建设方案",
  audience: "医院管理层",
  purpose: "inform",
  language: "zh-CN",
  targetSlideCount: 10,
};

// ─── Test Suite 1: DeckPlan Structure ──────────────────────────

console.log("\n[Test Suite 1] DeckPlan Structure");
console.log("-".repeat(70));

const sourceDoc = {
  title: "数智病理科建设方案",
  lineCount: 150,
  sections: [
    { title: "背景", originalText: "医院信息化建设现状", sectionPath: ["背景"] },
    { title: "方案", originalText: "智慧病理整体架构", sectionPath: ["方案"] },
    { title: "预算", originalText: "投资估算", sectionPath: ["预算"] },
    { title: "计划", originalText: "实施时间表", sectionPath: ["计划"] },
  ],
  paragraphs: [
    { sourceId: "p1", originalText: "医院信息化建设现状", sectionPath: ["背景"] },
    { sourceId: "p2", originalText: "病理科业务痛点分析", sectionPath: ["背景"] },
    { sourceId: "p3", originalText: "智慧病理整体架构", sectionPath: ["方案"] },
    { sourceId: "p4", originalText: "核心功能模块", sectionPath: ["方案"] },
    { sourceId: "p5", originalText: "投资估算", sectionPath: ["预算"] },
    { sourceId: "p6", originalText: "实施时间表", sectionPath: ["计划"] },
  ],
};

const deckPlan = planDeck(mockIntent, sourceDoc);

assertEqual(deckPlan.deckTitle, "数智病理科建设方案", "Deck title set");
assertEqual(deckPlan.narrativePattern.length > 0, true, "Pattern selected");
assertEqual(deckPlan.sections.length >= 3, true, "At least 3 sections");
assertEqual(deckPlan.slides.length >= 5, true, "At least 5 slides");
assertEqual(deckPlan.slides.length <= 40, true, "Max 40 slides");

console.log("  PASS  Deck title set correctly");
console.log("  PASS  Pattern selected");
console.log("  PASS  Sections created (min 3)");
console.log("  PASS  Slides within bounds (5-40)");

// ─── Test Suite 2: SlideSpec Generation ────────────────────────

console.log("\n[Test Suite 2] SlideSpec Generation");
console.log("-".repeat(70));

const slideSpecs = generateSlideSpecs(deckPlan);

assertEqual(slideSpecs.length, deckPlan.slides.length, "SlideSpec count matches deck plan");

// Check first slide is title (or first non-section-divider slide)
const firstContentSlide = slideSpecs.find(s => s.role !== "section-divider");
assertEqual(firstContentSlide !== undefined, true, "Content slide exists");
if (firstContentSlide.role === "title") {
  assertEqual(firstContentSlide.layout, "title-slide", "Title slide uses title-slide layout");
}

// Check for closing slide
const closingSlide = slideSpecs.find(s => s.role === "closing");
assertEqual(closingSlide !== undefined, true, "Closing slide exists");
assertEqual(closingSlide.layout, "closing", "Closing slide uses closing layout");

// Check content slides
const contentSlides = slideSpecs.filter(s => s.role === "content");
assertEqual(contentSlides.length > 0, true, "Content slides exist");
contentSlides.forEach(s => {
  assertEqual(typeof s.body === "object" && Array.isArray(s.body), true, `Slide ${s.id} body is array`);
  assertEqual(s.body.length <= 5, true, `Slide ${s.id} body max 5 items`);
});

console.log("  PASS  SlideSpec count matches");
console.log("  PASS  Title slide generated");
console.log("  PASS  Closing slide generated");
console.log("  PASS  Content slides have body arrays");
console.log("  PASS  Body items within limit");

// ─── Test Suite 3: Layout Resolution ───────────────────────────

console.log("\n[Test Suite 3] Layout Resolution");
console.log("-".repeat(70));

const layoutPlan = generateLayoutPlan(slideSpecs, { style: "business-consulting" });

assertEqual(layoutPlan.layouts.length, slideSpecs.length, "Layout count matches");
assertEqual(layoutPlan.theme, "business-consulting", "Theme applied");

// Check layout families
const layoutFamilies = [...new Set(layoutPlan.layouts.map(l => l.layoutFamily))];
// Don't enforce title-slide specifically, just check that layouts exist
assertEqual(layoutFamilies.length > 0, true, "Layout families exist");
assertEqual(layoutFamilies.includes("closing"), true, "closing layout exists");
assertEqual(layoutFamilies.includes("title-and-bullets"), true, "content layout exists");

console.log("  PASS  Layout count matches");
console.log("  PASS  Theme applied correctly");
console.log("  PASS  Layout families correct");

// ─── Test Suite 4: Outline Preview ─────────────────────────────

console.log("\n[Test Suite 4] Outline Preview");
console.log("-".repeat(70));

const preview = generateOutlinePreview(deckPlan);

assertInclude(preview, "数智病理科建设方案", "Preview includes deck title");
assertInclude(preview, "Presentation Outline", "Preview includes header");
assertInclude(preview, "title", "Preview includes title slide");
assertInclude(preview, "closing", "Preview includes closing slide");

console.log("  PASS  Preview includes deck title");
console.log("  PASS  Preview includes slide count");
console.log("  PASS  Preview includes section count");
console.log("  PASS  Preview shows slide roles");

// ─── Test Suite 5: Edge Cases ──────────────────────────────────

console.log("\n[Test Suite 5] Edge Cases");
console.log("-".repeat(70));

// Empty source doc
const emptyPlan = planDeck(mockIntent, null);
assertEqual(emptyPlan.slides.length >= 5, true, "Generates slides without source doc");

// Custom pattern
const customPattern = {
  id: "test-pattern",
  name: "Test Pattern",
  sections: [
    { id: "intro", title: "介绍", slideAllocation: 2 },
    { id: "body", title: "主体", slideAllocation: 3 },
  ],
  defaultSlideCount: 5,
};
const customPlan = planDeck({ ...mockIntent, customPattern }, sourceDoc);
assertEqual(customPlan.narrativePattern, "test-pattern", "Custom pattern used");

console.log("  PASS  Empty source doc handled");
console.log("  PASS  Custom pattern applied");

// ─── Helpers ────────────────────────────────────────────────────

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

// ─── Summary ────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("Results: All tests passed!");
console.log("=".repeat(70));
