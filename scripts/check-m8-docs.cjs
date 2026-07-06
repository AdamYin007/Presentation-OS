#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const requiredDocs = [
  "docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md",
  "docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md",
  "docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md",
  "docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md",
];

const forbiddenDocs = [
  "registry/docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md",
  "registry/docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md",
  "registry/docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md",
  "registry/docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md",
];

let failed = false;

console.log("M8 docs smoke check");

for (const file of requiredDocs) {
  if (!fs.existsSync(path.resolve(file))) {
    console.error(`FAIL missing required doc: ${file}`);
    failed = true;
  } else {
    console.log(`PASS required doc exists: ${file}`);
  }
}

for (const file of forbiddenDocs) {
  if (fs.existsSync(path.resolve(file))) {
    console.error(`FAIL misplaced registry doc exists: ${file}`);
    failed = true;
  } else {
    console.log(`PASS no misplaced registry doc: ${file}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("M8 docs smoke check passed");
