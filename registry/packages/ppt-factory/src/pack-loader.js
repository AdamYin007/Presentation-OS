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
 * - Propagate structured errors with errorCode and details.
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
 * Normalize a structured error result to the standard shape.
 * Preserves ok:true results unchanged.
 * @param {{ok: boolean, [key]: *}} result
 * @returns {{ok: boolean, [key]: *}}
 */
function normalizeError(result) {
  if (result.ok) return result;
  if (!result.errorCode) {
    return Object.assign({}, result, { errorCode: "PACK_LOAD_FAILED" });
  }
  if (!result.details) {
    result.details = {};
  }
  return result;
}

/**
 * Check if a directory exists (even if it's not a valid pack root).
 * Used to distinguish "directory not found" from "directory found but no pack.json".
 * @param {string} dirPath - Directory path to check.
 * @returns {boolean}
 */
function directoryExists(dirPath) {
  try {
    return require("fs").existsSync(dirPath) && require("fs").statSync(dirPath).isDirectory();
  } catch (e) {
    return false;
  }
}

/**
 * Load a single pack by id or path.
 * @param {string} target - Pack id or directory path.
 * @param {object} [options] - Optional overrides.
 * @param {string} [options.packRoot] - Override pack root path.
 * @returns {{ok: boolean, context?: object, error?: string, errorCode?: string, details?: object|null}}
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
    // Distinguish between "path doesn't exist" (PACK_NOT_FOUND)
    // and "path exists but no pack.json" (MANIFEST_MISSING)
    var resolvedTarget = path.resolve(target);
    if (directoryExists(resolvedTarget)) {
      return {
        ok: false,
        error: "pack.json not found in: " + resolvedTarget,
        errorCode: "MANIFEST_MISSING",
        details: {
          target: target,
          packRoot: resolvedTarget,
          manifestPath: path.join(resolvedTarget, "pack.json"),
        },
      };
    }
    return {
      ok: false,
      error: "Presentation Pack not found: " + target,
      errorCode: "PACK_NOT_FOUND",
      details: {
        target: target,
      },
    };
  }

  // Step 2: Read manifest
  var manifestResult = manifestReader.readManifest(found.packRoot);
  if (!manifestResult.ok) {
    return normalizeError({
      ok: false,
      error: manifestResult.error,
      errorCode: manifestResult.errorCode,
      details: manifestResult.details || manifestResult.manifestPath ? {
        packRoot: manifestResult.packRoot,
        manifestPath: manifestResult.manifestPath,
      } : null,
    });
  }

  var manifest = manifestResult.manifest;
  var packId = manifest.name || found.packId;

  // Step 3: Validate manifest and assets (reuse existing validator)
  var validationResult = existingValidator.validatePack(found.packRoot);
  if (!validationResult.ok) {
    // Map validator errors to specific error codes
    var combinedErrors = validationResult.errors.join("; ");
    var mappedCode = "VALIDATION_FAILED";
    var mappedDetails = {
      packRoot: found.packRoot,
      warnings: validationResult.warnings || [],
    };

    // Check for asset safety errors
    if (/path traversal|absolute path|outside pack root|not allowed/i.test(combinedErrors)) {
      mappedCode = "ASSET_UNSAFE_PATH";
      mappedDetails.validationError = combinedErrors;
    }
    // Check for missing asset errors
    else if (/Asset not found/i.test(combinedErrors)) {
      mappedCode = "ASSET_MISSING";
      mappedDetails.validationError = combinedErrors;
    }

    return {
      ok: false,
      error: "Pack validation failed: " + combinedErrors,
      errorCode: mappedCode,
      details: mappedDetails,
    };
  }

  // Step 4: Resolve declared assets
  var contents = manifest.contents || {};
  var assetResult = assetResolver.resolveAssets(found.packRoot, contents);
  if (!assetResult.ok) {
    return normalizeError(assetResult);
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
    return normalizeError(contextResult);
  }

  var context = contextResult.context;

  // Step 6: Register in memory
  var regResult = packRegistry.register(context);
  if (!regResult.ok) {
    return normalizeError(regResult);
  }

  return { ok: true, context: context };
}

/**
 * Load all discovered packs into the registry.
 * Partial success is allowed: returns ok:true if at least one pack loaded.
 * @param {object} [options] - Options passed to loadPack.
 * @returns {{ok: boolean, contexts?: object[], error?: string, errorCode?: string, details?: object|null}}
 */
function loadAllPacks(options) {
  options = options || {};

  // Clear registry before loading all
  packRegistry.clear();

  var discoverResult = discovery.discoverPacksWithError();
  if (!discoverResult.ok) {
    return normalizeError(discoverResult);
  }

  var discovered = discoverResult.packs || discovery.discoverPacks();
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
      errorCode: "PACK_LOAD_FAILED",
      details: {
        failedPacks: errors,
      },
    };
  }

  return { ok: true, contexts: contexts };
}

module.exports = { loadPack, loadAllPacks };