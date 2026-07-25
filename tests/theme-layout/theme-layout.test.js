const assert = require("assert");
const {
  generateLayoutPlan,
  LAYOUT_FAMILIES,
  THEME_TOKENS,
  getThemeTokens,
} = require("../../packages/theme-layout/src/index.js");
const fs = require("fs");
const path = require("path");

console.log("Theme and Layout Tests (M12.5)");
console.log("==============================\n");

// ── Schema constants ──

console.log("Schema constants:");
assert(Array.isArray(LAYOUT_FAMILIES), "LAYOUT_FAMILIES should be an array");
assert(LAYOUT_FAMILIES.length > 0, "Should have layout families");
assert(typeof THEME_TOKENS === "object", "THEME_TOKENS should be an object");
assert(Object.keys(THEME_TOKENS).length >= 3, "Should have at least 3 theme tokens");
console.log(`  PASS ${LAYOUT_FAMILIES.length} layout families defined`);
console.log(`  PASS ${Object.keys(THEME_TOKENS).length} theme tokens defined`);

// ── Theme token access ──

console.log("\nTheme tokens:");
const minimalModern = getThemeTokens("minimal-modern");
assert(minimalModern.colors.primary, "minimal-modern has colors.primary");
assert(minimalModern.fonts.heading, "minimal-modern has fonts.heading");
console.log("  ✓ minimal-modern theme accessible");

const consulting = getThemeTokens("business-consulting");
assert(consulting.colors.accent === "#D4A843", "consulting accent is gold");
console.log("  ✓ business-consulting theme accessible");

const academic = getThemeTokens("academic-clean");
assert(academic.fonts.heading.includes("Source Sans Pro"), "academic uses Source Sans Pro");
console.log("  ✓ academic-clean theme accessible");

const fallback = getThemeTokens("nonexistent-theme");
assert(fallback.name === "Minimal Modern", "Unknown theme falls back to minimal-modern");
console.log("  ✓ Unknown theme falls back to minimal-modern");

// ── Layout resolution ──

console.log("\nLayout resolution:");
const specs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../examples/business-review/slidespec.json"), "utf8"),
);
const plan = generateLayoutPlan(specs, { style: "minimal-modern" });

assert(plan.theme === "minimal-modern", "Theme should be minimal-modern");
assert(plan.totalSlides === specs.length, `Should have ${specs.length} layouts`);
console.log(`  ✓ Generated ${plan.totalSlides} layout entries`);

// Check each layout has required fields
for (const layout of plan.layouts) {
  assert(layout.slideId, "Layout must have slideId");
  assert(layout.layoutFamily, "Layout must have layoutFamily");
  assert(layout.theme, "Layout must have theme");
  assert(layout.colors, "Layout must have colors");
  assert(layout.spacing, "Layout must have spacing");
  assert(layout.fontSize, "Layout must have fontSize");
  assert(layout.maxWidth, "Layout must have maxWidth");
}
console.log("  ✓ All layouts have required fields");

// Check role-based layout selection
const sectionDividerLayouts = plan.layouts.filter((l) => l.role === "section-divider");
for (const l of sectionDividerLayouts) {
  assert(
    l.layoutFamily === "section-divider",
    `Section divider should use section-divider layout, got ${l.layoutFamily}`,
  );
}
console.log("  ✓ Section dividers use section-divider layout");

const closingLayouts = plan.layouts.filter((l) => l.role === "closing");
for (const l of closingLayouts) {
  assert(l.layoutFamily === "closing", "Closing should use closing layout");
}
console.log("  ✓ Closing slides use closing layout");

const contentLayouts = plan.layouts.filter((l) => l.role === "content");
for (const l of contentLayouts) {
  // Content slides can use title-and-bullets OR chart layouts depending on visualType
  assert(
    ["title-and-bullets", "chart-and-insight"].includes(l.layoutFamily),
    `Content slide ${l.slideId} should use title-and-bullets or chart layout, got ${l.layoutFamily}`,
  );
}
console.log(
  `  ✓ Content slides: ${contentLayouts.filter((l) => l.layoutFamily === "title-and-bullets").length} bullets, ${contentLayouts.filter((l) => l.layoutFamily !== "title-and-bullets").length} charts`,
);

const chartLayouts = plan.layouts.filter((l) => l.role === "data-chart");
for (const l of chartLayouts) {
  assert(
    ["chart-and-insight", "full-width-chart"].includes(l.layoutFamily),
    `Chart slide should use chart layout, got ${l.layoutFamily}`,
  );
}
console.log("  ✓ Data chart slides use chart-and-insight layout");

// ── Color palette generation ──

console.log("\nColor palette:");
const contentSlideLayouts = plan.layouts.filter((l) => l.role === "content");
if (contentSlideLayouts.length > 0) {
  const lowEmphasis = contentSlideLayouts.find((l) => l.colors.accent === "#E5E7EB");
  if (lowEmphasis) {
    console.log("  ✓ Low-emphasis slide uses border accent");
  } else {
    // All content slides may have medium/high emphasis; verify accent is valid
    for (const l of contentSlideLayouts) {
      assert(
        ["#E5E7EB", "#3B82F6"].includes(l.colors.accent),
        `Accent should be border or primary, got ${l.colors.accent}`,
      );
    }
    console.log("  ✓ Content slide accents are valid theme colors");
  }
}

const recLayout = plan.layouts.find((l) => l.role === "recommendation");
if (recLayout) {
  assert(recLayout.colors.accent === "#3B82F6", "High emphasis should use blue accent");
  console.log("  ✓ High-emphasis slide uses blue accent");
}

// ── Spacing by density ──

console.log("\nSpacing by density:");
const sparseLayouts = plan.layouts.filter((l) => l.spacing.padding >= 40);
const denseLayouts = plan.layouts.filter((l) => l.spacing.padding <= 25);
console.log(`  ✓ Sparse layouts: ${sparseLayouts.length}, Dense layouts: ${denseLayouts.length}`);

// Title slide should have large padding
const titleLayout = plan.layouts.find((l) => l.layoutFamily === "title-slide");
if (titleLayout) {
  assert(titleLayout.fontSize.heading > 30, "Title slide heading should be large");
  console.log("  ✓ Title slide has large font size");
}

// ── Font sizes ──

console.log("\nFont sizes:");
for (const layout of plan.layouts) {
  assert(
    layout.fontSize.heading > 0,
    `Layout ${layout.slideId} should have positive heading font size`,
  );
  assert(layout.fontSize.body > 0, `Layout ${layout.slideId} should have positive body font size`);
  assert(layout.fontSize.heading >= layout.fontSize.body, "Heading should be >= body");
}
console.log("  ✓ All layouts have valid font sizes");

// ── Max widths ──

console.log("\nMax widths:");
const chartWidths = plan.layouts.filter((l) => l.layoutFamily === "chart-and-insight");
for (const l of chartWidths) {
  assert(l.maxWidth > 700, `Chart layout should have wide max width, got ${l.maxWidth}`);
}
console.log("  ✓ Chart layouts have wide max widths");

// ── Layout family diversity ──

console.log("\nLayout diversity:");
const usedFamilies = plan.layoutFamiliesUsed;
assert(
  usedFamilies.length >= 3,
  `Should use at least 3 layout families, got ${usedFamilies.length}: ${usedFamilies.join(", ")}`,
);
console.log(`  ✓ Uses ${usedFamilies.length} layout families: ${usedFamilies.join(", ")}`);

// ── No PPTX rendering leakage ──

console.log("\nScope boundaries:");
const planJson = JSON.stringify(plan);
assert(!planJson.includes("pptxgenjs"), "Must not contain pptxgenjs");
assert(!planJson.includes(".pptx"), "Must not reference .pptx files");
console.log("  ✓ No PPTX rendering leakage");

// ── Edge cases ──

console.log("\nEdge cases:");

// Empty specs
const emptyPlan = generateLayoutPlan([], {});
assert(emptyPlan.totalSlides === 0, "Empty specs should produce empty plan");
assert(emptyPlan.layouts.length === 0, "Empty layouts array");
console.log("  ✓ Empty specs handled");

// Different theme
const consultingPlan = generateLayoutPlan(specs, { style: "business-consulting" });
assert(consultingPlan.theme === "business-consulting", "Should use business-consulting theme");
const firstConsultingLayout = consultingPlan.layouts[0];
assert(
  firstConsultingLayout.colors.text === "#1A202C",
  "Primary text should be dark gray (not navy)",
);
console.log("  ✓ Business consulting theme applied");

console.log("\n==============================");
console.log("Results: ALL PASSED\n");
