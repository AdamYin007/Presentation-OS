/**
 * Pack Loader — central orchestrator for loading Presentation Packs.
 *
 * Implements the staged lifecycle from RFC-0007:
 *   Discover → Read manifest → Validate → Resolve assets → Build context → Register
 *
 * Responsibilities:
 * - Load a single pack by id or path.
 * - Load all discovered packs.
 * - Register loaded packs in the in-memory registry.
 *
 * Does NOT render. Does NOT import engines/adapters/planners.
 * Does NOT change --story or --pack-story behavior.
 */

var path = require("path");
var discovery = require("./pack-discovery");
var manifestReader = require("./pack-manifest-reader");
var existingValidator = require("./pack-validator");
var assetResolver = require("./pack-asset-resolver");
var runtimeContext = require("./pack-runtime-context");
var packRegistry = require("./pack-registry");

/**
 * Load a single pack by id or path.
 * @param {string} target - Pack id or directory path.
 * @param {object} [options] - Optional overrides.
 * @param {string} [options.packRoot] - Override pack root path.
 * @returns {{ok: boolean, context?: object, error?: string, errorCode?: string}}
 */
function loadPack(target, options) {
  options = options || {};

  // Step 1: Discover / locate pack
  var found = null;
  if (options.packRoot) {
    found = {
      packId: path.basename(options.packRoot),
      packRoot: path.resolve(options.packRoot),
    };
  } else {
    found = discovery.findPack(target);
    if (!found) {
      found = discovery.findPackByPath(target);
    }
  }

  if (!found) {
    return {
      ok: false,
      error: "Presentation Pack not found: " + target,
      errorCode: "PACK_NOT_FOUND",
    };
  }

  // Step 2: Read manifest
  var manifestResult = manifestReader.readManifest(found.packRoot);
  if (!manifestResult.ok) {
    return {
      ok: false,
      error: manifestResult.error,
      errorCode: manifestResult.errorCode,
    };
  }

  var manifest = manifestResult.manifest;
  var packId = manifest.name || found.packId;

  // Step 3: Validate manifest and assets (reuse existing validator)
  var validationResult = existingValidator.validatePack(found.packRoot);
  if (!validationResult.ok) {
    return {
      ok: false,
      error: "Pack validation failed: " + validationResult.errors.join("; "),
      errorCode: "VALIDATION_FAILED",
    };
  }

  // Step 4: Resolve declared assets
  var contents = manifest.contents || {};
  var assetResult = assetResolver.resolveAssets(found.packRoot, contents);
  if (!assetResult.ok) {
    return {
      ok: false,
      error: assetResult.error,
      errorCode: "ASSET_MISSING",
    };
  }

  // Step 5: Build immutable runtime context
  var contextResult = runtimeContext.buildRuntimeContext({
    packId: packId,
    packRoot: found.packRoot,
    manifest: manifest,
    assets: assetResult.assets,
    validation: validationResult,
    manifestPath: manifestResult.manifestPath,
  });

  if (!contextResult.ok) {
    return {
      ok: false,
      error: contextResult.error,
      errorCode: contextResult.errorCode,
    };
  }

  var context = contextResult.context;

  // Step 6: Register in memory
  var regResult = packRegistry.register(context);
  if (!regResult.ok) {
    return {
      ok: false,
      error: regResult.error,
      errorCode: regResult.errorCode,
    };
  }

  return { ok: true, context: context };
}

/**
 * Load all discovered packs into the registry.
 * @param {object} [options] - Options passed to loadPack.
 * @returns {{ok: boolean, contexts?: object[], error?: string, errorCode?: string}}
 */
function loadAllPacks(options) {
  options = options || {};

  // Clear registry before loading all
  packRegistry.clear();

  var discovered = discovery.discoverPacks();
  var contexts = [];
  var errors = [];

  for (var i = 0; i < discovered.length; i++) {
    var packInfo = discovered[i];
    var result = loadPack(packInfo.packId, {
      packRoot: packInfo.packRoot,
    });

    if (result.ok) {
      contexts.push(result.context);
    } else {
      errors.push(packInfo.packId + ": " + result.error);
    }
  }

  if (errors.length > 0 && contexts.length === 0) {
    return {
      ok: false,
      error: "Failed to load any packs: " + errors.join("; "),
      errorCode: "VALIDATION_FAILED",
    };
  }

  return { ok: true, contexts: contexts };
}

module.exports = { loadPack, loadAllPacks };
