#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function countSnapshotsRecursive(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countSnapshotsRecursive(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith(".report.json")) {
      count++;
    }
  }
  return count;
}

function check() {
  console.log("Hard gate readiness checkpoint check...");

  const errors = [];

  // Check 1: Checkpoint document exists
  const docPath = path.join(__dirname, "..", "docs", "M11_10_HARD_GATE_READINESS_CHECKPOINT.md");
  if (!fs.existsSync(docPath)) {
    errors.push("Checkpoint document not found: " + docPath);
  } else {
    const content = fs.readFileSync(docPath, "utf8");
    
    // Check 2: Contains "NOT READY"
    if (!content.includes("NOT READY")) {
      errors.push("Document does not contain 'NOT READY'");
    }
    
    // Check 3: Contains "Remain informational"
    if (!content.includes("Remain informational")) {
      errors.push("Document does not contain 'Remain informational'");
    }
    
    // Check 4: States not enabling required check
    if (!content.includes("Not enabled")) {
      errors.push("Document does not state required checks are not enabled");
    }
    
    // Check 5: States not modifying branch protection
    if (!content.includes("No change")) {
      errors.push("Document does not state branch protection no change");
    }
    
    // Check 6: Contains two informational job names
    if (!content.includes("pack-runtime-context-strict-validation-informational")) {
      errors.push("Document does not contain strict informational job name");
    }
    if (!content.includes("pack-runtime-context-snapshot-verification-informational")) {
      errors.push("Document does not contain snapshot informational job name");
    }
    
    // Check 7: Contains observation period requirements
    if (!content.includes("Observation period")) {
      errors.push("Document does not contain observation period");
    }
    
    // Check 8: Contains "10–20 PRs"
    if (!content.includes("10–20 PRs")) {
      errors.push("Document does not contain '10–20 PRs'");
    }
    
    // Check 9: Contains "2 weeks"
    if (!content.includes("2 weeks")) {
      errors.push("Document does not contain '2 weeks'");
    }
    
    // Check 10: Contains "false positive"
    if (!content.includes("false positive")) {
      errors.push("Document does not contain 'false positive'");
    }
    
    // Check 11: Contains "flaky"
    if (!content.includes("flaky")) {
      errors.push("Document does not contain 'flaky'");
    }
    
    // Check 12: Contains "rollback"
    if (!content.includes("rollback")) {
      errors.push("Document does not contain 'rollback'");
    }
    
    // Check 13: Contains "emergency disable"
    if (!content.includes("emergency disable")) {
      errors.push("Document does not contain 'emergency disable'");
    }
    
    // Check 14: Contains "fork PR"
    if (!content.includes("Fork PR")) {
      errors.push("Document does not contain 'Fork PR'");
    }
    
    // Check 15: Contains "draft PR"
    if (!content.includes("draft PR")) {
      errors.push("Document does not contain 'draft PR'");
    }
    
    // Check 16: Contains "merge queue"
    if (!content.includes("merge queue")) {
      errors.push("Document does not contain 'merge queue'");
    }
    
    // Check 17: Contains "owner"
    if (!content.includes("Owner")) {
      errors.push("Document does not contain 'Owner'");
    }
    
    // Check 18: Contains "escalation"
    if (!content.includes("escalation")) {
      errors.push("Document does not contain 'escalation'");
    }
    
    // Check 19: Contains "Promotion Preconditions"
    if (!content.includes("Promotion Preconditions")) {
      errors.push("Document does not contain promotion preconditions matrix");
    }
    
    // Check 20: Contains "Branch Protection Risks"
    if (!content.includes("Branch Protection Risks")) {
      errors.push("Document does not contain branch protection risks");
    }
    
    // Check 21: Contains "Required Check Naming Strategy"
    if (!content.includes("Required Check Naming Strategy")) {
      errors.push("Document does not contain required check naming strategy");
    }
    
    // Check 22: Does NOT claim observation period complete with "Yes" in decision table
    const lines = content.split("\n");
    let observationLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Observation period complete")) {
        observationLineIndex = i;
        break;
      }
    }
    if (observationLineIndex !== -1) {
      if (lines[observationLineIndex].includes("Yes")) {
        errors.push("Document incorrectly claims observation period complete");
      }
    }
    
    // Check 23: Does NOT claim hard gate enabled with "Yes" in decision table
    let hardGateLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Ready for hard gate now")) {
        hardGateLineIndex = i;
        break;
      }
    }
    if (hardGateLineIndex !== -1) {
      if (lines[hardGateLineIndex].includes("Yes")) {
        errors.push("Document incorrectly claims hard gate enabled");
      }
    }
  }

  // Check 24-27: Snapshot count = 3, no .validation dir
  const snapshotDir = path.join(__dirname, "..", "test", "snapshots", "pack-runtime-context-soft-report");
  const snapshotCount = countSnapshotsRecursive(snapshotDir);
  if (snapshotCount !== 3) {
    errors.push(`Expected 3 snapshots, found ${snapshotCount}`);
  }

  const validationDir = path.join(__dirname, "..", ".validation");
  if (fs.existsSync(validationDir)) {
    errors.push(".validation directory exists");
  }

  if (errors.length === 0) {
    console.log("Hard gate readiness checkpoint check passed");
    process.exit(0);
  } else {
    console.error("Hard gate readiness checkpoint check failed:");
    for (const err of errors) {
      console.error("- " + err);
    }
    process.exit(1);
  }
}

check();
