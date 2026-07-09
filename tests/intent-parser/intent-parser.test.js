// Tests for Presentation Intent Parser (M12.2)
// Run: node tests/intent-parser/intent-parser.test.js

const {
  parsePresentationIntent,
  createDefaultPresentationIntent,
  validatePresentationIntent,
} = require("../../packages/intent-parser/src/index.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

console.log("\nPresentation Intent Parser Tests (M12.2)");
console.log("=========================================\n");

console.log("Schema:");

test("createDefaultPresentationIntent returns complete contract", () => {
  const intent = createDefaultPresentationIntent();
  const result = validatePresentationIntent(intent);
  assert(result.ok, `Expected valid intent: ${result.errors.join(", ")}`);
});

test("validatePresentationIntent rejects missing fields", () => {
  const result = validatePresentationIntent({});
  assert(!result.ok, "Empty object should be invalid");
  assert(result.errors.length > 0, "Expected validation errors");
});

console.log("\nChinese prompts:");

test("parses Chinese education prompt", () => {
  const intent = parsePresentationIntent("制作一份 12 页的人工智能入门课件，面向高中生，语言通俗，包含案例、流程图、总结和互动问题。");
  assert(intent.language === "zh-CN", "Expected zh-CN");
  assert(intent.targetSlideCount === 12, "Expected 12 slides");
  assert(intent.audience === "高中生", `Unexpected audience: ${intent.audience}`);
  assert(intent.purpose === "teach", `Unexpected purpose: ${intent.purpose}`);
  assert(intent.domain === "education", `Unexpected domain: ${intent.domain}`);
  assert(intent.visualPreference === "visual-heavy", `Unexpected visual preference: ${intent.visualPreference}`);
  assert(intent.speakerNotes === true, "Speaker notes should default true");
});

test("parses Chinese business review prompt", () => {
  const intent = parsePresentationIntent("生成 15 页董事会汇报，突出收入、利润、风险和下一年度行动，减少文字，多使用数据图表。");
  assert(intent.targetSlideCount === 15, "Expected explicit slide count");
  assert(intent.audience === "general professional audience", "Audience should default when not explicit");
  assert(intent.purpose === "review", `Unexpected purpose: ${intent.purpose}`);
  assert(intent.tone === "executive", `Unexpected tone: ${intent.tone}`);
  assert(intent.contentDensity === "sparse", `Unexpected density: ${intent.contentDensity}`);
  assert(intent.visualPreference === "visual-heavy", `Unexpected visuals: ${intent.visualPreference}`);
  assert(intent.mustEmphasize.includes("收入"), "Expected emphasis extraction");
});

console.log("\nEnglish prompts:");

test("parses English research prompt", () => {
  const intent = parsePresentationIntent("Create a 10-slide research briefing on battery recycling for university researchers, emphasize methods and results, avoid market hype.");
  assert(intent.language === "en-US", "Expected en-US");
  assert(intent.targetSlideCount === 10, "Expected 10 slides");
  assert(intent.audience === "university researchers", `Unexpected audience: ${intent.audience}`);
  assert(intent.domain === "research", `Unexpected domain: ${intent.domain}`);
  assert(intent.mustEmphasize.includes("methods"), "Expected methods emphasis");
  assert(intent.mustAvoid.includes("market hype"), "Expected avoid extraction");
});

test("parses English technical prompt", () => {
  const intent = parsePresentationIntent("Make a 20 minute technical architecture overview for engineering leaders about a multi-agent workflow.");
  assert(intent.durationMinutes === 20, "Expected explicit duration");
  assert(intent.domain === "technical", `Unexpected domain: ${intent.domain}`);
  assert(intent.purpose === "summarize" || intent.purpose === "inform", `Unexpected purpose: ${intent.purpose}`);
});

console.log("\nSource inference and precedence:");

test("infers topic and slide count from source document when prompt is sparse", () => {
  const sourceDocument = {
    title: "Annual Operating Review",
    paragraphs: Array.from({ length: 18 }, (_, i) => ({ sourceId: `para-${i}` })),
    sections: [{ originalText: "Revenue" }, { originalText: "Risk" }],
    metadata: {},
  };
  const intent = parsePresentationIntent("Create a board briefing.", { sourceDocument });
  assert(intent.topic === "Annual Operating Review", `Unexpected topic: ${intent.topic}`);
  assert(intent.targetSlideCount > 6, "Expected source-length slide inference");
  assert(intent.assumptions.some((a) => a.includes("SourceDocumentModel title")), "Expected topic assumption");
});

test("explicit prompt overrides source title", () => {
  const sourceDocument = { title: "Source Title", paragraphs: [], sections: [], metadata: {} };
  const intent = parsePresentationIntent("Create a deck about Customer Success Strategy.", { sourceDocument });
  assert(intent.topic === "Customer Success Strategy", `Unexpected topic: ${intent.topic}`);
});

test("records assumptions instead of silently inventing", () => {
  const intent = parsePresentationIntent("");
  assert(intent.assumptions.length > 0, "Expected assumptions");
  assert(intent.topic === "Untitled presentation", "Expected default topic");
});

console.log("\n=========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log("All intent parser tests passed!");
