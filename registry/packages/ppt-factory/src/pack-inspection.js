/**
 * Pack Inspection — read-only, no runtime loading.
 *
 * Inspects a single Presentation Pack by directory name.
 * Uses existing pack-validator for manifest validation.
 */

var fs = require("fs");
var path = require("path");
var validatePack = require("./pack-validator").validatePack;

/**
 * Inspect a single presentation pack by directory name.
 *
 * @param {string} packId - Directory name under presentation-packs/.
 * @param {string} rootDir - Root directory (default: presentation-packs/).
 * @returns {object|null} Inspection result or null if not found.
 */
function inspectPack(packId, rootDir) {
  rootDir = rootDir || "presentation-packs";
  var resolved = path.resolve(rootDir);

  // Try directory name match first
  var candidate = path.join(resolved, packId);
  if (!fs.existsSync(candidate)) {
    // Try case-insensitive fallback
    var dirs = fs.readdirSync(resolved);
    for (var i = 0; i < dirs.length; i++) {
      if (dirs[i].toLowerCase() === packId.toLowerCase()) {
        candidate = path.join(resolved, dirs[i]);
        break;
      }
    }
  }

  if (!fs.existsSync(candidate)) {
    return {
      found: false,
      packId: packId,
      searchedDir: candidate,
    };
  }

  var validationResult = validatePack(candidate);
  var manifest = validationResult.manifest || {};

  return {
    found: true,
    id: packId,
    displayName: manifest.displayName || "(unknown)",
    version: manifest.version || "(unknown)",
    status: manifest.status || "(unknown)",
    path: candidate,
    validation: validationResult.ok,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
    assets: validationResult.assets,
    runtime: manifest.runtime || {},
    governance: manifest.governance || {},
  };
}

/**
 * Print pack inspection result to stdout.
 *
 * @param {object} result - Result from inspectPack().
 * @returns {number} - 0 if found and valid, 1 otherwise.
 */
function printPackInspection(result) {
  if (!result.found) {
    console.error("Presentation Pack not found: " + result.packId);
    return 1;
  }

  console.log("Presentation Pack: " + result.id);
  console.log("name: " + result.displayName);
  console.log("version: " + result.version);
  console.log("status: " + result.status);
  console.log("path: " + result.path);
  console.log("validation: " + (result.validation ? "passed" : "failed"));

  if (result.errors && result.errors.length > 0) {
    console.log("errors:");
    for (var i = 0; i < result.errors.length; i++) {
      console.log("  - " + result.errors[i]);
    }
  }

  if (result.assets) {
    console.log("assets:");
    var sections = [
      "stories",
      "heroSequences",
      "content",
      "planners",
      "adapters",
      "themes",
      "terminology",
      "references",
      "examples",
    ];
    for (var s = 0; s < sections.length; s++) {
      var arr = result.assets[sections[s]];
      if (arr && arr.length > 0) {
        console.log("  " + sections[s] + ":");
        for (var j = 0; j < arr.length; j++) {
          console.log("    - " + arr[j]);
        }
      }
    }
  }

  if (result.runtime) {
    console.log("runtime:");
    console.log("  loadedByDefault: " + result.runtime.loadedByDefault);
    console.log("  requiresPackLoader: " + result.runtime.requiresPackLoader);
  }

  if (result.governance) {
    console.log("governance:");
    console.log("  coreChangesAllowed: " + result.governance.coreChangesRequired);
    console.log("  migrationMode: " + result.governance.migrationMode);
  }

  return result.validation ? 0 : 1;
}

module.exports = { inspectPack, printPackInspection };
