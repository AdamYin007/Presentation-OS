/**
 * Pack Runtime Context — builds an immutable runtime context for a loaded pack.
 *
 * Responsibilities:
 * - Combine manifest, resolved assets, and validation results into a single object.
 * - Freeze the context to prevent mutation.
 * - Include packId, packRoot, manifest, assets, validation, governance.
 *
 * Does NOT load or render anything. Pure data aggregation.
 */

/**
 * Build an immutable PackRuntimeContext.
 * @param {object} options
 * @param {string} options.packId - Pack identifier (from manifest.name).
 * @param {string} options.packRoot - Absolute path to pack root.
 * @param {object} options.manifest - Parsed pack.json manifest.
 * @param {object} options.assets - Resolved asset map from pack-asset-resolver.
 * @param {object} options.validation - Validation result from pack-validator.
 * @param {string} [options.manifestPath] - Absolute path to pack.json.
 * @returns {{ok: boolean, context?: object, error?: string, errorCode?: string}}
 */
function buildRuntimeContext(options) {
  var packId = options.packId;
  var packRoot = options.packRoot;
  var manifest = options.manifest;
  var assets = options.assets;
  var validation = options.validation;
  var manifestPath = options.manifestPath || null;

  if (!packId || !packRoot || !manifest || !assets) {
    return {
      ok: false,
      error: "Missing required fields for runtime context construction",
      errorCode: "VALIDATION_FAILED",
      details: {
        packId: packId,
        packRoot: packRoot,
        hasManifest: !!manifest,
        hasAssets: !!assets,
      },
    };
  }

  // Deep-freeze the manifest to prevent mutation
  var frozenManifest = deepFreeze(manifest);
  var frozenAssets = deepFreeze(assets);

  var context = Object.freeze({
    packId: packId,
    packRoot: packRoot,
    manifestPath: manifestPath,
    manifest: frozenManifest,
    assets: frozenAssets,
    validation: validation ? Object.freeze(validation) : null,
    governance: manifest.governance ? Object.freeze(manifest.governance) : null,
    runtime: manifest.runtime ? Object.freeze(manifest.runtime) : null,
  });

  return { ok: true, context: context };
}

/**
 * Deep-freeze an object recursively.
 * @param {*} obj - Object to freeze.
 * @returns {*} Frozen object.
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      obj[i] = deepFreeze(obj[i]);
    }
    return Object.freeze(obj);
  }
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) {
    obj[keys[k]] = deepFreeze(obj[keys[k]]);
  }
  return Object.freeze(obj);
}

module.exports = { buildRuntimeContext };
