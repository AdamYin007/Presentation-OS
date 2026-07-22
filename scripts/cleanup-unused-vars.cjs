#!/usr/bin/env node
/**
 * Bulk lint warning cleanup — removes unused variable declarations/imports
 * from ESLint output. Safe for no-unused-vars warnings only.
 */
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();

// Run eslint and capture output
const eslintrcPath = path.join(root, ".eslintrc.json");
const eslintConfig = JSON.parse(fs.readFileSync(eslintrcPath, "utf8"));

// Temporarily allow unused vars to be removed
const originalRules = { ...eslintConfig.rules };
eslintConfig.rules["no-unused-vars"] = "off";
fs.writeFileSync(eslintrcPath, JSON.stringify(eslintConfig, null, 2));

try {
  const result = execSync(
    "npx eslint --no-cache --fix packages/ registry/packages/ppt-factory/src/ scripts/ tests/ --ext .js,.cjs 2>&1",
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );

  // Parse lines matching: /path/to/file.js  line:col  warning  'var' is assigned/defined but never used
  const pattern = /^([^ ]+)\s+(\d+:\d+)\s+warning\s+'([^']+)'\s+is\s+\S+\s+but never used\s+no-unused-vars$/gm;
  let match;
  const files = {};

  while ((match = pattern.exec(result)) !== null) {
    const filepath = match[1];
    const varname = match[3];
    if (!files[filepath]) files[filepath] = [];
    files[filepath].push(varname);
  }

  let totalRemoved = 0;
  for (const [filepath, vars] of Object.entries(files)) {
    const fullpath = path.join(root, filepath);
    if (!fs.existsSync(fullpath)) continue;
    let content = fs.readFileSync(fullpath, "utf8");
    let changed = false;

    for (const varname of vars) {
      // Remove import/require lines containing the variable
      const importPattern = new RegExp(
        `(?:const|let|var)\\s+${escapeRegex(varname)}\\s*=\\s*[^;]+;\\s*\\n`,
        "g",
      );
      const before = content;
      content = content.replace(importPattern, "");

      // Remove destructured properties like: const { a, b, c } = require(...);
      const destructurePattern = new RegExp(
        `(const\\s+\\{[^}]*,?\\s*${escapeRegex(varname)}\\s*,?[^}]*\\}\\s*=)`,
        "g",
      );
      const before2 = content;
      content = content.replace(destructurePattern, (m) => {
        // Remove just this property from the destructuring
        return m.replace(new RegExp(`\\s*,?\\s*${escapeRegex(varname)}\\s*,?`), "");
      });

      if (content !== before || content !== before2) changed = true;
    }

    if (changed) {
      fs.writeFileSync(fullpath, content);
      totalRemoved += vars.length;
      console.log(`  cleaned ${vars.length} unused vars from ${filepath}`);
    }
  }

  console.log(`\nTotal unused variables removed: ${totalRemoved}`);
} finally {
  // Restore original rules
  eslintConfig.rules = originalRules;
  fs.writeFileSync(eslintrcPath, JSON.stringify(eslintConfig, null, 2));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
