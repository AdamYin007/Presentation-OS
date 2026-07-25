#!/usr/bin/env node
/**
 * AWE Presentation OS — API Gateway MVP
 *
 * REST API for programmatic presentation generation.
 * POST /v1/generate -> returns .pptx buffer
 * GET  /health      -> status check
 *
 * Features:
 * - API Key authentication (Bearer token)
 * - Basic rate limiting per key
 * - CORS headers for web clients
 * - Markdown -> PPTX pipeline integration
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");

// ─── Configuration ──────────────────────────────────────────────

// Load .env file if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const PORT = parseInt(process.env.API_PORT || "3000", 10);
const HOST = process.env.API_HOST || "0.0.0.0";

// API Keys from env or defaults
const API_KEYS_RAW = process.env.API_KEYS || "";
const API_KEYS = {};
if (API_KEYS_RAW) {
  API_KEYS_RAW.split(",").forEach((kv) => {
    const [key, tier] = kv.split(":");
    if (key && tier) API_KEYS[key.trim()] = { name: key.trim(), tier: tier.trim() };
  });
}
// Fallback test keys
if (Object.keys(API_KEYS).length === 0) {
  Object.assign(API_KEYS, {
    "demo-key-123": { name: "Demo", tier: "free" },
    "test-key-456": { name: "Test", tier: "pro" },
  });
}

// Rate limits (requests per window)
const RATE_LIMITS = {
  free: { max: parseInt(process.env.RATE_LIMIT_FREE || "10", 10), windowMs: 60_000 },
  pro: { max: parseInt(process.env.RATE_LIMIT_PRO || "100", 10), windowMs: 60_000 },
  enterprise: { max: parseInt(process.env.RATE_LIMIT_ENTERPRISE || "1000", 10), windowMs: 60_000 },
};

// ─── Rate Limiter ──────────────────────────────────────────────

class RateLimiter {
  constructor() {
    this.windowStarts = new Map();
  }

  allow(apiKey, tier) {
    const config = RATE_LIMITS[tier] || RATE_LIMITS.free;
    const now = Date.now();
    let start = this.windowStarts.get(apiKey);

    if (!start || now - start > config.windowMs) {
      start = now;
      this.windowStarts.set(apiKey, start);
      this.windowStarts.set(`${apiKey}:count`, 0);
    }

    const count = (this.windowStarts.get(`${apiKey}:count`) || 0) + 1;
    this.windowStarts.set(`${apiKey}:count`, count);

    return count <= config.max;
  }
}

const limiter = new RateLimiter();

// ─── Helpers ────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message, timestamp: new Date().toISOString() });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// ─── Handlers ───────────────────────────────────────────────────

async function handleGenerate(req, res) {
  const start = Date.now();

  try {
    const data = await parseBody(req);
    const { markdown, options = {} } = data;

    if (!markdown || typeof markdown !== "string") {
      return sendError(res, 400, "Missing or invalid 'markdown' field");
    }

    if (markdown.trim().length === 0) {
      return sendError(res, 400, "Markdown input is empty");
    }

    const result = await runPipeline(markdown, options);

    if (!result || !result.pptxBuffer) {
      return sendError(res, 500, "Pipeline failed to generate PPTX");
    }

    const elapsed = Date.now() - start;

    res.writeHead(200, {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition":
        `attachment; filename="presentation-${Date.now()}.pptx"`,
      "X-Processing-Time": `${elapsed}ms`,
      "X-Slides-Count": String(result.slideCount || 0),
      "Access-Control-Allow-Origin": "*",
    });

    res.end(result.pptxBuffer);
  } catch (err) {
    console.error("[API] Pipeline error:", err.message);
    sendError(res, 500, `Pipeline error: ${err.message}`);
  }
}

function handleHealth(_req, res) {
  sendJson(res, 200, {
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    features: {
      compiler: true,
      audienceEngine: true,
      brandProfiles: true,
      packEcosystem: true,
    },
  });
}

// ─── Middleware ─────────────────────────────────────────────────

function authenticate(req, res) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, 401, "Missing or invalid Authorization header");
    return false;
  }

  const apiKey = authHeader.slice(7).trim();
  const keyInfo = API_KEYS[apiKey];

  if (!keyInfo) {
    sendError(res, 403, "Invalid API key");
    return false;
  }

  if (!limiter.allow(apiKey, keyInfo.tier)) {
    sendError(res, 429, "Rate limit exceeded. Try again later.");
    return false;
  }

  return true;
}

// ─── Server ─────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // Health endpoint -- no auth required
  if (req.method === "GET" && url.pathname === "/health") {
    handleHealth(req, res);
    return;
  }

  // Generate endpoint -- requires auth
  if (req.method === "POST" && url.pathname === "/v1/generate") {
    if (!authenticate(req, res)) return;
    await handleGenerate(req, res);
    return;
  }

  // Swagger-like docs endpoint
  if (req.method === "GET" && url.pathname === "/docs") {
    sendJson(res, 200, {
      name: "AWE Presentation OS API",
      version: "1.0.0",
      endpoints: [
        { method: "GET", path: "/health", description: "Health check" },
        {
          method: "POST",
          path: "/v1/generate",
          description: "Generate PPTX from markdown",
          headers: { Authorization: "Bearer <api-key>" },
          body: {
            markdown: "# Title\n\n## Section\n\n- Point A",
            options: {
              style: "minimal-modern",
              compiler: false,
              audienceEngine: null,
              brandConfig: null,
            },
          },
        },
      ],
    });
    return;
  }

  sendError(res, 404, "Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 AWE API Gateway running at http://${HOST}:${PORT}`);
  console.log(`📋 Health:      http://${HOST}:${PORT}/health`);
  console.log(`📖 Docs:        http://${HOST}:${PORT}/docs`);
  console.log(`🔑 API keys:    ${Object.keys(API_KEYS).join(", ")}`);
});
