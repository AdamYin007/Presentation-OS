/**
 * Pack Discovery — locates Presentation Packs in known directories.
 *
 * Responsibilities:
 * - Scan known directories for pack.json files.
 * - Return discovered pack roots and their ids.
 *
 * Does NOT validate or load packs. Just discovers.
 */

var fs = require("fs");
var path = require("path");

/**
 * Known directories to scan for packs.
 * Order matters: first match wins for duplicate pack ids.
 */
var SCAN_DIRECTORIES = [
  "presentation-packs",
];

/**
 * Discover all packs in known directories.
 * @returns {Array<{packId: string, packRoot: string}>}
 */
function discoverPacks() {
  var discovered = [];
  var seenIds = {};

  for (var i = 0; i < SCAN_DIRECTORIES.length; i++) {
    var scanDir = path.join(process.cwd(), SCAN_DIRECTORIES[i]);
    if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
      continue;
    }

    var entries = fs.readdirSync(scanDir);
    for (var j = 0; j < entries.length; j++) {
      var entry = entries[j];
      var candidatePath = path.join(scanDir, entry);

      if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isDirectory()) {
        continue;
      }

      var manifestPath = path.join(candidatePath, "pack.json");
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      var packId = entry;

      // Skip duplicates — first discovery wins
      if (seenIds[packId]) {
        continue;
      }

      seenIds[packId] = true;
      discovered.push({
        packId: packId,
        packRoot: path.resolve(candidatePath),
      });
    }
  }

  return discovered;
}

/**
 * Find a specific pack by id.
 * @param {string} packId - Pack identifier.
 * @returns {{packId: string, packRoot: string}|null}
 */
function findPack(packId) {
  var all = discoverPacks();
  for (var i = 0; i < all.length; i++) {
    if (all[i].packId === packId) {
      return all[i];
    }
  }
  return null;
}

/**
 * Find a pack by absolute path.
 * @param {string} packPath - Absolute path to a pack directory.
 * @returns {{packId: string, packRoot: string}|null}
 */
function findPackByPath(packPath) {
  var resolved = path.resolve(packPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return null;
  }
  if (!fs.existsSync(path.join(resolved, "pack.json"))) {
    return null;
  }
  return {
    packId: path.basename(resolved),
    packRoot: resolved,
  };
}

module.exports = { discoverPacks, findPack, findPackByPath, SCAN_DIRECTORIES };
