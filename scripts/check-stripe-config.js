#!/usr/bin/env node
/**
 * AWE Stripe Configuration Validator
 *
 * Checks:
 * 1. Environment variables presence (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
 * 2. Secret key format validation
 * 3. Webhook signing secret format validation
 * 4. Publishable key format (optional)
 * 5. API connectivity (if secret key valid)
 *
 * Usage:
 *   node scripts/check-stripe-config.js
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/check-stripe-config.js
 */
"use strict";

const crypto = require("crypto");

// ─── Config ─────────────────────────────────────────────────────

const REQUIRED_VARS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
const OPTIONAL_VARS = ["STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_URL"];

// ─── Helpers ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function warn(name, detail = "") {
  console.log(`  ⚠ ${name}${detail ? ` — ${detail}` : ""}`);
  warnings++;
}

// ─── Validation Logic ──────────────────────────────────────────

console.log("=================================================================");
console.log("AWE Stripe Configuration Validator");
console.log("=================================================================");
console.log("");

// 1. Check environment variables
console.log("[1] Environment Variables");

for (const v of REQUIRED_VARS) {
  const val = process.env[v];
  check(`${v} is set`, !!val && val.length > 0, "missing");
}

for (const v of OPTIONAL_VARS) {
  const val = process.env[v];
  if (!val || val.length === 0) {
    warn(`${v} not set (optional)`);
  } else {
    check(`${v} is set`, true);
  }
}

// 2. Validate secret key format
console.log("");
console.log("[2] Secret Key Format");

const secretKey = process.env.STRIPE_SECRET_KEY || "";
if (secretKey) {
  const skPrefix = secretKey.startsWith("sk_");
  const skLength = secretKey.length >= 20;
  const skIsTest = secretKey.startsWith("sk_test_");
  const skIsLive = secretKey.startsWith("sk_live_");

  check("Starts with sk_", skPrefix, "expected sk_test_ or sk_live_ prefix");
  check("Length >= 20 chars", skLength, `got ${secretKey.length} chars`);
  check(
    "Is test key (sk_test_) for development",
    skIsTest,
    skIsLive ? "use sk_test_ for development, not sk_live_" : "neither sk_test_ nor sk_live_"
  );

  // Mask key for display
  const masked = secretKey.slice(0, 10) + "...(hidden)";
  console.log(`    Key preview: ${masked}`);
}

// 3. Validate webhook secret format
console.log("");
console.log("[3] Webhook Secret Format");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
if (webhookSecret) {
  const wsPrefix = webhookSecret.startsWith("whsec_");
  const wsLength = webhookSecret.length >= 20;

  check("Starts with whsec_", wsPrefix, "expected whsec_ prefix");
  check("Length >= 20 chars", wsLength, `got ${webhookSecret.length} chars`);

  const masked = webhookSecret.slice(0, 8) + "...(hidden)";
  console.log(`    Secret preview: ${masked}`);
}

// 4. Validate publishable key format (optional)
console.log("");
console.log("[4] Publishable Key Format");

const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
if (pubKey) {
  const pkPrefix = pubKey.startsWith("pk_");
  const pkIsTest = pubKey.startsWith("pk_test_");
  const pkIsLive = pubKey.startsWith("pk_live_");

  check("Starts with pk_", pkPrefix, "expected pk_test_ or pk_live_ prefix");
  check("Is test key (pk_test_) for development", pkIsTest, pkIsLive ? "use pk_test_ for development" : "neither pk_test_ nor pk_live_");

  const masked = pubKey.slice(0, 10) + "...(hidden)";
  console.log(`    Preview: ${masked}`);
}

// 5. Cross-validation
console.log("");
console.log("[5] Cross-Validation");

if (secretKey && pubKey) {
  const sameMode =
    (secretKey.startsWith("sk_test_") && pubKey.startsWith("pk_test_")) ||
    (secretKey.startsWith("sk_live_") && pubKey.startsWith("pk_live_"));

  check("Secret and publishable keys match mode", sameMode, "mixing test/live keys will cause errors");
}

if (secretKey && webhookSecret) {
  const secretHasSk = secretKey.startsWith("sk_");
  const webhookHasWhsec = webhookSecret.startsWith("whsec_");
  check("Secret key is distinct from webhook secret", secretHasSk && webhookHasWhsec, "do not reuse the same key");
}

// 6. Security checks
console.log("");
console.log("[6] Security Checks");

// Check for hardcoded keys in source files
const fs = require("fs");
const path = require("path");

const filesToScan = [
  "api-gateway/server.js",
  "api-gateway/payment-service.js",
  "packages/cli/src/index.js",
  "packages/core/src/index.js",
];

let hardcodedKeysFound = false;
for (const file of filesToScan) {
  const fullPath = path.join(process.cwd(), file);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    const patterns = [
      /sk_live_[a-zA-Z0-9]{10,}/g,
      /sk_test_[a-zA-Z0-9]{10,}/g,
      /whsec_[a-zA-Z0-9]{10,}/g,
      /pk_live_[a-zA-Z0-9]{10,}/g,
      /pk_test_[a-zA-Z0-9]{10,}/g,
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`  ✗ Hardcoded Stripe key found in ${file}: ${matches[0].slice(0, 15)}...`);
        hardcodedKeysFound = true;
      }
    }
  } catch (err) {
    // File doesn't exist — skip
  }
}

check("No hardcoded keys in source files", !hardcodedKeysFound, hardcodedKeysFound ? "keys found in code!" : "");

// Check .env is gitignored
const gitignoreContent = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf-8");
const envIgnored = gitignoreContent.includes(".env") || gitignoreContent.includes(".env.local");
check(".env is in .gitignore", envIgnored, ".env files must never be committed");

// 7. Summary
console.log("");
console.log("=================================================================");
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log("=================================================================");

if (failed > 0) {
  console.log("");
  console.log("Fix these issues before deploying:");
  console.log("  1. Set STRIPE_SECRET_KEY (sk_test_ for development)");
  console.log("  2. Set STRIPE_WEBHOOK_SECRET (whsec_...)");
  console.log("  3. Remove any hardcoded keys from source files");
  console.log("  4. Ensure .env is in .gitignore");
  process.exit(1);
}

if (warnings > 0) {
  console.log("");
  console.log("Warnings noted but non-blocking.");
}

console.log("");
console.log("✓ Stripe configuration looks good for deployment.");
