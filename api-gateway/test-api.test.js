#!/usr/bin/env node
/**
 * AWE Presentation OS — API Gateway Tests
 *
 * Tests REST API endpoints, authentication, and rate limiting.
 * Run with: node api-gateway/test-api.test.js
 */
"use strict";

const http = require("http");
const assert = require("assert");

let passed = 0;
let failed = 0;
let total = 0;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: { "Content-Type": "application/json", ...headers },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data; // binary response (PPTX)
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function check(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log("=".repeat(65));
  console.log("AWE API Gateway Tests");
  console.log("=".repeat(65));

  await check("Health check returns ok", async () => {
    const res = await request("GET", "/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ok");
  });

  await check("Missing API key returns 401", async () => {
    const res = await request("POST", "/v1/generate", { markdown: "# Test" });
    assert.strictEqual(res.status, 401);
  });

  await check("Invalid API key returns 403", async () => {
    const res = await request("POST", "/v1/generate", { markdown: "# Test" }, {
      Authorization: "Bearer wrong-key",
    });
    assert.strictEqual(res.status, 403);
  });

  await check("Empty markdown returns 400", async () => {
    const res = await request("POST", "/v1/generate", {}, {
      Authorization: "Bearer demo-key-123",
    });
    assert.strictEqual(res.status, 400);
  });

  await check("Generate basic presentation", async () => {
    const res = await request("POST", "/v1/generate", {
      markdown: "# Hello World\n\n## Overview\n\n- Point A\n- Point B",
    }, { Authorization: "Bearer demo-key-123" });
    assert.strictEqual(res.status, 200);
    assert(res.headers["content-type"].includes("presentationml"));
    assert(Number(res.headers["x-slides-count"]) > 0);
  });

  await check("Generate with compiler option", async () => {
    const res = await request("POST", "/v1/generate", {
      markdown: "# Test\n\n## Section\n\n- Detail",
      options: { compiler: true },
    }, { Authorization: "Bearer demo-key-123" });
    assert.strictEqual(res.status, 200);
  });

  await check("Generate with audience engine", async () => {
    const res = await request("POST", "/v1/generate", {
      markdown: "# Test\n\n## Section\n\n- Detail",
      options: { audienceEngine: { speaker: "executive", audience: "board" } },
    }, { Authorization: "Bearer demo-key-123" });
    assert.strictEqual(res.status, 200);
  });

  await check("Rate limit enforced after 10 requests", async () => {
    for (let i = 0; i < 12; i++) {
      const res = await request("POST", "/v1/generate", { markdown: "# T" }, {
        Authorization: "Bearer demo-key-123",
      });
      if (res.status === 429) break;
    }
    // The last response should be 429 or we already got one
    let got429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await request("POST", "/v1/generate", { markdown: "# T" }, {
        Authorization: "Bearer demo-key-123",
      });
      if (res.status === 429) { got429 = true; break; }
    }
    assert(got429, "Expected 429 rate limit");
  });

  console.log("\n" + "=".repeat(65));
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log("=".repeat(65));

  process.exit(failed > 0 ? 1 : 0);
}

main();
