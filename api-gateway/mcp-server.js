/**
 * AWE MCP Server — Multi-Agent Integration MVP
 *
 * Supports: Claude, Codex, GitHub Copilot, Hermes, OpenClaw
 *
 * Features:
 * - Model-agnostic transport layer (stdio / HTTP)
 * - Per-model capability routing
 * - Presentation generation tool
 * - Pack management tool
 * - Audience Engine integration
 * - Usage tracking per model/client
 */
"use strict";

const crypto = require("crypto");

// ─── Configuration ──────────────────────────────────────────────

const MCP_PORT = parseInt(process.env.MCP_PORT || "8765", 10);
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || "stdio"; // stdio | http

// ─── Supported Models ──────────────────────────────────────────

const SUPPORTED_MODELS = {
  claude: {
    name: "Claude",
    provider: "anthropic",
    capabilities: ["text-generation", "code-generation", "image-analysis"],
    maxTokens: 200000,
    tools: ["generate-presentation", "list-packs", "search-packs", "adapt-audience"],
  },
  codex: {
    name: "Codex",
    provider: "openai",
    capabilities: ["text-generation", "code-generation", "file-editing"],
    maxTokens: 100000,
    tools: ["generate-presentation", "list-packs", "search-packs", "adapt-audience"],
  },
  copilot: {
    name: "GitHub Copilot",
    provider: "github",
    capabilities: ["code-completion", "chat", "inline-edit"],
    maxTokens: 128000,
    tools: ["generate-presentation", "list-packs", "search-packs"],
  },
  hermes: {
    name: "Hermes Agent",
    provider: "nousresearch",
    capabilities: ["task-automation", "multi-agent", "tool-use"],
    maxTokens: 100000,
    tools: ["generate-presentation", "list-packs", "search-packs", "adapt-audience", "run-pipeline"],
  },
  openclaw: {
    name: "OpenClaw",
    provider: "openclaw",
    capabilities: ["text-generation", "code-generation", "plugin-system"],
    maxTokens: 100000,
    tools: ["generate-presentation", "list-packs", "search-packs", "adapt-audience"],
  },
};

// ─── In-memory Store ──────────────────────────────────────────

const clients = new Map();
const sessions = new Map();
const usage = new Map();

// ─── Helpers ────────────────────────────────────────────────────

function generateId(prefix = "mcp") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function getClient(clientId) {
  return clients.get(clientId) || null;
}

function registerClient(clientId, model, metadata = {}) {
  const client = {
    id: clientId,
    model,
    metadata,
    registeredAt: Date.now(),
    lastActive: Date.now(),
  };

  clients.set(clientId, client);
  return client;
}

// ─── Tool Handlers ──────────────────────────────────────────────

async function generatePresentation(input, options = {}, clientId) {
  // Validate input
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return {
      ok: false,
      error: "Invalid input: markdown content is required",
      errorCode: "INVALID_INPUT",
    };
  }

  // Check model capabilities
  const client = getClient(clientId);
  if (!client) {
    return { ok: false, error: "Client not found", errorCode: "CLIENT_NOT_FOUND" };
  }

  const modelConfig = SUPPORTED_MODELS[client.model];
  if (!modelConfig) {
    return { ok: false, error: `Unsupported model: ${client.model}`, errorCode: "UNSUPPORTED_MODEL" };
  }

  if (!modelConfig.tools.includes("generate-presentation")) {
    return {
      ok: false,
      error: `Model ${client.model} does not support generate-presentation tool`,
      errorCode: "TOOL_NOT_AVAILABLE",
    };
  }

  // Track usage
  const usageKey = `${clientId}:${new Date().toISOString().slice(0, 7)}`;
  const currentUsage = (usage.get(usageKey) || 0) + 1;
  usage.set(usageKey, currentUsage);

  // Simulate presentation generation (in production, call runPipeline)
  const slideCount = Math.max(1, Math.ceil(input.split("\n## ").length));

  return {
    ok: true,
    data: {
      presentationId: generateId("pres"),
      slideCount,
      model: client.model,
      options,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function listPacks(options = {}, clientId) {
  const client = getClient(clientId);
  if (!client) {
    return { ok: false, error: "Client not found" };
  }

  // Simulate pack listing (in production, query marketplace)
  const packs = [
    {
      id: "digital-pathology",
      name: "Digital Pathology",
      description: "Medical presentation templates for pathology",
      version: "1.0.0",
      type: "template",
      priceCents: 0,
      tags: ["medical", "pathology"],
    },
    {
      id: "finance-compliance",
      name: "Finance Compliance",
      description: "Regulatory compliance presentation templates",
      version: "1.0.0",
      type: "template",
      priceCents: 1500,
      tags: ["finance", "compliance"],
    },
    {
      id: "legal-contracts",
      name: "Legal Contracts",
      description: "Contract review and legal analysis templates",
      version: "1.0.0",
      type: "template",
      priceCents: 2000,
      tags: ["legal", "contracts"],
    },
  ];

  return {
    ok: true,
    data: packs,
    total: packs.length,
  };
}

async function searchPacks(query, options = {}, clientId) {
  const client = getClient(clientId);
  if (!client) {
    return { ok: false, error: "Client not found" };
  }

  // Simulate search (in production, query marketplace with filters)
  const allPacks = await listPacks(options, clientId);
  const results = allPacks.data.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return {
    ok: true,
    data: results,
    total: results.length,
  };
}

async function adaptAudience(speakerProfile, audienceRole, options = {}, clientId) {
  const client = getClient(clientId);
  if (!client) {
    return { ok: false, error: "Client not found" };
  }

  // Simulate audience adaptation (in production, call Audience Engine)
  const adaptations = {
    executive_board: {
      titleDepth: 2,
      terminologyLevel: "strategic",
      visualPriority: ["key_metrics", "outcomes", "risk"],
      detailThreshold: 0.3,
    },
    manager_engineers: {
      titleDepth: 3,
      terminologyLevel: "technical",
      visualPriority: ["process", "metrics", "timeline"],
      detailThreshold: 0.5,
    },
    student_classroom: {
      titleDepth: 4,
      terminologyLevel: "educational",
      visualPriority: ["examples", "diagrams", "key_concepts"],
      detailThreshold: 0.7,
    },
  };

  const key = `${speakerProfile}_${audienceRole}`;
  const adaptation = adaptations[key] || adaptations.executive_board;

  return {
    ok: true,
    data: {
      speakerProfile,
      audienceRole,
      adaptations: adaptation,
      model: client.model,
    },
  };
}

// ─── Session Management ────────────────────────────────────────

async function createSession(clientId, model) {
  const sessionId = generateId("session");
  const session = {
    id: sessionId,
    clientId,
    model,
    createdAt: Date.now(),
    lastActive: Date.now(),
    messageCount: 0,
  };

  sessions.set(sessionId, session);
  return session;
}

async function endSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, error: "Session not found" };

  sessions.delete(sessionId);
  return { ok: true, messageCount: session.messageCount };
}

// ─── Usage Stats ────────────────────────────────────────────────

function getUsageStats(clientId) {
  const client = getClient(clientId);
  if (!client) return { error: "Client not found" };

  let totalRequests = 0;
  for (const [key, value] of usage) {
    if (key.startsWith(`${clientId}:`)) {
      totalRequests += value;
    }
  }

  return {
    clientId,
    model: client.model,
    totalRequests,
    registeredAt: client.registeredAt,
    lastActive: client.lastActive,
  };
}

// ─── Public API ─────────────────────────────────────────────────

module.exports = {
  // Client management
  registerClient,
  getClient,

  // Tool handlers
  generatePresentation,
  listPacks,
  searchPacks,
  adaptAudience,

  // Session management
  createSession,
  endSession,

  // Usage stats
  getUsageStats,

  // Config
  SUPPORTED_MODELS,
  MCP_PORT,
  MCP_TRANSPORT,
};
