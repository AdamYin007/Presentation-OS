/**
 * Pack Manifest Validator - read-only, no runtime loading.
 *
 * Validates presentation-packs/<name>/pack.json and verifies
 * all listed asset paths exist relative to pack root.
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "name",
  "displayName",
  "version",
  "status",
  "type",
  "domain",
  "description",
  "compatibleWith",
  "contents",
  "runtime",
  "governance",
];

const REQUIRED_RUNTIME_FIELDS = ["loadedByDefault", "requiresPackLoader"];
const REQUIRED_GOVERNANCE_FIELDS = ["coreChangesRequired", "migrationMode"];

const CONTENT_ARRAYS = [
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

/**
 * Validate a presentation pack directory.
 * @param {string} packDir - Path to pack root.
 * @returns {object} Validation result.
 */
function validatePack(packDir) {
  const result = {
    ok: false,
    packDir: null,
    manifestPath: null,
    manifest: null,
    errors: [],
    warnings: [],
    assets: {},
  };

  const resolved = path.resolve(packDir);
  result.packDir = resolved;

  if (!fs.existsSync(resolved)) {
    result.errors.push("Pack directory not found: " + resolved);
    return result;
  }

  const manifestPath = path.join(resolved, "pack.json");
  result.manifestPath = manifestPath;

  if (!fs.existsSync(manifestPath)) {
    result.errors.push("pack.json not found in: " + resolved);
    return result;
  }

  let raw;
  try {
    raw = fs.readFileSync(manifestPath, "utf8");
  } catch (e) {
    result.errors.push("Cannot read pack.json: " + e.message);
    return result;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    result.errors.push("Invalid JSON in pack.json: " + e.message);
    return result;
  }

  result.manifest = manifest;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in manifest)) {
      result.errors.push("Missing required manifest field: '" + field + "'");
    }
  }

  if (manifest.type !== "presentation-pack") {
    result.warnings.push(
      'Expected type "presentation-pack", got "' +
        (manifest.type || "(undefined)") +
        '"'
    );
  }

  if (manifest.runtime) {
    for (const field of REQUIRED_RUNTIME_FIELDS) {
      if (!(field in manifest.runtime)) {
        result.errors.push(
          "Missing required runtime field: '" + field + "'"
        );
      }
    }
  }

  if (manifest.governance) {
    for (const field of REQUIRED_GOVERNANCE_FIELDS) {
      if (!(field in manifest.governance)) {
        result.errors.push(
          "Missing required governance field: '" + field + "'"
        );
      }
    }
  }

  if (manifest.version && !isValidSemver(manifest.version)) {
    result.errors.push("Invalid semver in version: '" + manifest.version + "'");
  }

  if (
    manifest.compatibleWith &&
    manifest.compatibleWith.presentationOS &&
    !isValidSemverRange(manifest.compatibleWith.presentationOS)
  ) {
    result.warnings.push(
      "Non-standard semver range in compatibleWith.presentationOS: '" +
        manifest.compatibleWith.presentationOS +
        "'"
    );
  }

  if (!manifest.contents || typeof manifest.contents !== "object") {
    result.errors.push("'contents' must be an object");
    return result;
  }

  const assets = {};
  for (const arrayName of CONTENT_ARRAYS) {
    const entries = manifest.contents[arrayName];
    assets[arrayName] = entries || [];

    if (!Array.isArray(entries)) {
      result.errors.push(
        "contents." +
          arrayName +
          " must be an array, got " +
          typeof entries
      );
      continue;
    }

    if (entries.length === 0) {
      result.warnings.push(
        "contents." + arrayName + " is empty - no assets listed"
      );
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const relPath = entries[i];

      if (path.isAbsolute(relPath)) {
        result.errors.push(
          "contents." +
            arrayName +
            "[" +
            i +
            "] is an absolute path (not allowed): '" +
            relPath +
            "'"
        );
        continue;
      }

      if (relPath.indexOf("..") !== -1) {
        result.errors.push(
          "contents." +
            arrayName +
            "[" +
            i +
            "] contains path traversal (not allowed): '" +
            relPath +
            "'"
        );
        continue;
      }

      const fullPath = path.join(resolved, relPath);
      const resolvedFull = path.resolve(fullPath);

      if (
        !resolvedFull.startsWith(resolved + path.sep) &&
        resolvedFull !== resolved
      ) {
        result.errors.push(
          "contents." +
            arrayName +
            "[" +
            i +
            "] escapes pack directory: '" +
            relPath +
            "'"
        );
        continue;
      }

      if (!fs.existsSync(resolvedFull)) {
        result.errors.push(
          "Asset not found: '" +
            relPath +
            "' (resolved: " +
            resolvedFull +
            ")"
        );
      }
    }
  }

  result.assets = assets;

  if (result.errors.length === 0) {
    result.ok = true;
  }

  return result;
}

function isValidSemver(v) {
  if (typeof v !== "string") return false;
  return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(v);
}

function isValidSemverRange(v) {
  if (typeof v !== "string") return false;
  return /^[^0-9]*[0-9]+(\.[0-9]+){0,2}[^0-9]*$/.test(v);
}

if (require.main === module) {
  const packDir = process.argv[2];
  if (!packDir) {
    console.error("Usage: node pack-validator.js <pack-directory>");
    process.exit(1);
  }

  const result = validatePack(packDir);

  if (result.ok) {
    console.log("Pack validation passed");
    console.log(
      "Pack: " + (result.manifest ? result.manifest.name : "(unknown)")
    );
    console.log(
      "Version: " + (result.manifest ? result.manifest.version : "(unknown)")
    );
    console.log(
      "Status: " + (result.manifest ? result.manifest.status : "(unknown)")
    );
    console.log(
      "Stories: " + ((result.assets.stories || []).length)
    );
    console.log(
      "Hero sequences: " + ((result.assets.heroSequences || []).length)
    );
    console.log(
      "Terminology: " + ((result.assets.terminology || []).length)
    );
    console.log(
      "References: " + ((result.assets.references || []).length)
    );
    if (result.warnings.length > 0) {
      console.log("Warnings: " + result.warnings.length);
      for (const w of result.warnings) {
        console.log("  " + w);
      }
    }
    process.exit(0);
  } else {
    console.error("Pack validation failed");
    for (const err of result.errors) {
      console.error("  Error: " + err);
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.error("  Warning: " + w);
      }
    }
    process.exit(1);
  }
}

module.exports = { validatePack };
