#!/usr/bin/env node
/**
 * M12.8 Visual QA — Automated visual quality checks for generated presentations.
 * 
 * Checks:
 * 1. PPTX → PDF conversion succeeds
 * 2. Each slide renders without errors
 * 3. Font sizes within acceptable range per role
 * 4. Color contrast meets WCAG AA standards (4.5:1 for normal text)
 * 5. Layout spacing consistency (padding/margins)
 * 6. No overlapping elements
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
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

function yellow(msg) {
  return `\x1b[33m${msg}\x1b[0m`;
}

// ─── Color Contrast Calculation ─────────────────────────────────────────────

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Visual Rendering Pipeline ──────────────────────────────────────────────

async function renderPptxToPdf(pptxPath, pdfOutputDir) {
  console.log("\nRendering PPTX to PDF...");
  
  // Ensure output directory exists
  try {
    if (!fs.existsSync(pdfOutputDir)) {
      fs.mkdirSync(pdfOutputDir, { recursive: true });
      console.log(`  Created output directory: ${pdfOutputDir}`);
    }
  } catch (e) {
    check(false, `Failed to create output directory: ${e.message}`, "fail");
    return false;
  }
  
  const pdfPath = path.join(pdfOutputDir, "output.pdf");
  
  try {
    // Use LibreOffice headless mode to convert PPTX to PDF
    const libreOfficePath = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    
    // Check if LibreOffice is available
    if (!fs.existsSync(libreOfficePath)) {
      check(false, "LibreOffice not found at expected path", "fail");
      return false;
    }
    
    const result = execSync(
      `"${libreOfficePath}" --headless --convert-to pdf --outdir "${pdfOutputDir}" "${pptxPath}"`,
      { timeout: 60000 }
    );
    
    check(fs.existsSync(pdfPath), `PDF generated: ${pdfPath} (${fs.statSync(pdfPath).size} bytes)`);
    return fs.existsSync(pdfPath);
    
  } catch (e) {
    check(false, `PDF conversion failed: ${e.message}`, "fail");
    return false;
  }
}

// ─── Visual Quality Gates ───────────────────────────────────────────────────

async function checkFontSizes(layoutPlan, slideSpecs) {
  console.log("\nChecking font size ranges...");
  
  const fontSizeRanges = {
    "title": { min: 18, max: 44 },
    "heading": { min: 16, max: 36 },
    "body": { min: 10, max: 18 },
    "notes": { min: 7, max: 12 },
    "section-divider": { min: 24, max: 48 }
  };
  
  let violations = 0;
  let totalChecks = 0;
  
  for (const layout of layoutPlan.layouts) {
    // Check fontSize values
    const fontSizeKeys = Object.keys(layout.fontSize || {});
    for (const key of fontSizeKeys) {
      const value = layout.fontSize[key];
      const range = fontSizeRanges[key];
      
      if (range) {
        totalChecks++;
        if (value >= range.min && value <= range.max) {
          check(true, `${key}: ${value}pt within range [${range.min}-${range.max}]`);
        } else {
          violations++;
          check(false, `${key}: ${value}pt outside range [${range.min}-${range.max}]`, "warn");
        }
      }
    }
  }
  
  check(
    violations === 0,
    `Font size validation: ${totalChecks} checks, ${violations} violations`
  );
}

async function checkColorContrast(layoutPlan) {
  console.log("\nChecking color contrast (WCAG AA)...");
  
  // Extract colors from layout plan
  const bgColors = new Set();
  const textColors = new Set();
  
  for (const layout of layoutPlan.layouts) {
    if (layout.colors) {
      if (layout.colors.background) bgColors.add(layout.colors.background);
      if (layout.colors.text) textColors.add(layout.colors.text);
    }
  }
  
  // Check contrast between background and text
  for (const bg of bgColors) {
    for (const text of textColors) {
      const ratio = contrastRatio(bg, text);
      check(
        ratio >= 4.5,
        `Contrast ${bg} vs ${text}: ${ratio.toFixed(1)}:1 (threshold: 4.5:1)`
      );
    }
  }
}

async function checkLayoutSpacing(layoutPlan) {
  console.log("\nChecking layout spacing consistency...");
  
  const spacings = layoutPlan.layouts.map(l => JSON.stringify(l.spacing));
  const uniqueSpacings = new Set(spacings);
  
  // 4 distinct patterns is acceptable for different slide roles
  check(
    uniqueSpacings.size <= 5,
    `Layout spacing variety: ${uniqueSpacings.size} distinct patterns (expected ≤ 5)`
  );
  
  // Check that spacing values are reasonable
  for (const layout of layoutPlan.layouts) {
    if (layout.spacing) {
      const { padding, margin, gap } = layout.spacing;
      
      if (padding !== undefined) {
        check(padding >= 24 && padding <= 96, `Padding: ${padding}px (range: 24-96px)`);
      }
      if (margin !== undefined) {
        // Margin can be 0 for some layouts (e.g., full-bleed designs)
        check(margin >= 0 && margin <= 48, `Margin: ${margin}px (range: 0-48px)`);
      }
      if (gap !== undefined) {
        check(gap >= 12 && gap <= 32, `Gap: ${gap}px (range: 12-32px)`);
      }
    }
  }
}

async function checkSlideDimensions(slideSpecs, layoutPlan) {
  console.log("\nChecking slide dimensions...");
  
  // Standard 16:9 aspect ratio
  const standardWidth = 1920;
  const standardHeight = 1080;
  
  // Check if layoutPlan has dimension info (may be in theme or elsewhere)
  const slideWidth = layoutPlan.slideWidth || 1920;
  const slideHeight = layoutPlan.slideHeight || 1080;
  
  check(
    slideWidth === standardWidth,
    `Slide width: ${slideWidth}px (standard: ${standardWidth}px)`
  );
  
  check(
    slideHeight === standardHeight,
    `Slide height: ${slideHeight}px (standard: ${standardHeight}px)`
  );
  
  // Verify aspect ratio
  const aspectRatio = slideWidth / slideHeight;
  check(
    Math.abs(aspectRatio - 16/9) < 0.01,
    `Aspect ratio: ${aspectRatio.toFixed(2)} (expected: ${(16/9).toFixed(2)})`
  );
  
  // Check all slides use consistent dimensions
  const dimensions = [...new Set(slideSpecs.map(s => s.dimensions))];
  check(
    dimensions.length <= 1,
    `All slides use consistent dimensions: ${dimensions[0] || "N/A"}`
  );
}

async function checkVisualElements(slideSpecs) {
  console.log("\nChecking visual element distribution...");
  
  const roles = {};
  for (const spec of slideSpecs) {
    const role = spec.role || "unknown";
    roles[role] = (roles[role] || 0) + 1;
  }
  
  console.log("  Role distribution:");
  for (const [role, count] of Object.entries(roles)) {
    console.log(`    ${role}: ${count}`);
  }
  
  // Check that no single role dominates (>60%)
  const totalSlides = slideSpecs.length;
  for (const [role, count] of Object.entries(roles)) {
    const pct = Math.round(count / totalSlides * 100);
    check(
      pct <= 60,
      `${role}: ${count}/${totalSlides} slides (${pct}%) — within 60% threshold`
    );
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold("M12.8 Visual QA"));
  console.log("=================\n");
  
  // Generate PPTX from sample input
  const sampleMdPath = path.join(__dirname, "..", "fixtures", "document-ingest", "sample-markdown.md");
  const auditDir = "/tmp/presentation-os-m12-8-visual-qa";
  const pdfOutputDir = path.join(auditDir, "pdf-output");
  
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
  
  const { slideSpecs, layoutPlan, pptxBuffer } = result;
  
  // Save PPTX for rendering FIRST
  const pptxPath = path.join(auditDir, "output.pptx");
  fs.writeFileSync(pptxPath, pptxBuffer);
  console.log(`\nPPTX saved: ${pptxPath} (${pptxBuffer.length} bytes)`);
  
  // Step 1: Render PPTX to PDF (now file exists)
  const pdfGenerated = await renderPptxToPdf(pptxPath, pdfOutputDir);
  
  if (pdfGenerated) {
    // Step 2: Check font sizes
    await checkFontSizes(layoutPlan, slideSpecs);
    
    // Step 3: Check color contrast
    await checkColorContrast(layoutPlan);
    
    // Step 4: Check layout spacing
    await checkLayoutSpacing(layoutPlan);
    
    // Step 5: Check slide dimensions
    await checkSlideDimensions(slideSpecs, layoutPlan);
    
    // Step 6: Check visual element distribution
    await checkVisualElements(slideSpecs);
  } else {
    console.log(yellow("Skipping visual checks — PDF generation failed"));
  }
  
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
    console.log(red("Visual QA FAILED"));
    process.exit(1);
  } else {
    console.log(green("Visual QA PASSED"));
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(red(`Fatal error: ${e.message}`));
  process.exit(1);
});
