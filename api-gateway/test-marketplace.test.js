/**
 * AWE Pack Marketplace — Test Suite
 */
"use strict";

const assert = require("assert");
const {
  listPacks,
  getPack,
  createPack,
  updatePack,
  submitForReview,
  approvePack,
  rejectPack,
  createTransaction,
  getAuthorEarnings,
  addReview,
  calculateCommission,
} = require("./marketplace");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log("=================================================================");
console.log("AWE Pack Marketplace Tests");
console.log("=================================================================");

test("createPack creates a new pack", () => {
  const pack = createPack(
    {
      name: "finance-compliance",
      description: "Financial compliance presentation templates",
      version: "1.0.0",
      type: "template",
      tags: ["finance", "compliance"],
      priceCents: 1500,
    },
    "author_123"
  );

  assert(pack.id.startsWith("pack_"));
  assert(pack.name === "finance-compliance");
  assert(pack.status === "draft");
});

test("getPack retrieves existing pack", () => {
  const pack = createPack(
    {
      name: "legal-templates",
      description: "Legal presentation templates",
      version: "1.0.0",
      type: "template",
      tags: ["legal"],
      priceCents: 2000,
    },
    "author_456"
  );

  const retrieved = getPack(pack.id);
  assert(retrieved && retrieved.name === "legal-templates");
});

test("getPack returns null for non-existent pack", () => {
  assert(getPack("nonexistent") === null);
});

test("listPacks filters by type", () => {
  createPack(
    { name: "template-a", description: "desc", type: "template", tags: [], priceCents: 0 },
    "author_1"
  );
  createPack(
    { name: "engine-b", description: "desc", type: "engine", tags: [], priceCents: 0 },
    "author_2"
  );

  const templates = listPacks({ type: "template" });
  assert(templates.length >= 1);
  assert(templates.every((p) => p.type === "template"));
});

test("listPacks filters by search query", () => {
  createPack(
    {
      name: "search-test-pack",
      description: "marketing templates",
      type: "template",
      tags: ["marketing"],
      priceCents: 0,
    },
    "author_3"
  );

  const results = listPacks({ search: "marketing" });
  assert(results.some((p) => p.name === "search-test-pack"));
});

test("updatePack modifies pack fields", () => {
  const pack = createPack(
    { name: "update-test", description: "original", type: "template", tags: [], priceCents: 0 },
    "author_4"
  );

  const updated = updatePack(pack.id, {
    description: "updated description",
    priceCents: 999,
  });
  assert(updated.description === "updated description");
  assert(updated.priceCents === 999);
});

test("approvePack publishes the pack", async () => {
  const pack = createPack(
    { name: "approve-test", description: "approved pack", type: "template", tags: [], priceCents: 750 },
    "author_6"
  );

  const approved = await approvePack(pack.id, "reviewer_1");
  assert(approved.ok === true);
  assert(approved.pack.status === "published");
  assert(approved.pack.reviewedBy === "reviewer_1");
});

test("rejectPack sets rejection reason", async () => {
  const pack = createPack(
    { name: "reject-test", description: "rejected pack", type: "template", tags: [], priceCents: 0 },
    "author_7"
  );

  const rejected = await rejectPack(pack.id, "reviewer_2", "Missing documentation");
  assert(rejected.ok === true);
  assert(rejected.pack.status === "rejected");
  assert(rejected.pack.reviewReason === "Missing documentation");
});

test("calculateCommission computes correct split", () => {
  const commission = calculateCommission(2000); // $20.00

  assert(commission.total === 2000);
  assert(commission.commission === 600); // 30%
  assert(commission.authorEarnings === 1400); // 70%
});

test("addReview updates pack rating", () => {
  const pack = createPack(
    { name: "review-pack", description: "pack with reviews", type: "template", tags: [], priceCents: 1000 },
    "author_8"
  );

  const r1 = addReview(pack.id, "user_1", 5, "Great pack!");
  assert(r1.ok === true);
  assert(r1.rating === 5.0);

  const r2 = addReview(pack.id, "user_2", 3, "Okay pack");
  assert(r2.ok === true);
  assert(r2.rating === 4.0);
});

test("addReview rejects invalid rating", () => {
  const pack = createPack(
    { name: "bad-review-pack", description: "test", type: "template", tags: [], priceCents: 0 },
    "author_9"
  );

  const result = addReview(pack.id, "user_3", 6, "Invalid rating");
  assert(result.ok === false);
});

test("createTransaction records purchase and updates downloads", () => {
  const pack = createPack(
    { name: "txn-test-pack", description: "test", type: "template", tags: [], priceCents: 1500 },
    "author_10"
  );

  const result = createTransaction(pack.id, "buyer_1", 1500);
  assert(result.ok === true);
  assert(result.transaction.amountCents === 1500);
  assert(result.transaction.commissionCents === 450);
  assert(result.transaction.authorEarningsCents === 1050);
  assert(pack.downloads === 1);
});

test("getAuthorEarnings calculates totals", () => {
  const pack = createPack(
    { name: "earnings-test", description: "test", type: "template", tags: [], priceCents: 2000 },
    "author_11"
  );

  createTransaction(pack.id, "buyer_1", 2000);
  createTransaction(pack.id, "buyer_2", 2000);

  const earnings = getAuthorEarnings("author_11");
  assert(earnings.totalTransactions === 2);
  assert(earnings.totalEarningsCents === 2800); // 70% of $40
  assert(earnings.totalCommissionCents === 1200); // 30% of $40
});

console.log("");
console.log("=================================================================");
console.log(`Results: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
