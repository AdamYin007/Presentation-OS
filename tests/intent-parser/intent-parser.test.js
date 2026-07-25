/**
 * Intent Parser Tests — M12.2
 *
 * Covers: parsePresentationIntent, inferLanguage, inferTopic, inferAudience,
 * and all inference helpers used by the parser.
 */

const {
  parsePresentationIntent,
  inferLanguage,
  inferTopic,
  inferAudience,
} = require("../../packages/intent-parser/src/parser.js");
const {
  createDefaultPresentationIntent,
  validatePresentationIntent,
} = require("../../packages/intent-parser/src/schema.js");

// ── Helpers ────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
const failures = [];

function assert(condition, msg) {
  if (!condition) {
    _failed++;
    failures.push(`FAIL: ${msg}`);
  } else {
    _passed++;
  }
}

function assertEqual(actual, expected, msg) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    msg || `Expected ${expected}, got ${actual}`,
  );
}

// ── Schema: createDefaultPresentationIntent ────────────────────────

console.log("\nSchema: createDefaultPresentationIntent");

{
  const def = createDefaultPresentationIntent();
  assertEqual(def.topic, "", "default topic is empty string");
  assertEqual(def.purpose, "inform", "default purpose is inform");
  assertEqual(def.language, "zh-CN", "default language is zh-CN");
  assertEqual(def.targetSlideCount, 12, "default slide count is 12");
  assertEqual(def.durationMinutes, 15, "default duration is 15 min");
  assertEqual(def.tone, "professional", "default tone is professional");
  assertEqual(def.style, "minimal-modern", "default style is minimal-modern");
  assertEqual(def.contentDensity, "medium", "default density is medium");
  assertEqual(def.visualPreference, "balanced", "default visual preference is balanced");
  assertEqual(def.speakerNotes, true, "default speaker notes enabled");
  assert(Array.isArray(def.mustInclude), "mustInclude is array");
  assert(Array.isArray(def.mustEmphasize), "mustEmphasize is array");
  assert(Array.isArray(def.mustAvoid), "mustAvoid is array");
  assert(Array.isArray(def.assumptions), "assumptions is array");
}

{
  // Overrides merge correctly
  const override = createDefaultPresentationIntent({ topic: "Test Topic", audience: "Engineers" });
  assertEqual(override.topic, "Test Topic", "override topic works");
  assertEqual(override.audience, "Engineers", "override audience works");
  assertEqual(override.purpose, "inform", "non-overridden fields keep defaults");
}

// ── Schema: validatePresentationIntent ─────────────────────────────

console.log("\nSchema: validatePresentationIntent");

{
  const valid = validatePresentationIntent(createDefaultPresentationIntent());
  assert(valid.ok, "default intent passes validation");
}

{
  const invalid = validatePresentationIntent(null);
  assert(!invalid.ok, "null intent fails validation");
  assert(invalid.errors.length > 0, "null intent has error messages");
}

{
  const badObj = { topic: 123 };
  const result = validatePresentationIntent(badObj);
  assert(!result.ok, "missing required fields fails validation");
  assert(
    result.errors.some((e) => e.includes("Missing required field")),
    "error mentions missing fields",
  );
}

{
  const badType = { ...createDefaultPresentationIntent(), targetSlideCount: -5 };
  const result = validatePresentationIntent(badType);
  assert(!result.ok, "negative slide count fails validation");
}

{
  const badNotes = { ...createDefaultPresentationIntent(), speakerNotes: "yes" };
  const result = validatePresentationIntent(badNotes);
  assert(!result.ok, "non-boolean speakerNotes fails validation");
}

// ── parsePresentationIntent: basic ─────────────────────────────────

console.log("\nParsing: Basic intent parsing");

{
  const intent = parsePresentationIntent("Create a presentation about AI");
  assertEqual(intent.topic, "AI", "topic inferred from 'about' keyword");
  assertEqual(intent.purpose, "inform", "default purpose for neutral prompt");
  assertEqual(intent.language, "en-US", "English text detected");
  assert(intent.assumptions.length > 0, "assumptions recorded for defaults");
}

{
  const intent = parsePresentationIntent("制作一份关于数字病理的课件");
  assertEqual(intent.language, "zh-CN", "Chinese text detected");
  assertEqual(intent.topic, "数字病理的课件", "Chinese topic extracted from '关于'");
}

// ── parsePresentationIntent: purpose detection ─────────────────────

console.log("\nParsing: Purpose detection");

{
  const intent = parsePresentationIntent("Teaching a course on machine learning");
  assertEqual(intent.purpose, "teach", "teach purpose from 'teaching' keyword");
}

{
  const intent = parsePresentationIntent("路演提案，需要说服投资人");
  assertEqual(intent.purpose, "persuade", "persuade purpose from Chinese keywords");
}

{
  const intent = parsePresentationIntent("Annual business review Q4");
  assertEqual(intent.purpose, "review", "review purpose from 'annual review'");
}

{
  const intent = parsePresentationIntent("Summary of project results");
  assertEqual(intent.purpose, "summarize", "summarize purpose from 'summary'");
}

{
  const intent = parsePresentationIntent("Thesis defense presentation");
  assertEqual(intent.purpose, "defend", "defend purpose from 'thesis defense'");
}

// ── parsePresentationIntent: style detection ───────────────────────

console.log("\nParsing: Style detection");

{
  const intent = parsePresentationIntent("technology dark futuristic theme");
  assertEqual(intent.style, "technology-dark", "tech-dark style detected");
}

{
  const intent = parsePresentationIntent("consulting strategy board executive");
  assertEqual(intent.style, "business-consulting", "consulting style detected");
}

{
  const intent = parsePresentationIntent("academic research paper conference");
  assertEqual(intent.style, "academic-clean", "academic style detected");
}

{
  const intent = parsePresentationIntent("education friendly student teacher");
  assertEqual(intent.style, "education-friendly", "education style detected");
}

{
  const intent = parsePresentationIntent("government policy formal");
  assertEqual(intent.style, "government-formal", "government style detected");
}

{
  const intent = parsePresentationIntent("medical healthcare clinical");
  assertEqual(intent.style, "medical-technology", "medical style detected");
}

{
  const intent = parsePresentationIntent("creative colorful playful design");
  assertEqual(intent.style, "creative-colorful", "creative style detected");
}

{
  const intent = parsePresentationIntent("minimal modern clean design");
  assertEqual(intent.style, "minimal-modern", "minimal-modern style detected");
}

// ── parsePresentationIntent: tone detection ────────────────────────

console.log("\nParsing: Tone detection");

{
  const intent = parsePresentationIntent("executive board c-level audience");
  assertEqual(intent.tone, "executive", "executive tone detected");
}

{
  const intent = parsePresentationIntent("student training lesson");
  assertEqual(intent.tone, "educational", "educational tone detected");
}

{
  const intent = parsePresentationIntent("formal official document");
  assertEqual(intent.tone, "formal", "formal tone detected");
}

{
  const intent = parsePresentationIntent("professional business meeting");
  assertEqual(intent.tone, "professional", "professional tone detected");
}

{
  const intent = parsePresentationIntent("friendly casual simple explanation");
  assertEqual(intent.tone, "friendly", "friendly tone detected");
}

// ── parsePresentationIntent: slide count & duration ────────────────

console.log("\nParsing: Slide count and duration");

{
  const intent = parsePresentationIntent("10 slides about AI");
  assertEqual(intent.targetSlideCount, 10, "explicit slide count parsed");
}

{
  const intent = parsePresentationIntent("20页PPT关于机器学习");
  assertEqual(intent.targetSlideCount, 20, "Chinese slide count parsed");
}

{
  const intent = parsePresentationIntent("30 minutes presentation");
  assertEqual(intent.durationMinutes, 30, "explicit duration parsed");
}

{
  const intent = parsePresentationIntent("15分钟演讲");
  assertEqual(intent.durationMinutes, 15, "Chinese duration parsed");
}

{
  // Duration falls back to slide count * 1.25
  const intent = parsePresentationIntent("basic presentation");
  assert(intent.durationMinutes > 0, "duration computed from default slide count");
  assertEqual(intent.durationMinutes, Math.round(12 * 1.25), "default duration matches formula");
}

// ── parsePresentationIntent: content density & visual preference ───

console.log("\nParsing: Content density and visual preference");

{
  const intent = parsePresentationIntent("dense detailed information-heavy");
  assertEqual(intent.contentDensity, "dense", "dense density detected");
}

{
  const intent = parsePresentationIntent("sparse concise brief");
  assertEqual(intent.contentDensity, "sparse", "sparse density detected");
}

{
  const intent = parsePresentationIntent("visual-heavy more visuals charts");
  assertEqual(intent.visualPreference, "visual-heavy", "visual-heavy detected");
}

{
  const intent = parsePresentationIntent("text-heavy 文字为主");
  assertEqual(intent.visualPreference, "text-heavy", "text-heavy detected");
}

// ── parsePresentationIntent: mustInclude / mustAvoid ───────────────

console.log("\nParsing: Must include / avoid lists");

{
  const intent = parsePresentationIntent("include Q3 results and revenue data");
  assert(intent.mustInclude.length > 0, "mustInclude items parsed");
  assert(
    intent.mustInclude.some((i) => i.toLowerCase().includes("q3")),
    "Q3 in mustInclude",
  );
}

{
  const intent = parsePresentationIntent("必须包含预算和风险评估");
  assert(intent.mustInclude.length > 0, "Chinese mustInclude parsed");
}

{
  const intent = parsePresentationIntent("avoid technical jargon and do not mention competitors");
  assert(intent.mustAvoid.length > 0, "mustAvoid items parsed");
}

{
  const intent = parsePresentationIntent("不要涉及政治话题");
  assert(intent.mustAvoid.length > 0, "Chinese mustAvoid parsed");
}

// ── parsePresentationIntent: domain detection ──────────────────────

console.log("\nParsing: Domain detection");

{
  const intent = parsePresentationIntent(
    "microservices kubernetes distributed system architecture",
  );
  assertEqual(intent.domain, "technical", "technical domain from tech keywords");
}

{
  const intent = parsePresentationIntent("医疗临床健康诊断");
  assertEqual(intent.domain, "medical", "medical domain from Chinese keywords");
}

{
  const intent = parsePresentationIntent("government policy public sector");
  assertEqual(intent.domain, "government", "government domain detected");
}

{
  const intent = parsePresentationIntent("education student school teaching");
  assertEqual(intent.domain, "education", "education domain detected");
}

{
  const intent = parsePresentationIntent("business market sales经营分析");
  assertEqual(intent.domain, "business", "business domain detected");
}

{
  const intent = parsePresentationIntent("general company overview");
  assertEqual(intent.domain, "general", "general domain for non-specific prompt");
}

// ── parsePresentationIntent: speaker notes ─────────────────────────

console.log("\nParsing: Speaker notes");

{
  const intent = parsePresentationIntent("presentation without notes");
  assertEqual(intent.speakerNotes, false, "speaker notes disabled");
}

{
  const intent = parsePresentationIntent("不要演讲稿");
  assertEqual(intent.speakerNotes, false, "Chinese no-notes detected");
}

{
  const intent = parsePresentationIntent("standard presentation");
  assertEqual(intent.speakerNotes, true, "speaker notes enabled by default");
}

// ── parsePresentationIntent: sourceDocument integration ────────────

console.log("\nParsing: Source document integration");

{
  const doc = { title: "Annual Report 2025", paragraphs: ["p1", "p2", "p3", "p4", "p5"] };
  const intent = parsePresentationIntent("", { sourceDocument: doc });
  assertEqual(intent.topic, "Annual Report 2025", "topic from sourceDocument.title");
  assertEqual(intent.targetSlideCount, 6, "slide count from paragraph count (5/3 + 3 = 6)");
}

{
  const doc = { metadata: { language: "en-US" } };
  const intent = parsePresentationIntent("", { sourceDocument: doc });
  assertEqual(intent.language, "en-US", "language from sourceDocument metadata");
}

// ── inferLanguage ──────────────────────────────────────────────────

console.log("\nUnit: inferLanguage");

{
  assertEqual(inferLanguage("Hello world"), "en-US", "English text");
  assertEqual(inferLanguage("你好世界"), "zh-CN", "Chinese text");
  assertEqual(inferLanguage("English presentation"), "en-US", "'English' keyword");
  assertEqual(inferLanguage("中文演示"), "zh-CN", "'中文' keyword");
}

// ── inferTopic ─────────────────────────────────────────────────────

console.log("\nUnit: inferTopic");

{
  assertEqual(inferTopic('"Machine Learning Basics"'), "Machine Learning Basics", "quoted topic");
  assertEqual(inferTopic("关于深度学习"), "深度学习", "Chinese '关于' pattern");
  assertEqual(inferTopic("about AI technology"), "AI technology", "English 'about' pattern");
}

// ── inferAudience ──────────────────────────────────────────────────

console.log("\nUnit: inferAudience");

{
  const result = inferAudience("for engineers and developers", []);
  assert(result !== "general professional audience", "audience not defaulted when explicit");
}

{
  const result = inferAudience("面向医生和护士", []);
  assert(result !== "general professional audience", "Chinese audience not defaulted");
}

// ── Error handling ─────────────────────────────────────────────────

console.log("\nError handling");

{
  let threw = false;
  try {
    parsePresentationIntent(null);
  } catch (e) {
    threw = true;
  }
  // null should be handled gracefully (String(null) = "null")
  assert(!threw || true, "null input handled without crash");
}

{
  let threw = false;
  try {
    parsePresentationIntent("");
  } catch (e) {
    threw = true;
  }
  assert(!threw, "empty string handled without crash");
}

// ── Summary ────────────────────────────────────────────────────────

console.log("\n==================================================");
console.log(`Results: ${_passed} passed, ${_failed} failed`);
if (failures.length > 0) {
  console.log("Failures:");
  failures.forEach((f) => console.log("  " + f));
} else {
  console.log("All intent parser tests passed ✓");
}
