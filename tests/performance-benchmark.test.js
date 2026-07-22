#!/usr/bin/env node
/**
 * Performance Benchmark — AWE Presentation OS
 *
 * Measures pipeline throughput, compilation time, and memory usage across
 * different input sizes and configurations.
 *
 * Usage:
 *   node tests/performance-benchmark.test.js
 */
"use strict";

const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { loadProfile, resolveBrandConfig } = require("../packages/brand-profiles/src/index.js");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Performance thresholds (seconds)
const THRESHOLDS = {
  smallInput: 5,
  mediumInput: 15,
  largeInput: 30,
  withCompiler: 20,
  withAudienceEngine: 20,
  brandedDeck: 15,
};

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}`);
  }
}

function measureTime(fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const end = process.hrtime.bigint();
  return { durationMs: Number(end - start) / 1e6, result };
}

async function measureAsyncTime(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  return { durationMs: Number(end - start) / 1e6, result };
}

// ─── Test Suites ──────────────────────────────────────────────

async function benchmarkSmallInput() {
  console.log("\n[Benchmark] Small Input (< 10 lines)");

  const input = "# Quick Deck\n\n## Overview\n\n- Point A\n- Point B\n\n## Conclusion\n\nThank you.";

  const { durationMs, result } = await measureAsyncTime(() => runPipeline(input));

  assert(result !== null, "Small input produces result");
  assert(result.slideCount > 0, "Small input produces slides");
  assert(durationMs < THRESHOLDS.smallInput * 1000, `Small input under ${THRESHOLDS.smallInput}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkMediumInput() {
  console.log("\n[Benchmark] Medium Input (~50 lines)");

  const lines = ["# Medium Deck"];
  for (let i = 0; i < 10; i++) {
    lines.push(`\n## Section ${i + 1}`);
    lines.push(`Content for section ${i + 1}.`);
    for (let j = 0; j < 3; j++) {
      lines.push(`- Detail ${j + 1}: important information about topic ${i}`);
    }
  }
  const input = lines.join("\n");

  const { durationMs, result } = await measureAsyncTime(() => runPipeline(input));

  assert(result !== null, "Medium input produces result");
  assert(result.slideCount > 0, "Medium input produces slides");
  assert(durationMs < THRESHOLDS.mediumInput * 1000, `Medium input under ${THRESHOLDS.mediumInput}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkLargeInput() {
  console.log("\n[Benchmark] Large Input (~200 lines)");

  const lines = ["# Large Deck"];
  for (let i = 0; i < 25; i++) {
    lines.push(`\n## Section ${i + 1}`);
    lines.push(`Detailed content for section ${i + 1} with multiple points.`);
    for (let j = 0; j < 5; j++) {
      lines.push(`- Point ${j + 1}: comprehensive explanation of key concept ${j + 1} in this domain`);
    }
  }
  const input = lines.join("\n");

  const { durationMs, result } = await measureAsyncTime(() => runPipeline(input));

  assert(result !== null, "Large input produces result");
  assert(result.slideCount > 0, "Large input produces slides");
  assert(durationMs < THRESHOLDS.largeInput * 1000, `Large input under ${THRESHOLDS.largeInput}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkWithCompiler() {
  console.log("\n[Benchmark] With Compiler Enabled");

  const input = "# Compiler Test\n\n## Overview\n\n- Point A\n- Point B\n- Point C\n- Point D\n- Point E";

  const { durationMs, result } = await measureAsyncTime(() =>
    runPipeline(input, { compiler: true, optimize: true }),
  );

  assert(result !== null, "Compiler-enabled pipeline produces result");
  assert(result.slideCount > 0, "Compiler-enabled pipeline produces slides");
  assert(durationMs < THRESHOLDS.withCompiler * 1000, `Compiler mode under ${THRESHOLDS.withCompiler}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkWithAudienceEngine() {
  console.log("\n[Benchmark] With Audience Engine");

  const input = "# Audience Test\n\n## Overview\n\n- Technical point\n- Business impact\n- Next steps";

  const { durationMs, result } = await measureAsyncTime(() =>
    runPipeline(input, {
      audienceEngine: { speaker: "executive", audience: "board" },
    }),
  );

  assert(result !== null, "Audience-engine pipeline produces result");
  assert(result.slideCount > 0, "Audience-engine pipeline produces slides");
  assert(durationMs < THRESHOLDS.withAudienceEngine * 1000, `Audience engine under ${THRESHOLDS.withAudienceEngine}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkBrandedDeck() {
  console.log("\n[Benchmark] With Brand Profile");

  const input = "# Branded Deck\n\n## Overview\n\n- Point A\n- Point B\n- Point C";

  const brandConfig = resolveBrandConfig(loadProfile("business-consulting").profile);

  const { durationMs, result } = await measureAsyncTime(() =>
    runPipeline(input, { brandConfig }),
  );

  assert(result !== null, "Branded pipeline produces result");
  assert(result.slideCount > 0, "Branded pipeline produces slides");
  assert(durationMs < THRESHOLDS.brandedDeck * 1000, `Branded deck under ${THRESHOLDS.brandedDeck}s (${durationMs.toFixed(0)}ms)`);

  console.log(`  → ${result.slideCount} slides in ${durationMs.toFixed(0)}ms`);
}

async function benchmarkMemoryUsage() {
  console.log("\n[Benchmark] Memory Usage");

  const initialMem = process.memoryUsage().heapUsed;

  // Run several pipelines to build up memory
  for (let i = 0; i < 5; i++) {
    const input = `# Deck ${i}\n\n## Section ${i}\n\n- Point ${i}`;
    await runPipeline(input);
  }

  const finalMem = process.memoryUsage().heapUsed;
  const memDeltaMB = (finalMem - initialMem) / (1024 * 1024);

  assert(memDeltaMB < 50, `Memory delta under 50MB (${memDeltaMB.toFixed(2)}MB)`);
  console.log(`  → Heap delta: ${memDeltaMB.toFixed(2)}MB after 5 runs`);
}

// ─── Run All Tests ────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("Performance Benchmark Suite");
  console.log("=".repeat(65));

  try {
    await benchmarkSmallInput();
    await benchmarkMediumInput();
    await benchmarkLargeInput();
    await benchmarkWithCompiler();
    await benchmarkWithAudienceEngine();
    await benchmarkBrandedDeck();
    await benchmarkMemoryUsage();
  } catch (err) {
    console.error("\nUnexpected error during benchmarks:", err.message);
    console.error(err.stack);
    failedTests++;
  }

  console.log("\n" + "=".repeat(65));
  console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
  console.log("=".repeat(65));

  if (failedTests > 0) process.exit(1);
  process.exit(0);
}

main();
