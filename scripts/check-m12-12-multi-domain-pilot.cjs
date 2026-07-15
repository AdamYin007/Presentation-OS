#!/usr/bin/env node
/**
 * M12.12 Multi-Domain Real-Document Pilot Validator
 *
 * Validates the CLI + pipeline against real-world documents from
 * at least 3 different domains (business, education, technical)
 * with varying complexity levels.
 *
 * Usage:
 *   node scripts/check-m12-12-multi-domain-pilot.cjs
 */
"use strict";

const fs = require("fs");
const path = require("path");

// ── Domain definitions ─────────────────────────────────────────

const DOMAINS = [
  {
    name: "Business",
    input: "fixtures/m12-12/business-real/q2-business-review.md",
    expectedSlidesMin: 8,
    expectedSlidesMax: 14,
    style: "business-consulting",
    complexity: "medium",
    description: "Quarterly business review with financial metrics, customer data, and strategic initiatives",
  },
  {
    name: "Education",
    input: "fixtures/m12-12/education-real/intro-to-ml.md",
    expectedSlidesMin: 10,
    expectedSlidesMax: 16,
    style: "academic-clean",
    complexity: "high",
    description: "Comprehensive machine learning introduction covering supervised, unsupervised, and reinforcement learning",
  },
  {
    name: "Technical",
    input: "fixtures/m12-12/technical-real/kubernetes-architecture.md",
    expectedSlidesMin: 8,
    expectedSlidesMax: 14,
    style: "minimal-modern",
    complexity: "high",
    description: "Production Kubernetes cluster architecture with service mesh, monitoring, CI/CD, and security sections",
  },
];

// ── Helpers ────────────────────────────────────────────────────

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  return true;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  return false;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("M12.12 Multi-Domain Real-Document Pilot Validator");
  console.log("=" .repeat(50));
  console.log("");

  const results = [];
  let allPassed = true;

  for (const domain of DOMAINS) {
    console.log(`Domain: ${domain.name} (${domain.complexity} complexity)`);
    console.log(`  Input: ${domain.input}`);
    console.log(`  Description: ${domain.description}`);
    console.log("");

    const domainResult = { domain: domain.name, passed: true, issues: [] };

    // 1. Check input file exists
    const inputPath = path.resolve(domain.input);
    if (!fs.existsSync(inputPath)) {
      fail(`Input file not found: ${inputPath}`);
      domainResult.passed = false;
      domainResult.issues.push(`Missing input file: ${inputPath}`);
      allPassed = false;
      console.log(`  FAILED: ${domain.name} domain skipped.\n`);
      results.push(domainResult);
      continue;
    }
    pass("Input file exists");

    // 2. Read input
    let markdownInput;
    try {
      markdownInput = fs.readFileSync(inputPath, "utf8");
    } catch (e) {
      fail(`Cannot read input file: ${e.message}`);
      domainResult.passed = false;
      domainResult.issues.push(`Read error: ${e.message}`);
      allPassed = false;
      results.push(domainResult);
      continue;
    }
    pass(`Input size: ${markdownInput.length} bytes, ${markdownInput.split(/\r?\n/).length} lines`);

    // 3. Run pipeline via make-pptx.js --dry-run --json
    const { execSync } = require("child_process");
    let dryRunOutput;
    try {
      const cmd = `node scripts/make-pptx.js "${inputPath}" --dry-run --json --style ${domain.style}`;
      dryRunOutput = execSync(cmd, { encoding: "utf8", timeout: 30000 });
    } catch (e) {
      const stderr = e.stderr ? String(e.stderr) : "";
      fail(`Pipeline execution failed: ${stderr.substring(0, 200)}`);
      domainResult.passed = false;
      domainResult.issues.push(`Pipeline error: ${stderr.substring(0, 200)}`);
      allPassed = false;
      results.push(domainResult);
      continue;
    }

    let summary;
    try {
      summary = JSON.parse(dryRunOutput);
    } catch (e) {
      fail(`Invalid JSON from dry-run: ${e.message}`);
      domainResult.passed = false;
      domainResult.issues.push("Invalid JSON output");
      allPassed = false;
      results.push(domainResult);
      continue;
    }
    pass("Pipeline executed successfully");

    // 4. Validate slide count
    const slideCount = summary.slideCount || (summary.slideSpecs ? summary.slideSpecs.length : 0);
    if (slideCount >= domain.expectedSlidesMin && slideCount <= domain.expectedSlidesMax) {
      pass(`Slide count: ${slideCount} (within ${domain.expectedSlidesMin}-${domain.expectedSlidesMax} range)`);
    } else {
      fail(`Slide count: ${slideCount} (outside expected range ${domain.expectedSlidesMin}-${domain.expectedSlidesMax})`);
      domainResult.issues.push(`Slide count ${slideCount} outside range ${domain.expectedSlidesMin}-${domain.expectedSlidesMax}`);
      allPassed = false;
    }

    // 5. Validate topic extraction
    if (summary.topic && summary.topic.length > 5) {
      pass(`Topic extracted: "${summary.topic.substring(0, 50)}..."`);
    } else {
      fail(`Topic extraction weak: "${summary.topic || '(empty)'}"`);
      domainResult.issues.push("Weak topic extraction");
    }

    // 6. Validate purpose extraction
    if (summary.purpose) {
      pass(`Purpose detected: "${summary.purpose}"`);
    } else {
      fail(`Purpose not detected`);
      domainResult.issues.push("Purpose not detected");
    }

    // 7. Validate slide roles diversity
    if (summary.slideSpecs && summary.slideSpecs.length > 0) {
      const roles = new Set(summary.slideSpecs.map((s) => s.role));
      if (roles.size >= 3) {
        pass(`Slide role diversity: ${roles.size} types (${[...roles].join(", ")})`);
      } else {
        fail(`Low role diversity: only ${roles.size} types`);
        domainResult.issues.push(`Low role diversity: ${roles.size} types`);
      }

      // Check for closing slide
      const hasClosing = summary.slideSpecs.some((s) => s.role === "closing");
      if (hasClosing) {
        pass("Has closing slide");
      } else {
        fail("Missing closing slide");
        domainResult.issues.push("No closing slide");
      }

      // Check for section dividers
      const dividerCount = summary.slideSpecs.filter((s) => s.role === "section-divider").length;
      if (dividerCount >= 2) {
        pass(`Section dividers: ${dividerCount}`);
      } else {
        fail(`Few section dividers: ${dividerCount} (expected ≥ 2)`);
        domainResult.issues.push(`Low divider count: ${dividerCount}`);
      }
    }

    // 8. Generate actual PPTX
    const outputPath = path.resolve(`examples/m12-12-${domain.name.toLowerCase()}.pptx`);
    try {
      const genCmd = `node scripts/make-pptx.js "${inputPath}" "${outputPath}" --style ${domain.style}`;
      execSync(genCmd, { encoding: "utf8", timeout: 30000 });
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        pass(`PPTX generated: ${outputPath} (${stats.size} bytes)`);
      } else {
        fail(`PPTX file not found after generation`);
        domainResult.issues.push("PPTX file missing after generation");
        allPassed = false;
      }
    } catch (e) {
      fail(`PPTX generation failed: ${e.message.substring(0, 200)}`);
      domainResult.issues.push(`Generation error: ${e.message.substring(0, 200)}`);
      allPassed = false;
    }

    console.log("");
    results.push(domainResult);
    if (!domainResult.passed) {
      allPassed = false;
    }
  }

  // ── Summary ──────────────────────────────────────────────────

  console.log("=" .repeat(50));
  console.log("M12.12 Multi-Domain Pilot Summary");
  console.log("=" .repeat(50));
  console.log("");

  for (const r of results) {
    const status = r.passed ? "✓ PASSED" : "✗ FAILED";
    console.log(`  ${r.domain}: ${status}`);
    if (r.issues.length > 0) {
      for (const issue of r.issues) {
        console.log(`    - ${issue}`);
      }
    }
  }

  console.log("");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Overall: ${passedCount}/${totalCount} domains passed`);

  if (allPassed) {
    console.log("\n✓ M12.12 Multi-Domain Real-Document Pilot CHECK PASSED!");
  } else {
    console.log("\n✗ M12.12 Multi-Domain Real-Document Pilot CHECK FAILED.");
    process.exit(1);
  }
}

main();
