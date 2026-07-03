/**
 * Pack Manifest Reader — reads and parses pack.json.
 *
 * Responsibilities:
 * - Read pack.json from a pack root directory.
 * - Parse and return the manifest object plus path metadata.
 * - Fail clearly if the file is missing or contains invalid JSON.
 *
 * Does NOT validate asset existence or schema correctness.
 * That is the validator's responsibility.
 */

var fs = require("fs");
var path = require("path");

/**
 * Read and parse pack.json from a pack root directory.
 * @param {string} packRoot - Absolute path to pack root directory.
 * @returns {{ok: boolean, manifest?: object, packRoot?: string, error?: string, errorCode?: string}}
 */
function readManifest(packRoot) {
  var resolved = path.resolve(packRoot);
  var manifestPath = path.join(resolved, "pack.json");

  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      packRoot: resolved,
      manifestPath: manifestPath,
      error: "pack.json not found in: " + resolved,
      errorCode: "MANIFEST_MISSING",
      details: {
        target: resolved,
        manifestPath: manifestPath,
      },
    };
  }

  var raw;
  try {
    raw = fs.readFileSync(manifestPath, "utf8");
  } catch (e) {
    return {
      ok: false,
      packRoot: resolved,
      manifestPath: manifestPath,
      error: "Cannot read pack.json: " + e.message,
      errorCode: "MANIFEST_MISSING",
      details: {
        target: resolved,
        manifestPath: manifestPath,
      },
    };
  }

  var manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      packRoot: resolved,
      manifestPath: manifestPath,
      error: "Invalid JSON in pack.json: " + e.message,
      errorCode: "MANIFEST_INVALID_JSON",
      details: {
        target: resolved,
        manifestPath: manifestPath,
      },
    };
  }

  return {
    ok: true,
    manifest: manifest,
    packRoot: resolved,
    manifestPath: manifestPath,
  };
}

module.exports = { readManifest };
