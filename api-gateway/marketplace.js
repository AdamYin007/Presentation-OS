/**
 * AWE Pack Marketplace — Backend MVP
 *
 * Features:
 * - Pack listing & search
 * - Pack publishing workflow
 * - Transaction tracking with 30% commission
 * - Pack validation before publishing
 * - Ownership & royalty management
 */
"use strict";

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// ─── Configuration ──────────────────────────────────────────────

const COMMISSION_RATE = 0.30; // AWE takes 30% commission
const PACKS_DIR = process.env.AWE_PACKS_DIR || path.join(process.cwd(), "registry", "packages");

// In-memory store (replace with PostgreSQL in production)
const packs = new Map();
const transactions = new Map();
const reviews = new Map();

// ─── Helpers ────────────────────────────────────────────────────

function generateId(prefix = "pack") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function calculateCommission(priceCents) {
  const commission = Math.ceil(priceCents * COMMISSION_RATE);
  return {
    total: priceCents,
    commission: commission,
    authorEarnings: priceCents - commission,
  };
}

// ─── Pack CRUD ──────────────────────────────────────────────────

function listPacks(options = {}) {
  let allPacks = Array.from(packs.values());

  if (options.type) {
    allPacks = allPacks.filter((p) => p.type === options.type);
  }

  if (options.search) {
    const query = options.search.toLowerCase();
    allPacks = allPacks.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return allPacks.sort((a, b) => b.createdAt - a.createdAt);
}

function getPack(packId) {
  return packs.get(packId) || null;
}

function createPack(manifest, authorId) {
  const packId = generateId("pack");
  const now = Date.now();

  const pack = {
    id: packId,
    name: manifest.name,
    description: manifest.description || "",
    version: manifest.version || "1.0.0",
    type: manifest.type || "template",
    tags: manifest.tags || [],
    priceCents: manifest.priceCents || 0,
    authorId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    downloads: 0,
    rating: 0,
    reviewCount: 0,
  };

  packs.set(packId, pack);
  return pack;
}

function updatePack(packId, updates) {
  const pack = packs.get(packId);
  if (!pack) return null;

  Object.assign(pack, updates, { updatedAt: Date.now() });
  return pack;
}

function deletePack(packId, authorId) {
  const pack = packs.get(packId);
  if (!pack) return false;
  if (pack.authorId !== authorId) return false;

  packs.delete(packId);
  return true;
}

// ─── Publishing Workflow ────────────────────────────────────────

async function submitForReview(packId, publisher) {
  const pack = packs.get(packId);
  if (!pack) return { ok: false, error: "Pack not found" };

  if (!pack.name || !pack.description) {
    return { ok: false, error: "Missing required fields: name, description" };
  }

  const packDir = path.join(PACKS_DIR, pack.name);
  const packJsonPath = path.join(packDir, "pack.json");

  if (!fs.existsSync(packJsonPath)) {
    return {
      ok: false,
      error: `pack.json not found at ${packJsonPath}`,
      errorCode: "MANIFEST_MISSING",
    };
  }

  try {
    const manifestContent = fs.readFileSync(packJsonPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    if (manifest.type !== pack.type) {
      return {
        ok: false,
        error: `Manifest type mismatch: expected ${pack.type}, got ${manifest.type}`,
        errorCode: "MANIFEST_MISMATCH",
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to read pack.json: ${err.message}`,
      errorCode: "MANIFEST_READ_ERROR",
    };
  }

  pack.status = "pending_review";
  pack.reviewedBy = null;
  pack.reviewedAt = null;
  pack.updatedAt = Date.now();

  return { ok: true, pack };
}

async function approvePack(packId, reviewer) {
  const pack = packs.get(packId);
  if (!pack) return { ok: false, error: "Pack not found" };

  pack.status = "published";
  pack.reviewedBy = reviewer;
  pack.reviewedAt = Date.now();
  pack.updatedAt = Date.now();

  return { ok: true, pack };
}

async function rejectPack(packId, reviewer, reason) {
  const pack = packs.get(packId);
  if (!pack) return { ok: false, error: "Pack not found" };

  pack.status = "rejected";
  pack.reviewReason = reason;
  pack.reviewedBy = reviewer;
  pack.reviewedAt = Date.now();
  pack.updatedAt = Date.now();

  return { ok: true, pack };
}

// ─── Transactions ───────────────────────────────────────────────

function createTransaction(packId, buyerId, amountCents) {
  const pack = packs.get(packId);
  if (!pack) return { ok: false, error: "Pack not found" };

  const txnId = generateId("txn");
  const commission = calculateCommission(amountCents);

  const transaction = {
    id: txnId,
    packId,
    buyerId,
    sellerId: pack.authorId,
    amountCents: amountCents,
    commissionCents: commission.commission,
    authorEarningsCents: commission.authorEarnings,
    status: "completed",
    createdAt: Date.now(),
  };

  transactions.set(txnId, transaction);

  pack.downloads += 1;
  pack.updatedAt = Date.now();

  return { ok: true, transaction, commission };
}

function getTransactions(authorId, options = {}) {
  let txns = Array.from(transactions.values()).filter(
    (t) => t.sellerId === authorId
  );

  if (options.packId) {
    txns = txns.filter((t) => t.packId === options.packId);
  }

  return txns.sort((a, b) => b.createdAt - a.createdAt);
}

function getAuthorEarnings(authorId) {
  const txns = getTransactions(authorId);
  const totalEarnings = txns.reduce((sum, t) => sum + t.authorEarningsCents, 0);
  const totalCommission = txns.reduce((sum, t) => sum + t.commissionCents, 0);

  return {
    authorId,
    totalTransactions: txns.length,
    totalEarningsCents: totalEarnings,
    totalCommissionCents: totalCommission,
    currency: "USD",
  };
}

// ─── Reviews ────────────────────────────────────────────────────

function addReview(packId, userId, rating, comment) {
  const pack = packs.get(packId);
  if (!pack) return { ok: false, error: "Pack not found" };

  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be between 1 and 5" };
  }

  const reviewId = generateId("rev");
  const review = {
    id: reviewId,
    packId,
    userId,
    rating,
    comment: comment || "",
    createdAt: Date.now(),
  };

  reviews.set(reviewId, review);

  const packReviews = Array.from(reviews.values()).filter((r) => r.packId === packId);
  const avgRating = packReviews.reduce((sum, r) => sum + r.rating, 0) / packReviews.length;
  pack.rating = Math.round(avgRating * 10) / 10;
  pack.reviewCount = packReviews.length;
  pack.updatedAt = Date.now();

  return { ok: true, review, rating: pack.rating };
}

// ─── Public API ─────────────────────────────────────────────────

module.exports = {
  listPacks,
  getPack,
  createPack,
  updatePack,
  deletePack,
  submitForReview,
  approvePack,
  rejectPack,
  createTransaction,
  getTransactions,
  getAuthorEarnings,
  calculateCommission,
  addReview,
  COMMISSION_RATE,
};
