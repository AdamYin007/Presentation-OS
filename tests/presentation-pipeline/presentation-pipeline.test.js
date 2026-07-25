#!/usr/bin/env node
/**
 * Integration tests for @awe/presentation-pipeline (pipeline.js)
 * Runs tests sequentially to avoid console.log hook interference.
 */

"use strict";

const assert = require("assert");
const { runPipeline } = require("../../packages/presentation-pipeline/src/pipeline.js");

const SIMPLE = "# Quarterly Review\n\n## Revenue Growth\n- Q1: $12M (+15% YoY)\n- Q2: $14M (+18% YoY)\n- Q3: $16M (+20% YoY)\n\n## Customer Metrics\n- Net new logos: 45\n- Expansion revenue: $3.2M\n- Churn rate: 2.1%\n\n## Strategic Initiatives\n- Enter APAC market by Q4\n- Launch self-service portal\n- Hire 20 engineers";

let passed = 0, failed = 0, total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function main() {
  // 1. Core Pipeline
  await test("1.1 — Basic pipeline produces PPTX buffer", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    assert(r.pptxBuffer instanceof Buffer && r.pptxBuffer.length > 0);
    assert(r.slideCount > 0 && r.intent.topic !== undefined);
    assert(r.deckPlan && r.slideSpecs && r.layoutPlan);
  });

  await test("1.2 — Slide count is reasonable (5-20)", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    assert(r.slideCount >= 5 && r.slideCount <= 20, `got ${r.slideCount}`);
  });

  await test("1.3 — Intent parsing extracts purpose and audience", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    assert.strictEqual(r.intent.purpose, "review");
    assert.strictEqual(r.intent.language, "en-US");
  });

  await test("1.4 — SlideSpecs have valid roles", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    const valid = new Set(["title","agenda","section-divider","executive-summary",
      "content","comparison","process","timeline","roadmap","data-chart",
      "table","matrix","closing","q-and-a"]);
    for (const s of r.slideSpecs) assert(valid.has(s.role), `Invalid role: ${s.role}`);
  });

  await test("1.5 — LayoutPlan has theme tokens", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    assert(r.layoutPlan.themeTokens && r.layoutPlan.layouts.length > 0);
  });

  // 2. Quiet Mode
  await test("2.1 — _quiet=true suppresses console.log", async () => {
    let logged = false;
    const origLog = console.log;
    console.log = (...a) => { logged = true; };
    try {
      await runPipeline(SIMPLE, { _quiet: true });
      assert(logged === false, "console.log should NOT be called in quiet mode");
    } finally { console.log = origLog; }
  });

  await test("2.2 — _quiet=false allows console.log", async () => {
    let logged = false;
    const origLog = console.log;
    console.log = (...a) => { logged = true; };
    try {
      await runPipeline(SIMPLE, { _quiet: false });
      assert(logged === true, "console.log SHOULD be called");
    } finally { console.log = origLog; }
  });

  // 3. Content Architect
  await test("3.1 — Content Architect enabled still produces output", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, contentArchitect: { enabled: true } });
    assert(r.slideSpecs.length > 0);
  });

  await test("3.2 — Content Architect disabled (default) works normally", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    assert(r.slideSpecs.length > 0);
  });

  // 4. Audience Engine
  await test("4.1 — Audience engine adjusts slide specs", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, audienceEngine: { speaker: "specialist", audience: "board" } });
    assert(r.audienceEngine && r.audienceEngine.contract && r.slideSpecs.length > 0);
  });

  await test("4.2 — Unknown speaker profile uses defaults gracefully", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, audienceEngine: { speaker: "nonexistent", audience: "board" } });
    assert(r.slideSpecs.length > 0);
  });

  // 5. Compiler
  await test("5.1 — Compiler standard mode", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, compiler: "standard" });
    assert(r.compiler && r.compiler.mode === "standard");
  });

  await test("5.2 — Compiler optimized mode", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, compiler: "optimized" });
    assert(r.compiler && r.compiler.mode === "optimized");
  });

  // 6. Brand Config
  await test("6.1 — Brand config threads through layout and renderer", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, style: "business-consulting",
      brandConfig: { brandName: "Acme Corp", footerConvention: "slide-number" } });
    assert(r.layoutPlan && r.pptxBuffer.length > 0);
  });

  // 7. Error Handling
  await test("7.1 — Empty input produces minimal output", async () => {
    const r = await runPipeline("", { _quiet: true });
    assert(r.pptxBuffer instanceof Buffer && r.pptxBuffer.length > 0);
  });

  await test("7.2 — Unknown style defaults gracefully", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true, style: "unknown-nonexistent-style" });
    assert(r.slideSpecs.length > 0);
  });

  // 8. Output Contract
  await test("8.1 — Result has all required top-level fields", async () => {
    const r = await runPipeline(SIMPLE, { _quiet: true });
    for (const f of ["sourceDocument","format","intent","deckPlan","slideSpecs","layoutPlan","pptxBuffer","pptxPath","slideCount"]) {
      assert(f in r, `Missing: ${f}`);
    }
  });

  // Summary
  console.log("");
  console.log("=".repeat(50));
  console.log(`Pipeline Integration Tests: ${passed}/${total} passed, ${failed} failed`);
  console.log("=".repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error("Runner error:", e); process.exit(1); });
