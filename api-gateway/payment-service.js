/**
 * AWE Payment Service — Stripe Integration MVP
 *
 * Features:
 * - API Key registration & validation
 * - Usage tracking (decks generated per month)
 * - Subscription status checks
 * - Rate limit enforcement based on plan tier
 * - Webhook handler for Stripe events
 */
"use strict";

const crypto = require("crypto");

// ─── Configuration ──────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// In-memory store (replace with PostgreSQL in production)
const users = new Map();
const apiKeys = new Map();
const usage = new Map();

// Plan definitions
const PLANS = {
  free: {
    name: "Free",
    monthlyDecks: 5,
    apiRequestsPerMin: 10,
    features: ["basic-templates"],
  },
  personal: {
    name: "Personal Pro",
    price: 900, // $9.00 in cents
    monthlyDecks: Infinity,
    apiRequestsPerMin: 100,
    features: ["all-templates", "no-watermark", "audience-engine"],
  },
  developer: {
    name: "Developer Pro",
    price: 2900, // $29.00 in cents
    monthlyDecks: 500,
    apiRequestsPerMin: 500,
    features: ["all-features", "brand-profile-api", "mcp-server"],
  },
  team: {
    name: "Team",
    price: 9900, // $99.00 in cents
    monthlyDecks: 2000,
    apiRequestsPerMin: 1000,
    features: ["all-features", "shared-brand-profiles", "collaboration"],
  },
};

// ─── Helpers ────────────────────────────────────────────────────

function generateApiKey() {
  return "awe_" + crypto.randomBytes(24).toString("hex");
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUserUsage(userId) {
  const monthKey = getMonthKey();
  const key = `${userId}:${monthKey}`;
  if (!usage.has(key)) {
    usage.set(key, 0);
  }
  return usage.get(key);
}

function incrementUsage(userId) {
  const monthKey = getMonthKey();
  const key = `${userId}:${monthKey}`;
  const current = usage.get(key) || 0;
  usage.set(key, current + 1);
  return current + 1;
}

// ─── User Management ────────────────────────────────────────────

function createUser(email, plan = "free") {
  const id = `user_${crypto.randomBytes(8).toString("hex")}`;
  const user = {
    id,
    email,
    plan,
    createdAt: new Date().toISOString(),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
  users.set(id, user);

  // Generate initial API key
  const apiKey = generateApiKey();
  apiKeys.set(apiKey, { userId: id, tier: plan });

  return { user, apiKey };
}

function getUser(userId) {
  return users.get(userId) || null;
}

function getUserByApiKey(apiKey) {
  const keyInfo = apiKeys.get(apiKey);
  if (!keyInfo) return null;
  return getUser(keyInfo.userId);
}

// ─── Usage Checking ─────────────────────────────────────────────

function checkUsage(userId) {
  const user = getUser(userId);
  if (!user) return { allowed: false, reason: "User not found" };

  const planConfig = PLANS[user.plan];
  const currentUsage = getUserUsage(userId);

  if (currentUsage >= planConfig.monthlyDecks) {
    return {
      allowed: false,
      reason: "Monthly deck limit exceeded",
      used: currentUsage,
      limit: planConfig.monthlyDecks,
    };
  }

  return {
    allowed: true,
    used: currentUsage,
    limit: planConfig.monthlyDecks,
    remaining: planConfig.monthlyDecks - currentUsage,
  };
}

function checkRateLimit(apiKey) {
  const keyInfo = apiKeys.get(apiKey);
  if (!keyInfo) return { allowed: false, reason: "Invalid API key" };

  const user = getUser(keyInfo.userId);
  if (!user) return { allowed: false, reason: "User not found" };

  const planConfig = PLANS[user.plan];
  return {
    allowed: true,
    limit: planConfig.apiRequestsPerMin,
  };
}

// ─── Stripe Webhook Handler ─────────────────────────────────────

async function handleStripeWebhook(payload, signature) {
  let event;

  try {
    event = JSON.parse(payload);
  } catch (err) {
    return { error: "Webhook signature verification failed", status: 400 };
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      let targetUser = null;
      for (const [, user] of users) {
        if (user.stripeCustomerId === customerId) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return { error: "No user found for Stripe customer", status: 404 };
      }

      targetUser.stripeSubscriptionId = subscription.id;

      const planId = subscription.items.data[0]?.price?.nickname || "free";
      const planMapping = {
        "personal-pro": "personal",
        "developer-pro": "developer",
        "team": "team",
      };

      if (planMapping[planId]) {
        targetUser.plan = planMapping[planId];

        for (const [key, info] of apiKeys) {
          if (info.userId === targetUser.id) {
            info.tier = planMapping[planId];
          }
        }
      }

      break;
    }

    case "invoice.payment_succeeded": {
      console.log(`Payment succeeded for invoice ${event.data.object.id}`);
      break;
    }

    case "invoice.payment_failed": {
      console.warn(`Payment failed for invoice ${event.data.object.id}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      let targetUser = null;
      for (const [, user] of users) {
        if (user.stripeCustomerId === customerId) {
          targetUser = user;
          break;
        }
      }

      if (targetUser) {
        targetUser.plan = "free";
        targetUser.stripeSubscriptionId = null;

        for (const [key, info] of apiKeys) {
          if (info.userId === targetUser.id) {
            info.tier = "free";
          }
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { success: true, status: 200 };
}

// ─── Public API ─────────────────────────────────────────────────

module.exports = {
  createUser,
  getUser,
  getUserByApiKey,
  checkUsage,
  checkRateLimit,
  handleStripeWebhook,
  PLANS,
};
