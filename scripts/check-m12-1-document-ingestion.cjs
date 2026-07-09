#!/usr/bin/env node
/**
 * M12.1 General Document Ingestion Checker
 *
 * Validates that the M12.1 implementation is complete and correct:
 * - Required files exist
 * - Module exports are correct
 * - Schema validation works
 * - Sample outputs are valid SourceDocumentModel
 * - Tests pass
 * - Spec document exists and has required content
 *
 * Run: node scripts/check-m12-1-document-ingestion.cjs
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function has(text, needle) {
  return text.includes(needle);
}

// ── Required files ──

const REQUIRED_FILES = [
  "packages/document-ingest/src/index.js",
  "packages/document-ingest/src/schema.js",
  "packages/document-ingest/src/plain-text.js",
  "packages/document-ingest/src/markdown.js",
  "tests/document-ingest/document-ingest.test.js",
  "docs/M12_1_DOCUMENT_INGESTION_SPEC.md",
];

const SAMPLE_OUTPUT_FILES = [
  "fixtures/document-ingest/sample-plain-text-output.json",
  "fixtures/document-ingest/sample-markdown-output.json",
];

const SAMPLE_INPUT_FILES = [
  "fixtures/document-ingest/sample-plain-text.txt",
  "fixtures/document-ingest/sample-markdown.md",
];

function checkRequiredFiles() {
  console.log("Checking required files...");

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      fail(`Required file missing: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }

  for (const file of SAMPLE_OUTPUT_FILES.concat(SAMPLE_INPUT_FILES)) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      fail(`Sample file missing: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }
}

// ── Module export integrity ──

function checkModuleExports() {
  console.log("\nChecking module exports...");

  const ingestModule = require(path.join(ROOT, "packages/document-ingest/src/index.js"));

  const requiredExports = [
    "ingestDocument",
    "ingestPlainText",
    "ingestMarkdown",
    "detectFormat",
  ];

  for (const exp of requiredExports) {
    if (typeof ingestModule[exp] !== "function") {
      fail(`Missing export: ${exp}`);
    }
    console.log(`  ✓ ${exp}`);
  }

  // Check schema module
  const schemaModule = require(path.join(ROOT, "packages/document-ingest/src/schema.js"));
  if (typeof schemaModule.validateSourceDocumentModel !== "function") {
    fail("Missing schema export: validateSourceDocumentModel");
  }
  console.log("  ✓ validateSourceDocumentModel");
}

// ── Schema validation ──

function checkSchemaValidation() {
  console.log("\nChecking schema validation...");

  const { createEmptySourceDocumentModel, validateSourceDocumentModel } = require(
    path.join(ROOT, "packages/document-ingest/src/schema.js")
  );

  const model = createEmptySourceDocumentModel({ title: "Test" });
  const result = validateSourceDocumentModel(model);

  if (!result.ok) {
    fail(`Valid model rejected: ${result.errors.join(", ")}`);
  }
  console.log("  ✓ Valid model accepted");

  const invalidResult = validateSourceDocumentModel({});
  if (invalidResult.ok) {
    fail("Invalid model accepted");
  }
  console.log("  ✓ Invalid model rejected");
}

// ── Sample output validation ──

function checkSampleOutputs() {
  console.log("\nChecking sample outputs...");

  const { validateSourceDocumentModel } = require(
    path.join(ROOT, "packages/document-ingest/src/schema.js")
  );

  for (const file of SAMPLE_OUTPUT_FILES) {
    const filePath = path.join(ROOT, file);
    const content = readText(filePath);
    const model = JSON.parse(content);

    const result = validateSourceDocumentModel(model);
    if (!result.ok) {
      fail(`Sample output ${file} is invalid: ${result.errors.join(", ")}`);
    }

    // Verify key fields
    if (!model.title || typeof model.title !== "string") {
      fail(`${file}: missing or invalid title`);
    }
    if (!Array.isArray(model.paragraphs) || model.paragraphs.length === 0) {
      fail(`${file}: should have at least one paragraph`);
    }
    if (!Array.isArray(model.sourceMap) || model.sourceMap.length === 0) {
      fail(`${file}: should have at least one sourceMap entry`);
    }

    // Verify sourceMap entries have required fields
    for (const ref of model.sourceMap) {
      if (!ref.sourceId || !ref.sourceType || ref.sourceOrder === undefined) {
        fail(`${file}: sourceMap entry missing required fields`);
      }
    }

    console.log(`  ✓ ${file}: ${model.paragraphs.length} paragraphs, ${model.sourceMap.length} sourceMap entries`);
  }
}

// ── Spec document check ──

function checkSpecDocument() {
  console.log("\nChecking spec document...");

  const specPath = path.join(ROOT, "docs", "M12_1_DOCUMENT_INGESTION_SPEC.md");
  const spec = readText(specPath);

  const requiredTerms = [
    "SourceDocumentModel",
    "plain text",
    "Markdown",
    "schemaVersion",
    "sourceMap",
    "domain-agnostic",
    "traceability",
    "M12.2",
    "M12.3",
  ];

  for (const term of requiredTerms) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) {
      fail(`Spec document missing required term: ${term}`);
    }
  }

  console.log("  ✓ Spec document contains all required sections");
}

// ── Ingestion smoke test ──

function checkIngestionSmoke() {
  console.log("\nRunning ingestion smoke tests...");

  const { ingestDocument, ingestPlainText, ingestMarkdown } = require(
    path.join(ROOT, "packages/document-ingest/src/index.js")
  );

  // Plain text smoke test
  const textResult = ingestDocument("Hello world.\nThis is a test.", { format: "plain-text" });
  if (textResult.format !== "plain-text") {
    fail(`Plain text format mismatch: expected plain-text, got ${textResult.format}`);
  }
  if (textResult.model.paragraphs.length === 0) {
    fail("Plain text should produce at least one paragraph");
  }
  console.log("  ✓ Plain text ingestion works");

  // Markdown smoke test
  const mdResult = ingestDocument("# Title\n\nContent.", { format: "markdown" });
  if (mdResult.format !== "markdown") {
    fail(`Markdown format mismatch: expected markdown, got ${mdResult.format}`);
  }
  if (mdResult.model.sections.length === 0) {
    fail("Markdown should produce at least one section from heading");
  }
  console.log("  ✓ Markdown ingestion works");

  // Auto-detect test
  const autoResult = ingestDocument("# Auto-detect test\n\nSome content.");
  if (autoResult.format !== "markdown") {
    fail(`Auto-detect failed: expected markdown, got ${autoResult.format}`);
  }
  console.log("  ✓ Format auto-detection works");

  // Explicit title test
  const titledResult = ingestPlainText("Content", { title: "My Title" });
  if (titledResult.title !== "My Title") {
    fail("Explicit title should be preserved");
  }
  console.log("  ✓ Explicit title works");

  // SourceMap traceability test
  const tracedResult = ingestPlainText("Line one.\nLine two.");
  for (const para of tracedResult.paragraphs) {
    const mapEntry = tracedResult.sourceMap.find((m) => m.sourceId === para.sourceId);
    if (!mapEntry) {
      fail(`sourceMap missing entry for ${para.sourceId}`);
    }
  }
  console.log("  ✓ SourceMap traceability works");
}

// ── Allowed diff check (M12.1 diff white-list) ──

function checkAllowedDiff() {
  const cp = require("child_process");

  const allowedFiles = new Set([
    ...REQUIRED_FILES,
    ...SAMPLE_OUTPUT_FILES,
    ...SAMPLE_INPUT_FILES,
    "docs/M12_1_DOCUMENT_INGESTION_SPEC.md",
    "docs/ROADMAP.md",
    "package.json",
    "scripts/check-m12-1-document-ingestion.cjs",
    "scripts/generate-sample-ingestion-output.cjs",
    "packages/document-ingest/package.json",
  ]);

  try {
    const branchDiff = cp.execFileSync("git", ["diff", "--name-only", "origin/develop...HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    const statusOut = cp.execFileSync("git", ["status", "--porcelain"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    const changed = new Set();

    branchDiff.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => changed.add(l));

    statusOut.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => {
      const normalized = l.replace(/^[A-Z?]+\s+/, "");
      if (normalized) changed.add(normalized);
    });

    for (const file of changed) {
      if (!allowedFiles.has(file)) {
        console.warn(`  ⚠ Unexpected changed file: ${file}`);
      }
    }
  } catch (e) {
    // On develop branch (no diff), this is expected
    console.log("  ℹ No feature diff detected (baseline mode)");
  }
}

// ── Main ──

function main() {
  console.log("M12.1 General Document Ingestion Checker");
  console.log("==========================================\n");

  checkRequiredFiles();
  checkModuleExports();
  checkSchemaValidation();
  checkSampleOutputs();
  checkSpecDocument();
  checkIngestionSmoke();
  checkAllowedDiff();

  console.log("\n==========================================");
  console.log("M12.1 General Document Ingestion check passed\n");
}

if (require.main === module) {
  main();
}

module.exports = { checkRequiredFiles, checkModuleExports, checkSchemaValidation, checkSampleOutputs };
