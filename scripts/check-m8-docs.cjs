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

function checkM8Docs(options = {}) {
  const { verbose = true, cwd = process.cwd() } = options;
  const failures = [];

  if (verbose) {
    console.log("M8 docs smoke check");
  }

  for (const file of requiredDocs) {
    const exists = fs.existsSync(path.resolve(cwd, file));

    if (!exists) {
      failures.push(`missing required doc: ${file}`);
      if (verbose) console.error(`FAIL missing required doc: ${file}`);
    } else if (verbose) {
      console.log(`PASS required doc exists: ${file}`);
    }
  }

  for (const file of forbiddenDocs) {
    const exists = fs.existsSync(path.resolve(cwd, file));

    if (exists) {
      failures.push(`misplaced registry doc exists: ${file}`);
      if (verbose) console.error(`FAIL misplaced registry doc exists: ${file}`);
    } else if (verbose) {
      console.log(`PASS no misplaced registry doc: ${file}`);
    }
  }

  if (verbose && failures.length === 0) {
    console.log("M8 docs smoke check passed");
  }

  return {
    ok: failures.length === 0,
    failures,
    requiredDocs,
    forbiddenDocs,
  };
}

if (require.main === module) {
  const result = checkM8Docs({ verbose: true });
  if (!result.ok) {
    process.exit(1);
  }
}

module.exports = {
  checkM8Docs,
  requiredDocs,
  forbiddenDocs,
};
