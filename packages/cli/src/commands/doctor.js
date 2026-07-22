const fs = require("fs");
const path = require("path");

const root = process.cwd();

function ok(msg) {
  console.log("✅ " + msg);
}

function fail(msg) {
  console.log("❌ " + msg);
}

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

module.exports = function doctor() {
  console.log("== AWE Doctor ==");

  let failed = false;

  [
    "package.json",
    "packages/cli/src/index.js",
    "registry",
    "skills",
    "workflows",
    "factories",
    "prompts",
    "docs",
    "tests",
  ].forEach((p) => {
    if (exists(p)) {
      ok(p);
    } else {
      fail(p);
      failed = true;
    }
  });

  const { checkM8Docs } = require("../../../../scripts/check-m8-docs.cjs");
  const m8DocsResult = checkM8Docs({ verbose: false, cwd: root });

  if (m8DocsResult.ok) {
    ok("M8 docs smoke");
  } else {
    fail("M8 docs smoke");
    m8DocsResult.failures.forEach((reason) => console.log(`  - ${reason}`));
    failed = true;
  }

  process.exit(failed ? 1 : 0);
};
