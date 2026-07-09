#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const DOC_PATH = path.join(ROOT, "docs", "M12_0_GENERAL_PPT_PRODUCT_SPEC.md");

function fail(message) {
  throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function has(text, needle) {
  return text.includes(needle);
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function hasRegex(text, regex) {
  return regex.test(text);
}

function getChangedFiles() {
  const branchDiffOutput = cp.execFileSync(
    "git",
    ["diff", "--name-only", "origin/develop...HEAD"],
    { cwd: ROOT, encoding: "utf8" }
  );

  const statusOutput = cp.execFileSync(
    "git",
    ["status", "--porcelain"],
    { cwd: ROOT, encoding: "utf8" }
  );

  const changed = new Set();

  branchDiffOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => changed.add(line));

  statusOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const normalized = line.replace(/^[A-Z?]+\s+/, "");
      if (normalized) {
        changed.add(normalized);
      }
    });

  return Array.from(changed);
}

function checkAllowedDiff() {
  const changedFiles = getChangedFiles();
  const allowed = new Set([
    "docs/M12_0_GENERAL_PPT_PRODUCT_SPEC.md",
    "scripts/check-m12-general-ppt-product-spec.cjs",
    "docs/ROADMAP.md",
  ]);

  if (changedFiles.length === 0) {
    fail("No diff found for M12.0 specification work");
  }

  for (const file of changedFiles) {
    if (!allowed.has(file)) {
      fail("Unexpected changed file: " + file);
    }
  }
}

function checkSnapshots() {
  const snapshotRoot = path.join(
    ROOT,
    "test",
    "snapshots",
    "pack-runtime-context-soft-report"
  );

  let snapshotCount = 0;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".report.json")) {
        snapshotCount += 1;
      }
    }
  }

  walk(snapshotRoot);

  if (snapshotCount !== 3) {
    fail("Expected 3 snapshots, found " + snapshotCount);
  }

  if (fs.existsSync(path.join(ROOT, ".validation"))) {
    fail(".validation directory must not exist");
  }
}

function main() {
  if (!fs.existsSync(DOC_PATH)) {
    fail("Specification document missing: " + DOC_PATH);
  }

  const doc = readText(DOC_PATH);

  if (!has(doc, "general-purpose")) {
    fail("Specification must explicitly state general-purpose positioning");
  }

  if (!hasRegex(doc, /medical-only/i)) {
    fail("Specification must explicitly reject medical-only positioning");
  }

  if (!hasRegex(doc, /word-only/i) && !hasRegex(doc, /DOCX-only/i)) {
    fail("Specification must explicitly reject DOCX-only or Word-only positioning");
  }

  if (!has(doc, "Natural-Language Generation from Scratch")) {
    fail("Specification must include natural-language generation");
  }

  if (!has(doc, "Document Ingestion")) {
    fail("Specification must include document ingestion");
  }

  if (!has(doc, "PresentationIntent")) {
    fail("Specification must include PresentationIntent");
  }

  if (!has(doc, "SourceDocumentModel")) {
    fail("Specification must include SourceDocumentModel");
  }

  if (!has(doc, "Story Planner")) {
    fail("Specification must include Story Planner");
  }

  if (!has(doc, "DeckPlan")) {
    fail("Specification must include DeckPlan");
  }

  if (!has(doc, "SlideSpec")) {
    fail("Specification must include SlideSpec");
  }

  if (!has(doc, "Theme System")) {
    fail("Specification must include Theme System");
  }

  if (!has(doc, "Layout System")) {
    fail("Specification must include Layout System");
  }

  if (!has(doc, "editable PPTX")) {
    fail("Specification must include editable PPTX requirements");
  }

  if (!has(doc, "speaker notes")) {
    fail("Specification must include speaker notes");
  }

  if (!has(doc, "QA Pipeline")) {
    fail("Specification must include QA");
  }

  if (!has(doc, "Visual QA")) {
    fail("Specification must include visual QA");
  }

  if (!has(doc, "Natural-Language Revision")) {
    fail("Specification must include revision");
  }

  if (!has(doc, "Privacy")) {
    fail("Specification must include privacy");
  }

  if (!has(doc, "Multi-Domain Acceptance Scenarios")) {
    fail("Specification must include multi-domain scenarios");
  }

  if (countMatches(doc, /^### Scenario /gm) < 8) {
    fail("Specification must define at least 8 acceptance scenarios");
  }

  if (!has(doc, "Primary Acceptance Test")) {
    fail("Specification must include the primary acceptance test");
  }

  if (!has(doc, "M12 Roadmap")) {
    fail("Specification must include the M12 roadmap");
  }

  if (!has(doc, "M12 prioritizes a usable general-purpose presentation product over additional hard-gate expansion.")) {
    fail("Specification must explicitly prioritize the usable M12 product direction");
  }

  checkAllowedDiff();
  checkSnapshots();

  console.log("M12 general PPT product specification check passed");
}

main();
