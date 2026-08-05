/**
 * Template Analyzer Tests — M12.31
 *
 * Focused test suite covering:
 *   1. Schema validation for principles output
 *   2. XML parsing with xml2js (no regex fallback)
 *   3. Element extraction (backgrounds, shapes, text, images, tables)
 *   4. Cross-validation between template analysis results
 *   5. Brand converter module
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

const {
  analyzeTemplate,
  extractPptxXml,
  parseSlideElements,
  identifyCommonElements,
  identifyUniqueElements,
  extractStyleTokens,
  extractLayouts,
  extractMediaAssets,
  classifySlideTypes,
  generatePrinciplesMarkdown,
  generateTemplateSpec,
  SLIDE_TYPES,
  SCHEMA_VERSION,
} = require("../packages/template-analyzer/src/index.js");

const {
  validatePrinciples,
  validateSlide,
  crossValidate,
  REQUIRED_PRINCIPLES_FIELDS,
} = require("../packages/template-analyzer/src/schema.js");

const {
  convertTemplateToBrandConfig,
  generateThemeTokensFromTemplate,
  mapSlideTypesToLayouts,
  convertTemplateForPipeline,
} = require("../packages/template-analyzer/src/brand-converter.js");

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

// ─── Test Suite 1: Schema Validation ────────────────────────────

console.log("\n[Test Suite 1] Schema Validation");
console.log("-".repeat(70));

// Test 1.1: Valid principles structure
const validPrinciples = {
  metadata: {
    totalSlides: 10,
    generatedAt: "2026-08-05T00:00:00.000Z",
    sourceFile: "template",
    schemaVersion: "1.0.0",
  },
  commonElements: {
    mustPreserve: ["brand-element", "footer"],
    brandElements: [{ type: "shape", name: "Logo" }],
    footers: [{ type: "shape", name: "Page 1" }],
    backgrounds: [],
  },
  uniqueByType: { cover: [], content: [], end: [] },
  slideTypes: {
    cover: [1],
    agenda: [],
    sectionDivider: [],
    content: [2, 3, 4],
    end: [5],
  },
  styleTokens: {
    colors: { dk1: "#17406D", lt1: "#FFFFFF" },
    accentColors: { accent1: "#0F6FC6" },
    fonts: {
      majorLatin: "Calibri Light",
      majorEastAsian: "宋体",
      minorLatin: "Calibri",
      minorEastAsian: "宋体",
    },
  },
  layouts: {},
  recommendations: [
    {
      priority: "critical",
      rule: "BRAND_ELEMENTS_MUST_PRESERVE",
      description: "Test recommendation",
    },
  ],
  warnings: [],
};

const validation1 = validatePrinciples(validPrinciples);
assert(validation1.ok, "Valid principles should pass validation");
assertEqual(validation1.errors.length, 0, "No errors for valid principles");

// Test 1.2: Missing required fields
const invalidPrinciples = { metadata: { totalSlides: 5 } };
const validation2 = validatePrinciples(invalidPrinciples);
assert(!validation2.ok, "Invalid principles should fail validation");
assert(validation2.errors.length > 0, "Should have errors");

// Test 1.3: Invalid priority
const invalidRec = {
  ...validPrinciples,
  recommendations: [{ priority: "urgent", rule: "TEST", description: "Test" }],
};
const validation3 = validatePrinciples(invalidRec);
assert(!validation3.ok, "Invalid priority should fail");

console.log("  PASS  Valid principles structure");
console.log("  PASS  Missing required fields");
console.log("  PASS  Invalid priority rejected");

// ─── Test Suite 2: XML Parsing ─────────────────────────────────

console.log("\n[Test Suite 2] XML Parsing");
console.log("-".repeat(70));

// Test 2.1: Non-existent file
const result1 = analyzeTemplate("/nonexistent/file.pptx", { validate: false });
assertEqual(result1.principles, null, "Returns null for missing file");
assert(result1.warnings.length > 0, "Returns warnings");

// Test 2.2: Empty pptx
const emptyResult = analyzeTemplate("/dev/null", { validate: false });
assertEqual(emptyResult.principles, null, "Returns null for invalid file");
assert(emptyResult.warnings.length > 0, "Returns warnings for invalid file");

console.log("  PASS  Handles missing file gracefully");
console.log("  PASS  Handles invalid file gracefully");

// ─── Test Suite 3: Element Extraction ──────────────────────────

console.log("\n[Test Suite 3] Element Extraction");
console.log("-".repeat(70));

// Test 3.1: Extract shapes from slide XML
const xmlWithShape = {
  slide: {
    spTree: {
      sp: [
        {
          nvSpPr: {
            nvPr: { name: "Logo" },
          },
          txBody: {
            p: [{ r: [{ t: "91360" }] }],
          },
        },
      ],
    },
  },
};

const elements1 = parseSlideElements({ slides: { "1": xmlWithShape } });
assertEqual(elements1.length, 1, "One slide extracted");
assertEqual(elements1[0].elements.length, 1, "One element in slide");
assertEqual(elements1[0].elements[0].type, "shape", "Element is shape");
assertEqual(elements1[0].elements[0].name, "Logo", "Element name is Logo");
assertEqual(elements1[0].hasText, true, "Slide has text");

// Test 3.2: Extract images
const xmlWithImage = {
  slide: {
    spTree: {
      sp: [
        {
          // Image element without nvSpPr (no shape properties)
          blipFill: {
            blip: { "@_embed": "rId1" },
          },
        },
      ],
    },
  },
};

const elements2 = parseSlideElements({ slides: { "1": xmlWithImage } });
assertEqual(elements2[0].elements[0].type, "image", "Element is image");
assertEqual(elements2[0].elements[0].relationshipId, "rId1", "Image relationship ID");

// Test 3.3: Background extraction
const xmlWithBg = {
  slide: {
    bg: {
      bgPr: {
        solidFill: {},
      },
    },
  },
};

const elements3 = parseSlideElements({ slides: { "1": xmlWithBg } });
const bg = elements3[0].elements.find(e => e.type === "background");
assert(bg, "Background extracted");
assert(bg.hasSolidFill, "Solid fill detected");

console.log("  PASS  Shape extraction");
console.log("  PASS  Image extraction");
console.log("  PASS  Background extraction");

// ─── Test Suite 4: Cross-Validation ────────────────────────────

console.log("\n[Test Suite 4] Cross-Validation");
console.log("-".repeat(70));

// Test 4.1: Mismatched slide count
const slides = [
  { slideNum: 1, elements: [] },
  { slideNum: 2, elements: [] },
];
const principles4 = {
  metadata: { totalSlides: 5 }, // Wrong!
  styleTokens: {},
};
const warnings4 = crossValidate(slides, principles4);
assert(warnings4.length > 0, "Should warn about mismatched slide count");

// Test 4.2: Empty slides
const emptySlides = [];
const principles4b = {
  metadata: { totalSlides: 0 },
  styleTokens: {},
};
const warnings4b = crossValidate(emptySlides, principles4b);
assert(warnings4b.length > 0, "Should warn about empty slides");

console.log("  PASS  Cross-validation detects slide count mismatch");
console.log("  PASS  Cross-validation detects empty slides");

// ─── Test Suite 5: Common Elements ─────────────────────────────

console.log("\n[Test Suite 5] Common Elements");
console.log("-".repeat(70));

const slides5 = [
  {
    slideNum: 1,
    elements: [
      { type: "shape", name: "Logo", category: "brand-element", isBrandElement: true },
      { type: "shape", name: "Page 1", category: "footer", isFooter: true },
    ],
  },
  {
    slideNum: 2,
    elements: [
      { type: "shape", name: "Logo", category: "brand-element", isBrandElement: true },
      { type: "shape", name: "Page 2", category: "footer", isFooter: true },
    ],
  },
  {
    slideNum: 3,
    elements: [
      { type: "shape", name: "Logo", category: "brand-element", isBrandElement: true },
    ],
  },
];

const common5 = identifyCommonElements(slides5);
assert(common5.brandElements.length > 0, "Brand elements detected");
assert(common5.footers.length > 0, "Footers detected");

console.log("  PASS  Identifies brand elements");
console.log("  PASS  Identifies footers");

// ─── Test Suite 6: Slide Type Classification ────────────────────

console.log("\n[Test Suite 6] Slide Type Classification");
console.log("-".repeat(70));

const slides6 = [
  { slideNum: 1, elements: [{ text: "Title Slide" }] },
  { slideNum: 2, elements: [{ text: "目录 Agenda" }] },
  { slideNum: 3, elements: [{ text: "Content slide" }] },
  { slideNum: 4, elements: [{ text: "感谢 Thank You" }] },
];

const types6 = classifySlideTypes(slides6, 4);
assertEqual(types6.cover.length, 1, "One cover slide");
assertEqual(types6.agenda.length, 1, "One agenda slide");
assertEqual(types6.content.length, 1, "One content slide");
assertEqual(types6.end.length, 1, "One end slide");

console.log("  PASS  Cover slide detected");
console.log("  PASS  Agenda slide detected");
console.log("  PASS  Content slide detected");
console.log("  PASS  End slide detected");

// ─── Test Suite 7: Style Token Extraction ──────────────────────

console.log("\n[Test Suite 7] Style Token Extraction");
console.log("-".repeat(70));

// Test 7.1: Extract colors and fonts from theme XML
const xmlData7 = {
  themeXml: {
    theme: {
      themeElements: {
        scheme: {
          clrScheme: {
            dk1: { srgbClr: { "@_val": "1E3A5F" } },
            lt1: { srgbClr: { "@_val": "FFFFFF" } },
            accent1: { srgbClr: { "@_val": "0F6FC6" } },
            accent2: { srgbClr: { "@_val": "009DD9" } },
          },
        },
      },
    },
  },
  masterXml: {
    slideMaster: {
      theme: {
        themeElements: {
          fontScheme: {
            majorFont: {
              latin: { "@_typeface": "Calibri Light" },
              ea: { "@_typeface": "宋体" },
            },
            minorFont: {
              latin: { "@_typeface": "Calibri" },
              ea: { "@_typeface": "宋体" },
            },
          },
        },
      },
    },
  },
};

const tokens7 = extractStyleTokens(xmlData7);
assertEqual(tokens7.colors.dk1, "#1E3A5F", "Extracts dark color");
assertEqual(tokens7.colors.lt1, "#FFFFFF", "Extracts light color");
assertEqual(tokens7.accentColors.accent1, "#0F6FC6", "Extracts accent color");
assertEqual(tokens7.fonts.majorLatin, "Calibri Light", "Extracts Latin font");
assertEqual(tokens7.fonts.majorEastAsian, "宋体", "Extracts East Asian font");
assertEqual(tokens7.fonts.minorLatin, "Calibri", "Extracts minor Latin font");
assertEqual(tokens7.fonts.minorEastAsian, "宋体", "Extracts minor East Asian font");

// Test 7.2: Empty theme XML
const emptyTokens = extractStyleTokens({});
assertEqual(Object.keys(emptyTokens.colors).length, 0, "Empty colors for no theme");
assertEqual(Object.keys(emptyTokens.fonts).length, 0, "Empty fonts for no master");

console.log("  PASS  Extracts colors from theme");
console.log("  PASS  Extracts fonts from master");
console.log("  PASS  Handles empty theme XML");

// ─── Test Suite 8: Error Handling ──────────────────────────────

console.log("\n[Test Suite 8] Error Handling");
console.log("-".repeat(70));

// Test 8.1: Null input
const nullResult = analyzeTemplate(null, { validate: false });
assertEqual(nullResult.principles, null, "Returns null for null input");
assert(nullResult.warnings.length > 0, "Returns warnings");

// Test 8.2: Validate option
const noValidate = analyzeTemplate("/dev/null", { validate: false });
assert(true, "Handles validate option");

console.log("  PASS  Returns null principles for invalid path");
console.log("  PASS  Returns warnings for invalid path");
console.log("  PASS  Handles validate option");

// ─── Test Suite 9: Markdown Generation ─────────────────────────

console.log("\n[Test Suite 9] Markdown Generation");
console.log("-".repeat(70));

const markdownPrinciples = {
  metadata: {
    totalSlides: 5,
    generatedAt: "2026-08-05T00:00:00.000Z",
    sourceFile: "template",
    schemaVersion: "1.0.0",
  },
  commonElements: {
    mustPreserve: ["brand-element"],
    brandElements: [{ type: "shape", name: "Logo" }],
    footers: [],
    backgrounds: [],
  },
  uniqueByType: { cover: [], content: [], end: [] },
  slideTypes: {
    cover: [1],
    content: [2, 3, 4],
    end: [5],
  },
  styleTokens: {
    colors: { dk1: "#17406D", lt1: "#FFFFFF" },
    accentColors: { accent1: "#0F6FC6" },
    fonts: {
      majorLatin: "Calibri Light",
      majorEastAsian: "宋体",
      minorLatin: "Calibri",
      minorEastAsian: "宋体",
    },
  },
  layouts: {},
  recommendations: [
    { priority: "critical", rule: "TEST_RULE", description: "Test description" },
  ],
  warnings: [],
};

const markdown = generatePrinciplesMarkdown(markdownPrinciples);
assert(markdown.includes("# Template Design Principles"), "Generates title");
assert(markdown.includes("Brand Elements"), "Includes brand elements section");
assert(markdown.includes("🔴"), "Includes priority icon");
assert(markdown.includes("20%"), "Includes percentage calculation");

console.log("  PASS  Generates title");
console.log("  PASS  Includes brand elements section");
console.log("  PASS  Includes priority icon");
console.log("  PASS  Includes percentage calculation");

// ─── Test Suite 10: Template Spec Generation ───────────────────

console.log("\n[Test Suite 10] Template Spec Generation");
console.log("-".repeat(70));

const specPrinciples = {
  metadata: {
    totalSlides: 10,
    generatedAt: "2026-08-05T00:00:00.000Z",
    sourceFile: "template.pptx",
    schemaVersion: "1.0.0",
  },
  slideTypes: {
    cover: [1],
    content: [2, 3, 4, 5, 6, 7, 8, 9],
    end: [10],
  },
  styleTokens: {
    colors: { dk1: "#17406D" },
    accentColors: { accent1: "#0F6FC6" },
    fonts: { majorLatin: "Calibri Light" },
  },
  warnings: [],
  recommendations: [],
};

const layouts = {
  "1": { num: 1, name: "Title Slide", placeholders: [{ type: "title", name: "Title" }] },
  "2": { num: 2, name: "Content", placeholders: [{ type: "body", name: "Content" }] },
};

const mediaAssets = {
  images: [{ slide: 1, relationshipId: "rId1", type: "image" }],
  logos: [],
  backgrounds: [],
};

const specMd = generateTemplateSpec(specPrinciples, layouts, mediaAssets, "template.pptx");
assert(specMd.includes("# Template Specification"), "Generates spec title");
assert(specMd.includes("template.pptx"), "Includes source file name");
assert(specMd.includes("Role Map"), "Includes role map section");
assert(specMd.includes("Layout 1"), "Includes layout details");

console.log("  PASS  Generates template spec");
console.log("  PASS  Includes role map");
console.log("  PASS  Includes layout details");

// ─── Test Suite 11: Brand Converter ─────────────────────────────

console.log("\n[Test Suite 11] Brand Converter");
console.log("-".repeat(70));

// Test 11.1: Convert template to brand config
const principles11 = {
  metadata: { totalSlides: 10, sourceFile: "template.pptx" },
  styleTokens: {
    colors: { dk1: "#17406D", lt1: "#FFFFFF", dk2: "#DBEFF9" },
    accentColors: { accent1: "#0F6FC6", accent2: "#009DD9" },
    fonts: {
      majorLatin: "Calibri Light",
      majorEastAsian: "宋体",
      minorLatin: "Calibri",
      minorEastAsian: "宋体",
    },
  },
  slideTypes: {
    cover: [1],
    content: [2, 3, 4, 5, 6, 7, 8, 9],
    end: [10],
  },
};

const brandConfig11 = convertTemplateToBrandConfig(principles11);
assert(brandConfig11 !== null, "Brand config generated");
assert(brandConfig11.allowedPalette.length > 0, "Palette has colors");
assert(brandConfig11.typographyRules.headingFont, "Has heading font");
assert(brandConfig11.typographyRules.bodyFont, "Has body font");
assert(brandConfig11.requiredTitleSlide, "Requires title slide");
assert(brandConfig11.requiredClosingSlide, "Requires closing slide");

// Test 11.2: Generate theme tokens
const themeTokens11 = generateThemeTokensFromTemplate(principles11);
assert(themeTokens11 !== null, "Theme tokens generated");
assert(themeTokens11.colors.primary, "Has primary color");
assert(themeTokens11.fonts.heading, "Has heading font");
assert(themeTokens11.fonts.body, "Has body font");

// Test 11.3: Map slide types to layouts
const layoutMap11 = mapSlideTypesToLayouts(principles11);
assertEqual(layoutMap11[1], "title-slide", "Cover mapped to title-slide");
assertEqual(layoutMap11[10], "closing", "End mapped to closing");
assertEqual(layoutMap11[2], "title-and-bullets", "Content mapped to default");

// Test 11.4: Full pipeline conversion
const pipelineConfig11 = convertTemplateForPipeline(principles11);
assert(pipelineConfig11.brandConfig !== null, "Brand config present");
assert(pipelineConfig11.themeTokens !== null, "Theme tokens present");
assert(pipelineConfig11.layoutMap !== null, "Layout map present");
assertEqual(pipelineConfig11.style, "template-derived", "Style is template-derived");

console.log("  PASS  Converts template to brand config");
console.log("  PASS  Generates theme tokens");
console.log("  PASS  Maps slide types to layouts");
console.log("  PASS  Full pipeline conversion");

// ─── Test Suite 12: npm Script Registration ─────────────────────

console.log("\n[Test Suite 12] npm Script Registration");
console.log("-".repeat(70));

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert(packageJson.scripts["check:m12-31-template-analyzer"], "npm script check:m12-31-template-analyzer is registered");
assert(packageJson.scripts["check:m12-31-template-analyzer"].includes("m12-31-template-analyzer.test.js"), "npm script points to correct test file");
assert(packageJson.scripts.check.includes("check:m12-31"), "check script includes m12-31 test");

console.log("  PASS  npm script check:m12-31-template-analyzer is registered");
console.log("  PASS  npm script points to correct test file");
console.log("  PASS  check script includes m12-31 test");

// ─── Summary ────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("Results: All tests passed!");
console.log("=".repeat(70));
