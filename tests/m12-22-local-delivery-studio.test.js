#!/usr/bin/env node

"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  createServer,
  parseCliArgs,
  validateRequest,
} = require("../scripts/delivery-studio.js");

const ROOT_DIR = path.join(__dirname, "..");
const TEST_OUTPUT_DIR = path.join(ROOT_DIR, "fixtures", "m12-22", "test-output");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  });
}

function request(port, method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: pathname,
      method,
      headers: data ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      } : undefined,
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ statusCode: res.statusCode, body: responseBody, headers: res.headers }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function assertArtifact(result, name) {
  const artifactPath = result.artifacts[name];
  assert(artifactPath, `${name} should be listed in artifacts`);
  assert(fs.existsSync(artifactPath), `${name} should exist`);
  assert(fs.statSync(artifactPath).size > 0, `${name} should be non-empty`);
}

async function withServer(fn) {
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  const server = createServer({ studioDir: TEST_OUTPUT_DIR });
  const port = await listen(server);
  try {
    await fn(port);
  } finally {
    await close(server);
  }
}

const sampleMarkdown = `# M12.22 Delivery Studio

## Executive Summary
- Local operators can generate PPTX decks without command-line knowledge
- Existing commercial QA reports remain the source of truth
- Brand profiles flow through the same one-command delivery pipeline

## Commercial Value
- Faster demo loop
- Lower onboarding friction
- Clear local artifact handoff`;

test("parseCliArgs supports explicit port and studio directory", () => {
  const parsed = parseCliArgs(["node", "scripts/delivery-studio.js", "--port", "0", "--studio-dir", "/tmp/studio"]);
  assert.strictEqual(parsed.port, 0);
  assert.strictEqual(parsed.studioDir, "/tmp/studio");
});

test("validateRequest accepts markdown, style, and built-in brand profile", () => {
  const result = validateRequest({ markdown: sampleMarkdown, style: "business-consulting", brandProfile: "business-consulting" });
  assert.strictEqual(result.style, "business-consulting");
  assert.strictEqual(result.brandProfile, "business-consulting");
});

test("validateRequest rejects empty markdown", () => {
  const result = validateRequest({ markdown: "   " });
  assert(result.error.includes("Markdown input is required"));
});

test("GET / serves Presentation OS Studio UI", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/");
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes("Presentation OS Delivery Studio"));
    assert(!res.body.includes("MuseSnap"));
  });
});

test("GET /api/profiles returns styles and built-in profiles", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/api/profiles");
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert(data.styles.includes("minimal-modern"));
    assert(data.profiles.some((p) => p.id === "business-consulting"));
  });
});

test("POST /api/deliver rejects invalid profile with 400", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/api/deliver", {
      markdown: sampleMarkdown,
      brandProfile: "does-not-exist",
    });
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, "error");
    assert(data.error.includes("Invalid brand profile"));
  });
});

test("POST /api/deliver generates PPTX and commercial reports", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/api/deliver", {
      markdown: sampleMarkdown,
      style: "minimal-modern",
      brandProfile: "minimal-modern",
      title: "Studio Smoke Test",
    });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, "ok");
    assert(data.jobId);
    assert(fs.existsSync(data.jobDir));
    assertArtifact(data, "output.pptx");
    assertArtifact(data, "COMMERCIAL-VERDICT.md");
    assertArtifact(data, "machine-report.json");
    assert.strictEqual(data.summary.style, "minimal-modern");
    assert.strictEqual(data.summary.brandProfile, "minimal-modern");
  });
});

test("existing deliver:pptx CLI remains callable", () => {
  const result = spawnSync(process.execPath, [path.join(ROOT_DIR, "scripts", "deliver-pptx.js"), "--help"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });
  assert.strictEqual(result.status, 0);
  assert(result.stdout.includes("Usage: node scripts/deliver-pptx.js"));
  assert(result.stdout.includes("--brand-profile"));
});

(async () => {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`PASS ${t.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${t.name}`);
      console.error(err.stack || err.message);
    }
  }

  console.log("");
  console.log(`M12.22 Local Delivery Studio tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
