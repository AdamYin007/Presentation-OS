/**
 * Pack Asset Resolver — resolves declared asset paths from pack manifest.
 *
 * Responsibilities:
 * - Resolve declared asset paths from pack manifest contents.
 * - Ensure resolved paths stay inside pack root.
 * - Reject absolute paths and path traversal.
 * - Confirm file existence for declared assets.
 * - Return normalized asset map.
 *
 * Does NOT validate schema or required fields.
 * Does NOT mutate files.
 */

var fs = require("fs");
var path = require("path");

/**
 * Asset groups supported by the resolver.
 * Empty groups are allowed.
 */
var SUPPORTED_GROUPS = [
  "stories",
  "heroSequences",
  "terminology",
  "references",
  "content",
  "planners",
  "adapters",
  "themes",
  "examples",
];

/**
 * Resolve declared asset paths from a pack manifest.
 * @param {string} packRoot - Absolute path to pack root directory.
 * @param {object} contents - The "contents" object from pack.json.
 * @returns {{ok: boolean, assets?: object, error?: string, errorCode?: string}}
 */
function resolveAssets(packRoot, contents) {
  var resolved = {};
  var errors = [];

  for (var group of SUPPORTED_GROUPS) {
    var entries = contents[group] || [];
    if (!Array.isArray(entries)) {
      entries = [];
    }

    var resolvedEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var relPath = entries[i];
      var entryResult = resolveSingleAsset(packRoot, relPath, group, i);
      if (!entryResult.ok) {
        errors.push(entryResult);
      } else {
        resolvedEntries.push(entryResult.resolved);
      }
    }
    resolved[group] = resolvedEntries;
  }

  if (errors.length > 0) {
    var firstError = errors[0];
    return {
      ok: false,
      error: firstError.message,
      errorCode: firstError.code,
      details: firstError.details || null,
    };
  }

  return { ok: true, assets: resolved };
}

/**
 * Resolve a single asset path with safety checks.
 * @param {string} packRoot - Absolute pack root.
 * @param {string} relPath - Relative asset path from manifest.
 * @param {string} group - Asset group name (for error messages).
 * @param {number} index - Array index (for error messages).
 * @returns {{ok: boolean, resolved?: string, error?: string}}
 */
function resolveSingleAsset(packRoot, relPath, group, index) {
  // Reject absolute paths
  if (path.isAbsolute(relPath)) {
    return {
      ok: false,
      code: "ASSET_UNSAFE_PATH",
      message: "contents." + group + "[" + index + "] is an absolute path (not allowed): '" + relPath + "'",
      details: {
        group: group,
        entryIndex: index,
        entry: relPath,
        packRoot: packRoot,
      },
    };
  }

  // Reject path traversal
  if (relPath.indexOf("..") !== -1) {
    return {
      ok: false,
      code: "ASSET_UNSAFE_PATH",
      message: "contents." + group + "[" + index + "] contains path traversal (not allowed): '" + relPath + "'",
      details: {
        group: group,
        entryIndex: index,
        entry: relPath,
        packRoot: packRoot,
      },
    };
  }

  var fullPath = path.join(packRoot, relPath);
  var resolvedFull = path.resolve(fullPath);

  // Verify path stays inside pack root
  if (
    !resolvedFull.startsWith(packRoot + path.sep) &&
    resolvedFull !== packRoot
  ) {
    return {
      ok: false,
      code: "ASSET_UNSAFE_PATH",
      message: "contents." + group + "[" + index + "] escapes pack directory: '" + relPath + "'",
      details: {
        group: group,
        entryIndex: index,
        entry: relPath,
        packRoot: packRoot,
        resolvedPath: resolvedFull,
      },
    };
  }

  // Confirm file exists
  if (!fs.existsSync(resolvedFull)) {
    return {
      ok: false,
      code: "ASSET_MISSING",
      message: "Asset not found: '" + relPath + "' (resolved: " + resolvedFull + ")",
      details: {
        group: group,
        entryIndex: index,
        entry: relPath,
        packRoot: packRoot,
        resolvedPath: resolvedFull,
      },
    };
  }

  return { ok: true, resolved: resolvedFull };
}

module.exports = { resolveAssets, resolveSingleAsset, SUPPORTED_GROUPS };
