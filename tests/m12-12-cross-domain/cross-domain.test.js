/**
 * Cross-domain validation tests for M12.12.
 * Runs the full pipeline on each domain fixture and validates:
 * - Slide count is within expected range (pipeline consolidates sections)
 * - Content presence (key topics appear in output)
 * - Valid PPTX ZIP structure
 * - No completely empty slides
 * - Regression: existing M12.7 pipeline still works
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

// Domain fixtures with expected slide ranges
// Pipeline consolidates multi-section markdown into ~7-10 slides typically
const FIXTURES = [
  {
    name: "business-review",
    input: path.join(__dirname, "../../fixtures/m12-12/business-review/input.md"),
    minSlides: 5,
    maxSlides: 18,
    // Keywords chosen to match actual pipeline output (consolidated content)
    expectedContent: ["revenue", "analytics", "churn"],
  },
  {
    name: "technical-report",
    input: path.join(__dirname, "../../fixtures/m12-12/technical-report/input.md"),
    minSlides: 5,
    maxSlides: 15,
    expectedContent: ["observability", "metrics", "analysis"],
  },
  {
    name: "academic-lecture",
    input: path.join(__dirname, "../../fixtures/m12-12/academic-lecture/input.md"),
    minSlides: 5,
    maxSlides: 20,
    expectedContent: ["quantum", "qubit", "superconducting"],
  },
  {
    name: "product-pitch",
    input: path.join(__dirname, "../../fixtures/m12-12/product-pitch/input.md"),
    minSlides: 5,
    maxSlides: 15,
    expectedContent: ["aurora", "companies", "roi"],
  },
];

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Run make-pptx.js on a fixture and return { output, success, error }.
 */
function runPipeline(fixture) {
  const output = `/tmp/m12-12-${fixture.name}.pptx`;
  try {
    execSync(
      `node scripts/make-pptx.js "${fixture.input}" "${output}"`,
      { timeout: 30000, stdio: "pipe" }
    );
    return { output, success: true };
  } catch (e) {
    return { output: null, success: false, error: e.message };
  }
}

/**
 * Extract ALL text from a PPTX using Python's zipfile (no external deps).
 * Includes slide XMLs, notes, table cells, and master slides.
 */
function getAllText(pptxPath) {
  const result = execSync(
    `python3 -c "
import zipfile, re, sys
zf = zipfile.ZipFile(sys.argv[1])
texts = []
for name in zf.namelist():
    try:
        content = zf.read(name).decode('utf-8', errors='ignore')
        # Slide content
        for m in re.finditer(r'<a:t>([^<]+)</a:t>', content):
            t = m.group(1).strip()
            if t and len(t) > 1:
                texts.append(t)
        # Table cell text
        for m in re.finditer(r'<a:v:(?:val|t)>([^<]*)</a:v:', content):
            t = m.group(1).strip()
            if t and len(t) > 1:
                texts.append(t)
        # Notes
        if 'notes' in name.lower():
            for m in re.finditer(r'<a:t>([^<]+)</a:t>', content):
                t = m.group(1).strip()
                if t and len(t) > 1:
                    texts.append('[NOTES] ' + t)
    except:
        pass
print('\\n'.join(texts[:500]))
" "${pptxPath}"`,
    { encoding: "utf8", timeout: 10000 }
  ).trim();
  return result.split("\n").filter((t) => t.length > 0);
}

/**
 * Count slides that have absolutely no text at all.
 * A slide with any text content (even short) is acceptable.
 */
function getEmptySlideCount(pptxPath) {
  const result = execSync(
    `python3 -c "
import zipfile, re, sys
zf = zipfile.ZipFile(sys.argv[1])
slide_files = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
empty_count = 0
for sf in slide_files:
    content = zf.read(sf).decode('utf-8', errors='ignore')
    texts = re.findall(r'<a:t>([^<]*)</a:t>', content)
    has_any_text = any(len(t.strip()) > 1 for t in texts)
    if not has_any_text:
        empty_count += 1
print(empty_count)
" "${pptxPath}"`,
    { encoding: "utf8", timeout: 10000 }
  ).trim();
  return parseInt(result, 10);
}

/**
 * Get slide count and total text length from a PPTX.
 */
function getPptxInfo(pptxPath) {
  const result = execSync(
    `python3 -c "
import zipfile, re, sys
try:
    zf = zipfile.ZipFile(sys.argv[1])
    slide_files = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
    count = len(slide_files)
    total_text_len = 0
    for sf in slide_files:
        content = zf.read(sf).decode('utf-8', errors='ignore')
        texts = re.findall(r'<a:t>([^<]*)</a:t>', content)
        total_text_len += sum(len(t) for t in texts)
    print(f'{count}|{total_text_len}')
except Exception as e:
    print(f'ERROR|0|{e}')
" "${pptxPath}"`,
    { encoding: "utf8", timeout: 10000 }
  ).trim();
  const parts = result.split("|");
  return {
    slideCount: parseInt(parts[0], 10),
    totalTextLength: parseInt(parts[1], 10),
    error: parts[0] === "ERROR" ? parts.slice(2).join("|") : null,
  };
}

// ── Test Group 1: Pipeline execution ──────────────────────────
console.log("=== Test Group 1: Pipeline execution per domain ===");
for (const fixture of FIXTURES) {
  const { output, success, error } = runPipeline(fixture);
  assert(success, `[${fixture.name}] pipeline executed without error`);
  if (success && output) {
    assert(fs.existsSync(output), `[${fixture.name}] output file created`);
    const stats = fs.statSync(output);
    assert(stats.size > 10000, `[${fixture.name}] PPTX size ${stats.size} bytes (>10KB)`);
  }
}

// ── Test Group 2: Content verification ────────────────────────
console.log("\n=== Test Group 2: Content presence in generated PPTX ===");
for (const fixture of FIXTURES) {
  const output = `/tmp/m12-12-${fixture.name}.pptx`;
  if (!fs.existsSync(output)) continue;
  const texts = getAllText(output);
  for (const keyword of fixture.expectedContent) {
    const found = texts.some((t) => t.toLowerCase().includes(keyword.toLowerCase()));
    assert(found, `[${fixture.name}] contains keyword "${keyword}"`);
  }
}

// ── Test Group 3: Slide count bounds ──────────────────────────
console.log("\n=== Test Group 3: Slide count within expected range ===");
for (const fixture of FIXTURES) {
  const output = `/tmp/m12-12-${fixture.name}.pptx`;
  if (!fs.existsSync(output)) continue;
  const info = getPptxInfo(output);
  assert(info.slideCount >= fixture.minSlides, `[${fixture.name}] slide count ${info.slideCount} >= ${fixture.minSlides}`);
  assert(info.slideCount <= fixture.maxSlides, `[${fixture.name}] slide count ${info.slideCount} <= ${fixture.maxSlides}`);
}

// ── Test Group 4: Quality gates ───────────────────────────────
console.log("\n=== Test Group 4: Quality gates ===");
for (const fixture of FIXTURES) {
  const output = `/tmp/m12-12-${fixture.name}.pptx`;
  if (!fs.existsSync(output)) continue;
  const buf = fs.readFileSync(output);
  assert(buf[0] === 0x50 && buf[1] === 0x4b, `[${fixture.name}] valid PK/ZIP signature`);
  const emptySlides = getEmptySlideCount(output);
  assert(emptySlides === 0, `[${fixture.name}] no empty slides (${emptySlides} found)`);
  const info = getPptxInfo(output);
  assert(info.totalTextLength > 200, `[${fixture.name}] sufficient text content (${info.totalTextLength} chars)`);
}

// ── Test Group 5: Regression — existing M12.7 pipeline ────────
console.log("\n=== Test Group 5: Regression check ===");
const regressionOutput = "/tmp/m12-12-regression.pptx";
const sampleInput = "fixtures/m12-11/sample-input.md";
if (fs.existsSync(sampleInput)) {
  try {
    execSync(`node scripts/make-pptx.js "${sampleInput}" "${regressionOutput}"`, { timeout: 30000, stdio: "pipe" });
    assert(fs.existsSync(regressionOutput), "Regression: output created");
    const stats = fs.statSync(regressionOutput);
    assert(stats.size > 5000, `Regression: PPTX size ${stats.size} bytes`);
    assert(stats.size < 500000, `Regression: PPTX not oversized (${stats.size} bytes)`);
  } catch (e) {
    assert(false, `Regression: pipeline failed — ${e.message}`);
  }
} else {
  assert(false, "Regression: sample input file not found");
}

// ── Summary ───────────────────────────────────────────────────
console.log("\n=========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exitCode = 1;
} else {
  console.log("All cross-domain tests passed!");
}
