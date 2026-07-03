/**
 * Pack Registry — in-memory registry for loaded pack runtime contexts.
 *
 * Responsibilities:
 * - Register loaded pack contexts.
 * - Lookup by pack id.
 * - List registered packs.
 * - Clear registry (useful for testing).
 *
 * Does NOT mutate files. Pure in-memory store.
 */

// Module-level singleton registry
var _registry = {};

/**
 * Register a pack runtime context in the in-memory registry.
 * @param {object} context - PackRuntimeContext from pack-runtime-context.
 * @returns {{ok: boolean, error?: string, errorCode?: string}}
 */
function register(context) {
  if (!context || !context.packId) {
    return {
      ok: false,
      error: "Context must have a packId",
      errorCode: "VALIDATION_FAILED",
    };
  }

  if (_registry[context.packId]) {
    return {
      ok: false,
      error: "Duplicate pack id in registry: " + context.packId,
      errorCode: "DUPLICATE_PACK_ID",
      details: {
        packId: context.packId,
      },
    };
  }

  _registry[context.packId] = context;
  return { ok: true };
}

/**
 * Lookup a pack context by id.
 * @param {string} packId - Pack identifier.
 * @returns {object|null} PackRuntimeContext or null if not found.
 */
function lookup(packId) {
  return _registry[packId] || null;
}

/**
 * List all registered pack ids.
 * @returns {string[]} Array of pack ids.
 */
function listIds() {
  return Object.keys(_registry);
}

/**
 * List all registered pack contexts.
 * @returns {object[]} Array of PackRuntimeContext objects.
 */
function listAll() {
  var ids = Object.keys(_registry);
  var contexts = [];
  for (var i = 0; i < ids.length; i++) {
    contexts.push(_registry[ids[i]]);
  }
  return contexts;
}

/**
 * Clear the entire registry. Useful for testing or repeated CLI runs.
 */
function clear() {
  _registry = {};
}

/**
 * Check if a pack is registered.
 * @param {string} packId - Pack identifier.
 * @returns {boolean}
 */
function has(packId) {
  return packId in _registry;
}

module.exports = {
  register,
  lookup,
  listIds,
  listAll,
  clear,
  has,
};
