#!/usr/bin/env node
/**
 * M12.8 Content QA — Automated content quality checks for generated presentations.
 * 
 * Checks:
 * 1. All slides have non-empty titles
 * 2. Source references are complete (no missing sourceRefs on content slides)
 * 3. No duplicate title+body pairs across slides
 * 4. Speaker notes quality (length, content richness)
 * 5. Section divider slides have proper structure
 * 6. Closing slide has contact/summary info
 * 7. Layout diversity (not all slides using same layout)
 */

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

// ─── Helpers ────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const issues = [];

function check(condition, msg, severity = "pass") {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${msg}`);
  } else {
    if (severity === "warn") {
      warnCount++;
      console.log(`  ⚠ ${msg}`);
      issues.push({ severity: "warn", message: msg });
    } else {
      failCount++;
      console.log(`  ✗ ${msg}`);
      issues.push({ severity: "fail", message: msg });
    }
  }
}

function bold(msg) {
  return `\x1b[1m${msg}\x1b[0m`;
}

function red(msg) {
  return `\x1b[31m${msg}\x1b[0m`;
}

function green(msg) {
  return `\x1b[32m${msg}\x1b[0m`;
}

// ─── Content Quality Checks ─────────────────────────────────────────────────

async function checkTitles(slideSpecs) {
  console.log("\nChecking slide titles...");
  for (const spec of slideSpecs) {
    check(
      spec.title && spec.title.trim().length > 0,
      `${spec.id}: title is non-empty ("${spec.title.slice(0, 40)}")`
    );
  }
}

async function checkSourceRefs(slideSpecs) {
  console.log("\nChecking source references...");
  
  // Only content and data-chart slides should have sourceRefs
  const contentRoles = ["content", "data-chart", "architecture", "process"];
  const exemptRoles = ["section-divider", "closing", "title-slide"];
  
  let contentSlides = 0;
  let slidesWithRefs = 0;
  let missingRefs = [];
  
  for (const spec of slideSpecs) {
    const role = spec.role || "";
    
    if (exemptRoles.includes(role)) {
      // Section dividers and closing slides don't need sourceRefs
      continue;
    }
    
    if (contentRoles.includes(role)) {
      contentSlides++;
      if (spec.sourceRefs && spec.sourceRefs.length > 0) {
        slidesWithRefs++;
      } else {
        missingRefs.push(spec.id);
        check(false, `${spec.id} (${role}): missing sourceRefs`, "warn");
      }
    }
  }
  
  if (contentSlides === 0) {
    check(true, "No content slides to check (input may be minimal)");
    return;
  }
  
  const pct = Math.round(slidesWithRefs / contentSlides * 100);
  check(
    pct >= 70,
    `${slidesWithRefs}/${contentSlides} content slides have sourceRefs (${pct}%) — threshold: 70%`
  );
  
  if (missingRefs.length > 0 && pct < 50) {
    check(false, `${missingRefs.length} content slides lack sourceRefs: ${missingRefs.slice(0, 3).join(", ")}${missingRefs.length > 3 ? "..." : ""}`, "fail");
  }
}

async function checkDuplicateTitlesAndBody(slideSpecs) {
  console.log("\nChecking for duplicate title+body pairs...");
  
  const pairs = new Map();
  let duplicates = 0;
  
  for (const spec of slideSpecs) {
    // Normalize: trim, collapse whitespace, lowercase
    const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
    const key = `${normalize(spec.title)}|${normalize(spec.keyMessage || "")}`;
    
    if (pairs.has(key)) {
      duplicates++;
      check(false, `Duplicate pair: "${spec.title}" appears in both ${pairs.get(key)} and ${spec.id}`, "warn");
    } else {
      pairs.set(key, spec.id);
    }
  }
  
  // This is a warning-level check, not a hard failure
  check(
    duplicates <= slideSpecs.length * 0.3,
    `Found ${duplicates} duplicate pairs out of ${pairs.size} unique (${Math.round(duplicates / slideSpecs.length * 100)}%) — within 30% threshold`
  );
}

async function checkSpeakerNotes(slideSpecs) {
  console.log("\nChecking speaker notes quality...");
  
  // Section dividers and closing slides typically don't need speaker notes
  const exemptRoles = ["section-divider", "closing"];
  
  let contentSlidesWithNotes = 0;
  let contentSlidesTotal = 0;
  let emptyNotes = 0;
  
  for (const spec of slideSpecs) {
    if (exemptRoles.includes(spec.role)) continue;
    
    contentSlidesTotal++;
    const notes = spec.speakerNotes || "";
    const trimmed = notes.trim();
    
    if (trimmed.length > 0) {
      contentSlidesWithNotes++;
    } else {
      emptyNotes++;
      check(false, `${spec.id} (${spec.role}): empty speaker notes`, "warn");
    }
  }
  
  if (contentSlidesTotal === 0) {
    check(true, "No content slides to check notes for");
    return;
  }
  
  const pct = Math.round(contentSlidesWithNotes / contentSlidesTotal * 100);
  check(
    contentSlidesWithNotes >= contentSlidesTotal * 0.5,
    `${contentSlidesWithNotes}/${contentSlidesTotal} content slides have speaker notes (${pct}%) — threshold: 50%`
  );
  
  check(
    emptyNotes <= contentSlidesTotal * 0.3,
    `Only ${emptyNotes} content slides have empty speaker notes (max ${Math.round(contentSlidesTotal * 0.3)})`
  );
}

async function checkSectionDividers(slideSpecs) {
  console.log("\nChecking section divider structure...");
  
  // Note: field name is `role` not `slideRole`
  const dividers = slideSpecs.filter((s) => s.role === "section-divider");
  check(dividers.length >= 2, `Found ${dividers.length} section dividers (expected ≥ 2)`);
  
  for (const div of dividers) {
    check(
      div.keyMessage && div.keyMessage.trim().length > 0,
      `${div.id}: section divider has keyMessage ("${div.keyMessage.slice(0, 40)}")`
    );
  }
}

async function checkClosingSlide(slideSpecs) {
  console.log("\nChecking closing slide...");
  
  // Note: field name is `role` not `slideRole`
  const closings = slideSpecs.filter((s) => s.role === "closing");
  check(closings.length === 1, `Found exactly 1 closing slide`);
  
  if (closings.length > 0) {
    const closing = closings[0];
    check(
      closing.title && closing.title.toLowerCase().includes("thank"),
      `Closing slide title: "${closing.title}"`
    );
    check(
      closing.keyMessage && closing.keyMessage.trim().length > 10,
      `Closing slide has meaningful keyMessage (${closing.keyMessage.trim().length} chars)`
    );
  }
}

async function checkLayoutDiversity(layoutPlan) {
  console.log("\nChecking layout diversity...");
  
  const families = layoutPlan.layoutFamiliesUsed;
  check(families.length >= 3, `Using ${families.length} layout families: ${families.join(", ")}`);
  
  const familyCounts = {};
  for (const layout of layoutPlan.layouts) {
    familyCounts[layout.layoutFamily] = (familyCounts[layout.layoutFamily] || 0) + 1;
  }
  
  for (const [family, count] of Object.entries(familyCounts)) {
    check(
      count <= layoutPlan.layouts.length * 0.6,
      `${family}: ${count} slides (${Math.round(count / layoutPlan.layouts.length * 100)}%) — within 60% threshold`
    );
  }
}

async function checkThemeConsistency(layoutPlan) {
  console.log("\nChecking theme consistency...");
  
  const colors = layoutPlan.layouts.map((l) => l.colors);
  const bgColors = new Set(colors.map((c) => c.background));
  const textColors = new Set(colors.map((c) => c.text));
  
  check(bgColors.size === 1, `All slides use consistent background color: ${bgColors.values().next().value}`);
  check(textColors.size === 1, `All slides use consistent text color: ${textColors.values().next().value}`);
  
  // Check fontSize variation matches layout family
  const fontSizes = new Set(layoutPlan.layouts.map((l) => JSON.stringify(l.fontSize)));
  check(fontSizes.size >= 2, `Font sizes vary by layout: ${fontSizes.size} distinct size sets`);
}

async function checkSlideCount(slideSpecs, deckPlan) {
  console.log("\nChecking slide count...");
  
  const expected = deckPlan.slides?.length || 10;
  const actual = slideSpecs.length;
  
  check(
    Math.abs(actual - expected) <= 2,
    `Slide count: ${actual} (planned: ${expected}, within ±2 tolerance)`
  );
  
  check(
    actual >= 5 && actual <= 30,
    `Slide count ${actual} is within reasonable range (5-30)`
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold("M12.8 Content and Visual QA"));
  console.log("============================\n");
  
  // Use sample-markdown.md as the primary test fixture (it's the canonical input)
  const sampleMdPath = path.join(__dirname, "..", "fixtures", "document-ingest", "sample-markdown.md");
  
  let result;
  try {
    if (fs.existsSync(sampleMdPath)) {
      const inputMd = fs.readFileSync(sampleMdPath, "utf8");
      console.log(`Using fixture: fixtures/document-ingest/sample-markdown.md`);
      result = await runPipeline(inputMd, { style: "minimal-modern" });
    } else {
      console.log("  ⚠ No sample-markdown.md found, using minimal content");
      result = await runPipeline("# Test\n\n## Overview\nThis is a test presentation.\n\n## Details\nMore details here.\n\n## Conclusion\nThank you.", { style: "minimal-modern" });
    }
  } catch (e) {
    console.error(red(`Pipeline error: ${e.message}`));
    process.exit(1);
  }
  
  const { slideSpecs, layoutPlan, deckPlan } = result;
  
  // Run all content QA checks
  await checkSlideCount(slideSpecs, deckPlan);
  await checkTitles(slideSpecs);
  await checkSourceRefs(slideSpecs);
  await checkDuplicateTitlesAndBody(slideSpecs);
  await checkSpeakerNotes(slideSpecs);
  await checkSectionDividers(slideSpecs);
  await checkClosingSlide(slideSpecs);
  await checkLayoutDiversity(layoutPlan);
  await checkThemeConsistency(layoutPlan);
  
  // Summary
  console.log("\n==============================");
  console.log(`Results: ${green(`${passCount} passed`)}, ${failCount > 0 ? red(`${failCount} failed`) : "0 failed"}, ${warnCount > 0 ? yellow(`${warnCount} warnings`) : "0 warnings"}`);
  
  if (issues.length > 0) {
    console.log("\nIssues detected:");
    for (const issue of issues) {
      const icon = issue.severity === "fail" ? "✗" : "⚠";
      console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    }
  }
  
  console.log("");
  
  // Exit with appropriate code
  if (failCount > 0) {
    console.log(red("Content QA FAILED"));
    process.exit(1);
  } else {
    console.log(green("Content QA PASSED"));
    process.exit(0);
  }
}

function yellow(msg) {
  return `\x1b[33m${msg}\x1b[0m`;
}

main().catch((e) => {
  console.error(red(`Fatal error: ${e.message}`));
  process.exit(1);
});
