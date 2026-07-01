/**
 * Pack Discovery — read-only, no runtime loading.
 *
 * Discovers Presentation Packs under presentation-packs/ directory
 * and validates each pack manifest using the pack validator.
 */

const fs = require("fs");
const path = require("path");
const { validatePack } = require("./pack-validator");

/**
 * Discover all presentation packs under the given root directory.
 *
 * @param {string} rootDir - Path to presentation-packs/ directory.
 * @returns {Array<{name: string, displayName: string, version: string, status: string, path: string, valid: boolean, errors: string[]}>}
 */
function discoverPacks(rootDir) {
  const resolved = path.resolve(rootDir);
  var results = [];

  if (!fs.existsSync(resolved)) {
    return results;
  }

  var entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];

    // Only consider directories
    if (!entry.isDirectory()) {
      continue;
    }

    var packDir = path.join(resolved, entry.name);
    var packJsonPath = path.join(packDir, "pack.json");

    // Only consider directories that contain pack.json
    if (!fs.existsSync(packJsonPath)) {
      continue;
    }

    var validationResult = validatePack(packDir);

    var manifest = validationResult.manifest || {};

    results.push({
      name: manifest.name || entry.name,
      displayName: manifest.displayName || "(unknown)",
      version: manifest.version || "(unknown)",
      status: manifest.status || "(unknown)",
      path: packDir,
      valid: validationResult.ok,
      errors: validationResult.errors,
    });
  }

  return results;
}

/**
 * Print pack discovery results to stdout.
 *
 * @param {Array} packs - Results from discoverPacks().
 * @returns {number} - 0 if all valid or no packs, 1 if any invalid.
 */
function printPacks(packs) {
  if (packs.length === 0) {
    console.log("No Presentation Packs found.");
    return 0;
  }

  console.log("Available Presentation Packs:");

  var hasInvalid = false;

  for (var i = 0; i < packs.length; i++) {
    var pack = packs[i];
    console.log("- " + pack.name);
    console.log("  name: " + pack.displayName);
    console.log("  version: " + pack.version);
    console.log("  status: " + pack.status);
    console.log("  path: " + pack.path);

    if (pack.valid) {
      console.log("  validation: passed");
    } else {
      console.log("  validation: failed");
      console.log("  errors:");
      for (var j = 0; j < pack.errors.length; j++) {
        console.log("    - " + pack.errors[j]);
      }
      hasInvalid = true;
    }

    // Blank line between packs
    if (i < packs.length - 1) {
      console.log("");
    }
  }

  return hasInvalid ? 1 : 0;
}

// CLI runner (when run directly)
if (require.main === module) {
  var rootDir = process.argv[2] || "presentation-packs";
  var packs = discoverPacks(rootDir);
  var exitCode = printPacks(packs);
  process.exit(exitCode);
}

module.exports = { discoverPacks, printPacks };
