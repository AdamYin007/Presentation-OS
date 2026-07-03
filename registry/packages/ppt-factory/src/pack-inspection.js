/**
 * Pack Inspection — inspects a loaded pack's runtime context.
 *
 * Responsibilities:
 * - Load and validate a pack.
 * - Return structured inspection data for CLI consumption.
 *
 * Does NOT render or modify anything. Read-only inspection.
 */

var path = require("path");
var discovery = require("./pack-discovery");
var loader = require("./pack-loader");

/**
 * Inspect a pack by id or path.
 * @param {string} target - Pack id or directory path.
 * @returns {{ok: boolean, result?: object, error?: string, errorCode?: string}}
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
    };
  }

  // Load the pack via loader
  var loadResult = loader.loadPack(found.packId, {
    packRoot: found.packRoot,
  });

  if (!loadResult.ok) {
    return {
      ok: false,
      error: loadResult.error,
      errorCode: loadResult.errorCode,
    };
  }

  var ctx = loadResult.context;
  var manifest = ctx.manifest;
  var contents = manifest.contents || {};

  // Build inspection result
  var result = {
    packId: ctx.packId,
    name: manifest.name || ctx.packId,
    displayName: manifest.displayName || "",
    version: manifest.version || "",
    status: manifest.status || "",
    path: ctx.packRoot,
    validation: ctx.validation ? (ctx.validation.ok ? "passed" : "failed") : "unknown",
    assets: {},
    runtime: ctx.runtime || {},
    governance: ctx.governance || {},
  };

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
