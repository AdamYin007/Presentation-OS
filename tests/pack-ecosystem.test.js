#!/usr/bin/env node
/**
 * Pack Ecosystem Validation — M12.12 / M12.20 / M12.25
 *
 * Validates that the presentation system can generate decks across multiple domains:
 *   1. Digital Pathology (medical)
 *   2. Business Consulting (finance)
 *   3. Academic Research (education)
 *   4. Government Policy (public sector)
 *
 * Each domain uses different themes, brand profiles, and adaptation contracts.
 *
 * Usage:
 *   node tests/pack-ecosystem.test.js
 */

"use strict";

const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { loadProfile, resolveBrandConfig } = require("../packages/brand-profiles/src/index.js");

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

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}: expected "${expected}", got "${actual}"`);
  }
}

// ─── Test Suites ──────────────────────────────────────────────

async function testDigitalPathologyPack() {
  console.log("\n[Suite] Digital Pathology Pack (Medical Domain)");

  const mdInput = `# Digital Pathology Overview

## Introduction
Digital pathology is transforming healthcare through AI-powered image analysis.

## Key Technologies
- Whole slide imaging
- Deep learning algorithms
- Cloud-based collaboration

## Clinical Applications
- Cancer diagnosis
- Prognostic biomarkers
- Treatment response prediction

## Future Directions
- Integration with electronic health records
- Multi-modal AI systems
- Regulatory pathways`;

  const result = await runPipeline(mdInput, {
    style: "business-consulting",
    brandConfig: resolveBrandConfig(loadProfile("business-consulting").profile),
    audienceEngine: {
      speaker: "specialist",
      audience: "doctors",
    },
  });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.slideSpecs.length > 0, "Slide specs generated");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Digital Pathology: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testBusinessConsultingPack() {
  console.log("\n[Suite] Business Consulting Pack (Finance Domain)");

  const mdInput = `# Q3 Business Review

## Executive Summary
Strong performance across all business units with 15% revenue growth.

## Financial Highlights
- Revenue: $45M (+15% YoY)
- Operating margin: 22%
- Cash flow: $8.2M

## Market Position
- Market share increased to 18%
- Customer acquisition cost decreased 12%

## Strategic Priorities
- Expand into APAC markets
- Launch new product line
- Optimize operational efficiency`;

  const result = await runPipeline(mdInput, {
    style: "business-consulting",
    brandConfig: resolveBrandConfig(loadProfile("business-consulting").profile),
    audienceEngine: {
      speaker: "executive",
      audience: "board",
    },
  });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.slideSpecs.length > 0, "Slide specs generated");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Business Consulting: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testAcademicResearchPack() {
  console.log("\n[Suite] Academic Research Pack (Education Domain)");

  const mdInput = `# Machine Learning in Healthcare

## Background
Machine learning has shown promise in medical image analysis.

## Methodology
- Dataset: 10,000 histopathology slides
- Models: CNN, Vision Transformer
- Validation: 5-fold cross-validation

## Results
- Accuracy: 94.2%
- Sensitivity: 96.1%
- Specificity: 92.8%

## Discussion
- Comparison with pathologist performance
- Limitations and future work

## Conclusion
ML models show potential for clinical deployment.`;

  const result = await runPipeline(mdInput, {
    style: "academic-clean",
    audienceEngine: {
      speaker: "specialist",
      audience: "researchers",
    },
  });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.slideSpecs.length > 0, "Slide specs generated");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Academic Research: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testGovernmentPolicyPack() {
  console.log("\n[Suite] Government Policy Pack (Public Sector Domain)");

  const mdInput = `# Healthcare Policy Reform

## Background
Current healthcare system faces challenges in access and cost.

## Policy Objectives
- Improve access to care
- Reduce healthcare costs
- Enhance quality of service

## Proposed Measures
- Universal health coverage expansion
- Digital health infrastructure investment
- Workforce training programs

## Implementation Timeline
- Phase 1: 2024-2025
- Phase 2: 2026-2027
- Phase 3: 2028-2030

## Expected Outcomes
- 95% population coverage by 2030
- 20% cost reduction
- Improved patient satisfaction scores`;

  const result = await runPipeline(mdInput, {
    style: "government-formal",
    audienceEngine: {
      speaker: "policy-maker",
      audience: "civil servants",
    },
  });

  assert(result.sourceDocument !== undefined, "Source document generated");
  assert(result.slideSpecs.length > 0, "Slide specs generated");
  assert(Buffer.isBuffer(result.pptxBuffer), "PPTX buffer generated");

  const header = result.pptxBuffer.slice(0, 4).toString("hex");
  assertEqual(header, "504b0304", "PPTX is valid ZIP");

  console.log(`  ✓ Government Policy: ${result.slideCount} slides, ${result.pptxBuffer.length} bytes`);
}

async function testMultiDomainComparison() {
  console.log("\n[Suite] Multi-Domain Comparison");

  const commonInput = `# Technology Innovation

## Overview
Innovation drives competitive advantage.

## Strategy
- R&D investment
- Talent acquisition
- Partnership development

## Metrics
- Patent filings
- Revenue from new products
- Time to market`;

  const medicalResult = await runPipeline(commonInput, {
    style: "business-consulting",
    audienceEngine: { speaker: "specialist", audience: "doctors" },
  });

  const financeResult = await runPipeline(commonInput, {
    style: "business-consulting",
    audienceEngine: { speaker: "executive", audience: "board" },
  });

  const academicResult = await runPipeline(commonInput, {
    style: "academic-clean",
    audienceEngine: { speaker: "specialist", audience: "researchers" },
  });

  const governmentResult = await runPipeline(commonInput, {
    style: "government-formal",
    audienceEngine: { speaker: "policy-maker", audience: "civil servants" },
  });

  assert(medicalResult.slideCount > 0, "Medical domain produces slides");
  assert(financeResult.slideCount > 0, "Finance domain produces slides");
  assert(academicResult.slideCount > 0, "Academic domain produces slides");
  assert(governmentResult.slideCount > 0, "Government domain produces slides");

  // All should produce valid PPTX
  [medicalResult, financeResult, academicResult, governmentResult].forEach((r, i) => {
    const header = r.pptxBuffer.slice(0, 4).toString("hex");
    assertEqual(header, "504b0304", `Domain ${i + 1} produces valid PPTX`);
  });

  console.log(`  ✓ Medical: ${medicalResult.slideCount} slides`);
  console.log(`  ✓ Finance: ${financeResult.slideCount} slides`);
  console.log(`  ✓ Academic: ${academicResult.slideCount} slides`);
  console.log(`  ✓ Government: ${governmentResult.slideCount} slides`);
}

// ─── Run All Tests ────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("Pack Ecosystem Validation — Multi-Domain Testing");
  console.log("=".repeat(65));

  try {
    await testDigitalPathologyPack();
    await testBusinessConsultingPack();
    await testAcademicResearchPack();
    await testGovernmentPolicyPack();
    await testMultiDomainComparison();
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
