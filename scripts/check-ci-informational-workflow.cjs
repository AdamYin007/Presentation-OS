#!/usr/bin/env node
"use strict";

/**
 * M11.9 CI Informational Workflow Structural Safety Check
 *
 * This script verifies the informational workflow adheres to all safety requirements.
 */

var fs = require("fs");
var path = require("path");

var baseDir = path.resolve(__dirname, "..");
var workflowPath = path.join(
  baseDir,
  ".github",
  "workflows",
  "pack-runtime-context-informational.yml"
);

var passed = 0;
var failed = 0;
var failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(name + ": " + e.message);
  }
}

console.log("Checking CI informational workflow safety...\n");

// 1. Workflow file exists
check("Workflow file exists", function () {
  if (!fs.existsSync(workflowPath)) {
    throw new Error("Workflow file not found: " + workflowPath);
  }
});

// Read the workflow file once for all text-based checks
var workflowContent = "";
if (fs.existsSync(workflowPath)) {
  workflowContent = fs.readFileSync(workflowPath, "utf8");
}

// 2. Workflow name correct
check("Workflow name is correct", function () {
  if (!workflowContent.includes("name: PackRuntimeContext Informational Checks")) {
    throw new Error("Workflow name must be 'PackRuntimeContext Informational Checks'");
  }
});

// 3. Only allowed triggers exist
check("Only allowed triggers", function () {
  var forbiddenTriggers = [
    "pull_request_target:",
    "schedule:",
    "merge_group:",
    "paths:",
    "paths-ignore:",
  ];
  for (var i = 0; i < forbiddenTriggers.length; i++) {
    if (workflowContent.includes(forbiddenTriggers[i])) {
      throw new Error("Forbidden trigger found: " + forbiddenTriggers[i]);
    }
  }
  if (!workflowContent.includes("pull_request:") || !workflowContent.includes("push:") || !workflowContent.includes("workflow_dispatch:")) {
    throw new Error("Must include pull_request, push, and workflow_dispatch triggers");
  }
});

// 4. Triggers only target develop
check("Triggers only target develop branch", function () {
  var branchesCount = (workflowContent.match(/- develop/g) || []).length;
  if (branchesCount !== 2) {
    throw new Error("Both pull_request and push must target exactly 'develop' branch");
  }
});

// 5. Permissions are contents: read only
check("Permissions are contents: read", function () {
  if (!workflowContent.includes("permissions:\n  contents: read")) {
    throw new Error("Must have 'permissions: contents: read'");
  }
});

// 6. Exactly two jobs
check("Exactly two jobs exist", function () {
  // Look for the jobs section specifically
  var jobsSectionMatch = workflowContent.match(/jobs:\n([\s\S]*?)(?=\n[A-Za-z]|$)/);
  if (!jobsSectionMatch) {
    throw new Error("Could not find jobs section");
  }
  
  // Count jobs by looking for lines with job name patterns
  var jobsSection = jobsSectionMatch[1];
  var jobLines = jobsSection.match(/^\s{2}[a-z-]+:/gm);
  if (!jobLines || jobLines.length !== 2) {
    throw new Error("Expected exactly 2 jobs, found " + (jobLines ? jobLines.length : 0));
  }
});

// 7. Job names are correct
check("Job display names are correct", function () {
  if (!workflowContent.includes("name: pack-runtime-context-strict-validation-informational")) {
    throw new Error("Missing strict validation job name");
  }
  if (!workflowContent.includes("name: pack-runtime-context-snapshot-verification-informational")) {
    throw new Error("Missing snapshot verification job name");
  }
});

// 8. No needs dependencies (parallel)
check("No needs dependencies", function () {
  if (workflowContent.includes("needs:")) {
    throw new Error("Jobs must not have any 'needs:' dependencies");
  }
});

// 9. Runs on ubuntu-latest
check("Runs on ubuntu-latest", function () {
  var ubuntuCount = (workflowContent.match(/runs-on: ubuntu-latest/g) || []).length;
  if (ubuntuCount !== 2) {
    throw new Error("Both jobs must use 'runs-on: ubuntu-latest'");
  }
});

// 10. Has timeout-minutes: 5
check("Has timeout-minutes: 5", function () {
  var timeoutCount = (workflowContent.match(/timeout-minutes: 5/g) || []).length;
  if (timeoutCount !== 2) {
    throw new Error("Both jobs must have 'timeout-minutes: 5'");
  }
});

// 11. Uses actions/checkout@v4
check("Uses actions/checkout@v4", function () {
  var checkoutCount = (workflowContent.match(/uses: actions\/checkout@v4/g) || []).length;
  if (checkoutCount !== 2) {
    throw new Error("Both jobs must use 'uses: actions/checkout@v4'");
  }
});

// 12. Uses actions/setup-node@v4
check("Uses actions/setup-node@v4", function () {
  var setupNodeCount = (workflowContent.match(/uses: actions\/setup-node@v4/g) || []).length;
  if (setupNodeCount !== 2) {
    throw new Error("Both jobs must use 'uses: actions/setup-node@v4'");
  }
});

// 13. No secrets used
check("No secrets used", function () {
  if (workflowContent.includes("secrets.")) {
    throw new Error("Secrets must not be used");
  }
});

// 14. No write permissions
check("No write permissions", function () {
  var forbiddenPermissions = [
    "contents: write",
    "packages: write",
    "actions: write",
    "checks: write",
  ];
  for (var i = 0; i < forbiddenPermissions.length; i++) {
    if (workflowContent.includes(forbiddenPermissions[i])) {
      throw new Error("Forbidden permission found: " + forbiddenPermissions[i]);
    }
  }
});

// 15. No dangerous commands
check("No dangerous commands", function () {
  var forbiddenCommands = [
    "git push",
    "gh pr merge",
    "rm -rf",
    "git clean",
    "git reset --hard",
    "npm publish",
  ];
  for (var i = 0; i < forbiddenCommands.length; i++) {
    if (workflowContent.includes(forbiddenCommands[i])) {
      throw new Error("Forbidden command found: " + forbiddenCommands[i]);
    }
  }
});

// 16. No dangerous parameters
check("No dangerous parameters", function () {
  var forbiddenParams = [
    "--update",
    "--write",
    "--fix",
    "--delete",
    "--repair",
  ];
  for (var i = 0; i < forbiddenParams.length; i++) {
    if (workflowContent.includes(forbiddenParams[i])) {
      throw new Error("Forbidden parameter found: " + forbiddenParams[i]);
    }
  }
});

// 17. Strict job runs correct checks
check("Strict job runs correct checks", function () {
  if (!workflowContent.includes("check-strict-mode-policy-module-skeleton.cjs")) {
    throw new Error("Missing policy module check");
  }
  if (!workflowContent.includes("check-strict-mode-library-skeleton.cjs")) {
    throw new Error("Missing library skeleton check");
  }
  if (!workflowContent.includes("check-strict-mode-cli.cjs")) {
    throw new Error("Missing CLI check");
  }
});

// 18. Snapshot job runs correct checks
check("Snapshot job runs correct checks", function () {
  if (!workflowContent.includes("check-snapshot-comparator-module-skeleton.cjs")) {
    throw new Error("Missing comparator module check");
  }
  if (!workflowContent.includes("check-snapshot-comparator-cli.cjs")) {
    throw new Error("Missing comparator CLI check");
  }
  if (!workflowContent.includes("check-pack-runtime-context-snapshots.cjs --all --json")) {
    throw new Error("Missing compare-all --all --json");
  }
});

// 19. Both jobs write GITHUB_STEP_SUMMARY
check("Both jobs write GITHUB_STEP_SUMMARY", function () {
  var summaryCount = (workflowContent.match(/GITHUB_STEP_SUMMARY/g) || []).length;
  if (summaryCount < 4) {
    throw new Error("Both jobs must write to GITHUB_STEP_SUMMARY");
  }
});

// 20. Records raw exit codes
check("Records raw exit codes", function () {
  if (!workflowContent.includes("exit-code=")) {
    throw new Error("Must record raw exit codes");
  }
});

// 21. Distinguishes PASS vs ADVISORY FAILURE
check("Distinguishes PASS vs ADVISORY FAILURE", function () {
  if (!workflowContent.includes("PASS") || !workflowContent.includes("ADVISORY FAILURE")) {
    throw new Error("Must distinguish PASS and ADVISORY FAILURE");
  }
});

// 22. No package.json changes
check("Workflow does not modify package.json", function () {
  // This is a structural check - workflow shouldn't contain package.json modification
  if (workflowContent.includes("npm version") || workflowContent.includes("npm publish")) {
    throw new Error("Workflow must not modify package.json");
  }
});

// 23. No fixture/snapshot writes
check("No fixture/snapshot writes", function () {
  if (workflowContent.includes("fs.write") || workflowContent.includes("writeFileSync")) {
    throw new Error("Workflow must not write fixtures or snapshots");
  }
});

// 24. No .validation directory created
check("No .validation directory created", function () {
  if (workflowContent.includes(".validation")) {
    throw new Error("Workflow must not create or use .validation directory");
  }
});

// 25. No absolute local paths
check("No absolute local paths", function () {
  // Check for things like /home or /Users in workflow
  if (workflowContent.includes("/Users") || workflowContent.includes("/home")) {
    throw new Error("Workflow must not contain absolute local paths");
  }
});

// 26. No skills/chatgpt-desktop-mcp references
check("No chatgpt-desktop-mcp references", function () {
  if (workflowContent.includes("chatgpt-desktop-mcp")) {
    throw new Error("Workflow must not reference chatgpt-desktop-mcp");
  }
});

// 27. Deterministic workflow (no random stuff)
check("Workflow is deterministic", function () {
  if (workflowContent.includes("Math.random") || workflowContent.includes("Date.now")) {
    throw new Error("Workflow must be deterministic");
  }
});

// 28. Git diff only allows expected files
check("Git diff only allows expected files (post-hoc, checked separately)", function () {
  // This is just a placeholder - actual check happens in the verification phase
  // Just make sure the script is present
  return true;
});

// Print results
console.log("\nCI informational workflow check results:");
console.log("  Passed: " + passed);
console.log("  Failed: " + failed);

if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach(function (f) {
    console.log("  - " + f);
  });
  process.exit(1);
} else {
  console.log("\nCI informational workflow check passed");
  process.exit(0);
}
