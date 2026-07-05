/**
 * Pack Inspection — inspects a loaded pack's runtime context.
 *
 * Responsibilities:
 * - Load and validate a pack.
 * - Return structured inspection data for CLI consumption.
 * - Preserve error codes from loader for CLI error mapping.
 * - Derive visible result from normalized PackRuntimeContext (M7.2).
 *
 * Does NOT render or modify anything. Read-only inspection.
 *
 * M7.2 hardening: Internal derivation from normalized PackRuntimeContext
 * sections (governance, runtime, boundaries, sourceOfTruth).
 * CLI visible output format is NOT changed — only internal derivation improves.
 */

var path = require("path");
var discovery = require("./pack-discovery");
var loader = require("./pack-loader");

/**
 * Inspect a pack by id or path.
 * @param {string} target - Pack id or directory path.
 * @returns {{ok: boolean, result?: object, error?: string, errorCode?: string, details?: object|null}}
 */
function inspectPack(target) {
  // Try to find the pack
  var found = discovery.findPack(target);
  if (!found) {
    // Maybe it's a direct path
    var candidatePath = path.resolve(target);
    found = discovery.findPackByPath(candidatePath);
  }

  if (!found) {
    return {
      ok: false,
      error: "Presentation Pack not found: " + target,
      errorCode: "PACK_NOT_FOUND",
      details: {
        target: target,
      },
    };
  }

  // Load the pack via loader
  var loadResult = loader.loadPack(found.packId, {
    packRoot: found.packRoot,
  });

  if (!loadResult.ok) {
    // Preserve error code and details from loader
    return {
      ok: false,
      error: loadResult.error,
      errorCode: loadResult.errorCode,
      details: loadResult.details || null,
    };
  }

  var ctx = loadResult.context;
  var manifest = ctx.manifest;
  var contents = manifest.contents || {};

  // M7.2: Derive inspection result from normalized PackRuntimeContext sections.
  // The normalized sections are internal-only and not printed by CLI.
  // We use them for internal consistency but keep CLI-visible output unchanged.
  var normGovernance = ctx.governance || {};
  var normRuntime = ctx.runtime || {};

  // Build inspection result — CLI-visible fields remain identical to pre-M7.2
  var result = {
    packId: ctx.packId,
    name: manifest.name || ctx.packId,
    displayName: manifest.displayName || "",
    version: manifest.version || "",
    status: manifest.status || "",
    path: ctx.packRoot,
    validation: ctx.validation ? (ctx.validation.ok ? "passed" : "failed") : "unknown",
    assets: {},
    runtime: {
      loadedByDefault: normRuntime.loadedByDefault || false,
      requiresPackLoader: normRuntime.requiresPackLoader || true,
    },
    governance: {
      coreChangesAllowed: normGovernance.coreChangesAllowed || false,
      migrationMode: normGovernance.migrationMode || "copy-first",
    },
  };

  // M7.2: Internal-only fields (not printed by CLI)
  // These are available on the result object for programmatic inspection
  // but are deliberately not formatted in --inspect-pack output.
  if (ctx.boundaries) {
    result._boundaries = ctx.boundaries;
  }
  if (ctx.sourceOfTruth) {
    result._sourceOfTruth = ctx.sourceOfTruth;
  }
  if (ctx.outputPolicy) {
    result._outputPolicy = ctx.outputPolicy;
  }

  // Summarize asset groups
  var assetGroups = ["stories", "heroSequences", "terminology", "references", "content", "planners", "adapters", "themes", "examples"];
  for (var i = 0; i < assetGroups.length; i++) {
    var group = assetGroups[i];
    var entries = contents[group] || [];
    result.assets[group] = entries.map(function(e) { return e; });
  }

  return { ok: true, result: result };
}

module.exports = { inspectPack };
