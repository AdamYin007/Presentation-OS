#!/usr/bin/env node
/**
 * Boundary & Edge Case Tests — M12.7 / M12.20 / M12.24 / M12.25
 *
 * Verifies pipeline robustness under abnormal conditions:
 *   1. Empty/minimal inputs
 *   2. Very large inputs (stress)
 *   3. Invalid/missing configurations
 *   4. Special characters and unicode
 *   5. Malformed markdown
 *   6. Single-element inputs
 *   7. Extreme audience/speaker combinations
 *   8. Compiler mode edge cases
 */
"use strict";

const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { parsePresentationIntent } = require("../packages/intent-parser/src/index.js");
const { compilePresentation } = require("../packages/presentation-compiler/src/index.js");
const { adaptDeck } = require("../packages/presentation-audience-engine/src/index.js");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}`);
  }
}

function assertThrows(fn, expectedTypeOrMsg, message) {
  totalTests++;
  try {
    fn();
    failedTests++;
    console.error(`  FAIL  ${message}: expected throw but none thrown`);
  } catch (err) {
    if (
      typeof expectedTypeOrMsg === "string"
        ? err.message.includes(expectedTypeOrMsg)
        : err instanceof expectedTypeOrMsg
    ) {
      passedTests++;
      console.log(`  PASS  ${message}`);
    } else {
      failedTests++;
      console.error(
        `  FAIL  ${message}: threw "${err.message}" instead of matching "${expectedTypeOrMsg}"`,
      );
    }
  }
}

function assertNotThrows(fn, message) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  PASS  ${message}`);
  } catch (err) {
    failedTests++;
    console.error(`  FAIL  ${message}: threw "${err.message}"`);
  }
}

// ─── Test Suites ──────────────────────────────────────────────

async function testEmptyAndMinimalInputs() {
  console.log("\n[Suite] Empty & Minimal Inputs");

  // Empty string
  const emptyResult = await runPipeline("");
  assert(emptyResult !== null, "Empty input returns result object");
  assert(Buffer.isBuffer(emptyResult.pptxBuffer), "Empty input produces PPTX buffer");

  // Whitespace only
  const wsResult = await runPipeline("   \n\t  ");
  assert(wsResult !== null, "Whitespace-only input returns result object");

  // Single character
  const singleChar = await runPipeline("# X");
  assert(singleChar.slideCount >= 0, "Single character input handled");

  // Single word
  const singleWord = await runPipeline("Hello");
  assert(singleWord !== null, "Single word input handled");

  // Just a title
  const justTitle = await runPipeline("# My Title\n");
  assert(justTitle.slideCount > 0, "Just a title produces slides");
}

async function testLargeInputs() {
  console.log("\n[Suite] Large Input Stress Tests");

  // Build a large markdown document (200+ lines)
  const largeLines = [];
  for (let i = 0; i < 50; i++) {
    largeLines.push(`## Section ${i + 1}`);
    largeLines.push(`This is section ${i + 1} with detailed content.`);
    for (let j = 0; j < 5; j++) {
      largeLines.push(`- Point ${j + 1} in section ${i + 1}: important detail number ${j}`);
    }
    largeLines.push("");
  }
  const largeInput = "# Large Presentation\n\n" + largeLines.join("\n");

  const result = await runPipeline(largeInput);
  assert(result !== null, "Large input returns result");
  assert(result.slideCount > 0, "Large input produces slides");
  assert(result.pptxBuffer.length > 0, "Large input produces non-empty PPTX");
  assert(result.pptxBuffer.length < 5 * 1024 * 1024, "Large input PPTX stays under 5MB");

  // Very long single line
  const longLine = "# " + "A".repeat(5000);
  const longLineResult = await runPipeline(longLine);
  assert(longLineResult !== null, "Very long single line handled");
}

async function testInvalidConfigurations() {
  console.log("\n[Suite] Invalid Configuration Handling");

  // Invalid style
  const invalidStyle = await runPipeline("# Test", { style: "totally-invalid-style" });
  assert(invalidStyle !== null, "Invalid style doesn't crash pipeline");
  assert(Buffer.isBuffer(invalidStyle.pptxBuffer), "Invalid style still produces PPTX");

  // Null options
  const nullOpts = await runPipeline("# Test", null);
  assert(nullOpts !== null, "Null options handled gracefully");

  // Undefined options
  const undefinedOpts = await runPipeline("# Test", undefined);
  assert(undefinedOpts !== null, "Undefined options handled gracefully");

  // Compiler with invalid mode
  const invalidCompiler = await runPipeline("# Test", { compiler: "invalid-mode" });
  assert(invalidCompiler !== null, "Invalid compiler mode doesn't crash");

  // Audience engine with unknown profiles
  const unknownProfiles = await runPipeline("# Test", {
    audienceEngine: { speaker: "alien", audience: "mars-dweller" },
  });
  assert(unknownProfiles !== null, "Unknown speaker/audience profiles don't crash");
}

async function testSpecialCharactersAndUnicode() {
  console.log("\n[Suite] Special Characters & Unicode");

  // Chinese content
  const chinese = "# 数字病理学概述\n\n## 背景\n\n人工智能正在改变医疗行业。\n\n- 全切片成像\n- 深度学习算法\n- 云端协作平台";
  const zhResult = await runPipeline(chinese);
  assert(zhResult !== null, "Chinese input handled");
  assert(zhResult.slideCount > 0, "Chinese input produces slides");

  // Emoji
  const emoji = "# AI 🤖 Future 🚀\n\n- Technology 💡\n- Innovation 🔬";
  const emojiResult = await runPipeline(emoji);
  assert(emojiResult !== null, "Emoji input handled");

  // Special markdown characters
  const special = "# Title *with* **bold** `code` and [links](http://example.com)\n\n> Blockquote\n\n- List item\n\n| Table | Col |\n|-------|-----|\n| A     | B   |";
  const specialResult = await runPipeline(special);
  assert(specialResult !== null, "Special markdown chars handled");

  // Newlines and tabs
  const weirdNewlines = "##\n\n\n\nSection\n\n\n\nContent\n\n\n\n- Item 1\n\n- Item 2";
  const weirdResult = await runPipeline(weirdNewlines);
  assert(weirdResult !== null, "Excessive newlines handled");

  // Very short Chinese
  const tinyChinese = "测试";
  const tinyResult = await runPipeline(tinyChinese);
  assert(tinyResult !== null, "Tiny Chinese input handled");
}

async function testMalformedMarkdown() {
  console.log("\n[Suite] Malformed Markdown");

  // Unclosed headers
  const unclosed = "# This header has no content\n## Another header\n- Bullet without text";
  const unclosedResult = await runPipeline(unclosed);
  assert(unclosedResult !== null, "Unclosed/odd headers handled");

  // Nested lists
  const nested = "- Level 1\n  - Level 2\n    - Level 3\n      - Level 4\n        - Level 5";
  const nestedResult = await runPipeline(nested);
  assert(nestedResult !== null, "Deeply nested lists handled");

  // Tables without alignment
  const badTable = "| Header |\n|--------|\n| Cell |";
  const tableResult = await runPipeline(badTable);
  assert(tableResult !== null, "Malformed tables handled");

  // Random text
  const random = "asdfghjkl qwerty zxcvbnm 1234567890";
  const randomResult = await runPipeline(random);
  assert(randomResult !== null, "Random text handled");

  // Only bullet points
  const bulletsOnly = "- Point one\n- Point two\n- Point three\n- Point four\n- Point five";
  const bulletsResult = await runPipeline(bulletsOnly);
  assert(bulletsResult !== null, "Bullets-only input handled");
}

async function testSingleElementInputs() {
  console.log("\n[Suite] Single Element Inputs");

  // Single heading
  const singleHeading = await runPipeline("# Only One Heading");
  assert(singleHeading.slideCount > 0, "Single heading produces slides");

  // Single bullet
  const singleBullet = await runPipeline("- Just one bullet point");
  assert(singleBullet !== null, "Single bullet handled");

  // Single paragraph
  const singleParagraph = await runPipeline("Just a plain paragraph of text.");
  assert(singleParagraph !== null, "Single paragraph handled");

  // Single image reference
  const singleImage = await runPipeline("![Image](https://example.com/image.png)");
  assert(singleImage !== null, "Image reference handled");
}

async function testAudienceEngineEdgeCases() {
  console.log("\n[Suite] Audience Engine Edge Cases");

  // Empty slide specs
  const emptyAdapt = adaptDeck([], null, {});
  assert(emptyAdapt !== null, "Empty slide specs handled by audience engine");

  // Null layout plan
  const nullLayout = adaptDeck([{ role: "content", title: "Test" }], null, {
    speaker: "executive",
    audience: "board",
  });
  assert(nullLayout !== null, "Null layout plan handled by audience engine");

  // Unknown speaker only
  const unknownSpeaker = adaptDeck([{ role: "content", title: "Test" }], null, {
    speaker: "nonexistent",
  });
  assert(unknownSpeaker !== null, "Unknown speaker handled gracefully");

  // Unknown audience only
  const unknownAudience = adaptDeck([{ role: "content", title: "Test" }], null, {
    audience: "nonexistent",
  });
  assert(unknownAudience !== null, "Unknown audience handled gracefully");

  // Both unknown
  const bothUnknown = adaptDeck([{ role: "content", title: "Test" }], null, {
    speaker: "aliens",
    audience: "robots",
  });
  assert(bothUnknown !== null, "Both unknown handled gracefully");

  // Custom rules override
  const customRules = adaptDeck([{ role: "content", title: "Test" }], null, {
    speaker: "executive",
    audience: "engineers",
    customRules: { titleDepth: "simple" },
  });
  assert(customRules !== null, "Custom rules override handled");
}

async function testCompilerEdgeCases() {
  console.log("\n[Suite] Compiler Edge Cases");

  // Empty slide specs
  const emptyCompile = compilePresentation([], null, {});
  assert(emptyCompile !== null, "Empty slide specs handled by compiler");

  // Null layout plan
  const nullLayout = compilePresentation([{ role: "content", title: "Test" }], null, {});
  assert(nullLayout !== null, "Null layout plan handled by compiler");

  // All modes with minimal input
  const modes = ["fast", "standard", "optimized"];
  for (const mode of modes) {
    const result = compilePresentation([{ role: "content", title: "Test" }], null, { mode });
    assert(result !== null, `Compiler ${mode} mode handles minimal input`);
  }

  // Slide with extreme bullet count
  const manyBullets = {
    role: "content",
    title: "Many Bullets",
    body: Array.from({ length: 50 }, (_, i) => `Bullet ${i + 1}`),
  };
  const overflowResult = compilePresentation([manyBullets], null, { mode: "optimized" });
  assert(overflowResult !== null, "Overflow detection handles many bullets");
}

async function testIntentParserEdgeCases() {
  console.log("\n[Suite] Intent Parser Edge Cases");

  // Empty prompt
  const emptyIntent = parsePresentationIntent("");
  assert(emptyIntent !== null, "Empty prompt returns intent");
  assert(typeof emptyIntent.language === "string", "Empty prompt has language");
  assert(typeof emptyIntent.topic === "string", "Empty prompt has topic");

  // Very long prompt
  const longPrompt = "Create a presentation about " + "technology ".repeat(500);
  const longIntent = parsePresentationIntent(longPrompt);
  assert(longIntent !== null, "Very long prompt handled");

  // Mixed language
  const mixedLang = "制作一份关于 AI 和 artificial intelligence 的 presentation";
  const mixedIntent = parsePresentationIntent(mixedLang);
  assert(mixedIntent !== null, "Mixed language handled");

  // Numeric-only
  const numeric = "1234567890";
  const numericIntent = parsePresentationIntent(numeric);
  assert(numericIntent !== null, "Numeric-only input handled");

  // Only punctuation
  const punctuation = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
  const punctIntent = parsePresentationIntent(punctuation);
  assert(punctIntent !== null, "Punctuation-only input handled");
}

async function testPipelineOutputConsistency() {
  console.log("\n[Suite] Pipeline Output Consistency");

  const input = "# Test Deck\n\n## Overview\n\n- Point A\n- Point B\n\n## Details\n\n- Detail 1\n- Detail 2";

  // Run twice with same input, check both produce valid PPTX
  const r1 = await runPipeline(input);
  const r2 = await runPipeline(input);

  assert(r1.slideCount === r2.slideCount, "Same input produces same slide count");
  assert(Buffer.isBuffer(r1.pptxBuffer), "First run produces buffer");
  assert(Buffer.isBuffer(r2.pptxBuffer), "Second run produces buffer");

  // Brand profile with pipeline
  const { loadProfile, resolveBrandConfig } = require("../packages/brand-profiles/src/index.js");
  const brandConfig = resolveBrandConfig(loadProfile("business-consulting").profile);
  const branded = await runPipeline(input, { brandConfig });
  assert(branded !== null, "Branded pipeline produces result");
  assert(Buffer.isBuffer(branded.pptxBuffer), "Branded pipeline produces buffer");

  // Compiler enabled
  const compiled = await runPipeline(input, { compiler: true });
  assert(compiled !== null, "Compiler-enabled pipeline produces result");

  // Audience engine enabled
  const adapted = await runPipeline(input, {
    audienceEngine: { speaker: "executive", audience: "board" },
  });
  assert(adapted !== null, "Audience-engine-enabled pipeline produces result");
}

// ─── Run All Tests ────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("Boundary & Edge Case Tests");
  console.log("=".repeat(65));

  try {
    await testEmptyAndMinimalInputs();
    await testLargeInputs();
    await testInvalidConfigurations();
    await testSpecialCharactersAndUnicode();
    await testMalformedMarkdown();
    await testSingleElementInputs();
    await testAudienceEngineEdgeCases();
    await testCompilerEdgeCases();
    await testIntentParserEdgeCases();
    await testPipelineOutputConsistency();
  } catch (err) {
    console.error("\nUnexpected error during tests:", err.message);
    console.error(err.stack);
    failedTests++;
  }

  console.log("\n" + "=".repeat(65));
  console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
  console.log("=".repeat(65));

  if (failedTests > 0) process.exit(1);
  process.exit(0);
}

main();
