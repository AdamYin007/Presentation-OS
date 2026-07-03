/**
 * Pack Story Resolver — read-only, no rendering.
 *
 * Resolves a pack story path from --pack-story <pack-id>/<story-id>.
 * Validates pack manifest, matches story against declared assets,
 * and returns the resolved path. Does NOT load story JSON for
 * rendering, does NOT generate PPTX, does NOT mutate files.
 */

var fs = require("fs");
var path = require("path");
var validatePack = require("./pack-validator").validatePack;

/**
 * Parse and validate --pack-story input format.
 * @param {string} value - The value passed to --pack-story.
 * @returns {object} { ok, packId, storyId, error, errorCode }
 */
function parsePackStoryInput(value) {
  if (!value || value.trim() === "") {
    return { ok: false, error: "Missing value for --pack-story", errorCode: "MISSING_VALUE" };
  }

  // Must contain exactly one slash
  var parts = value.split("/");
  if (parts.length !== 2) {
    return {
      ok: false,
      error: "Invalid --pack-story value. Expected <pack-id>/<story-id>",
      errorCode: "INVALID_FORMAT",
    };
  }

  var packId = parts[0].trim();
  var storyId = parts[1].trim();

  if (!packId || !storyId) {
    return {
      ok: false,
      error: "Invalid --pack-story value. Expected <pack-id>/<story-id>",
      errorCode: "INVALID_FORMAT",
    };
  }

  // Reject absolute paths
  if (packId.startsWith("/")) {
    return {
      ok: false,
      error: "Invalid --pack-story value. Expected <pack-id>/<story-id>",
      errorCode: "INVALID_FORMAT",
    };
  }

  // Reject path traversal
  if (packId.indexOf("..") !== -1 || storyId.indexOf("..") !== -1) {
    return {
      ok: false,
      error: "Unsafe pack story path: " + value,
      errorCode: "UNSAFE_PATH",
    };
  }

  // Reject .json suffix on story id
  if (storyId.endsWith(".json")) {
    return {
      ok: false,
      error: "Invalid --pack-story value. Expected <pack-id>/<story-id>",
      errorCode: "INVALID_FORMAT",
    };
  }

  return { ok: true, packId: packId, storyId: storyId };
}

/**
 * Resolve a pack story path.
 *
 * @param {string} value - The --pack-story value (e.g. "digital-pathology/digital-pathology-15").
 * @param {object} options - Options.
 * @param {string} [options.packsRoot] - Packs root directory (default: "presentation-packs").
 * @returns {object} Resolution result.
 */
function resolvePackStory(value, options) {
  options = options || {};
  var packsRoot = options.packsRoot || "presentation-packs";

  // Step 1: Parse input
  var parsed = parsePackStoryInput(value);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, errorCode: parsed.errorCode };
  }

  var packId = parsed.packId;
  var storyId = parsed.storyId;

  // Step 2: Locate pack directory
  var packDir = path.resolve(packsRoot, packId);
  if (!fs.existsSync(packDir)) {
    return {
      ok: false,
      error: "Presentation Pack not found: " + packId,
      errorCode: "PACK_NOT_FOUND",
      packId: packId,
      storyId: storyId,
    };
  }

  // Step 3: Require pack.json
  var manifestPath = path.join(packDir, "pack.json");
  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      error: "Presentation Pack not found: " + packId,
      errorCode: "PACK_NOT_FOUND",
      packId: packId,
      storyId: storyId,
    };
  }

  // Step 4: Validate pack manifest
  var validationResult = validatePack(packDir);
  if (!validationResult.ok) {
    return {
      ok: false,
      error: "Presentation Pack validation failed: " + packId,
      errorCode: "VALIDATION_FAILED",
      packId: packId,
      storyId: storyId,
      validationErrors: validationResult.errors,
    };
  }

  // Step 5: Read manifest to get declared stories
  var manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return {
      ok: false,
      error: "Cannot read pack.json: " + e.message,
      errorCode: "INVALID_JSON",
      packId: packId,
      storyId: storyId,
    };
  }

  var declaredStories = (manifest.contents && manifest.contents.stories) || [];
  if (!Array.isArray(declaredStories)) {
    return {
      ok: false,
      error: "Story not declared in pack: " + storyId,
      errorCode: "STORY_NOT_DECLARED",
      packId: packId,
      storyId: storyId,
    };
  }

  // Step 6: Match story id against declared stories
  var matchedEntries = [];
  for (var i = 0; i < declaredStories.length; i++) {
    var declared = declaredStories[i];
    var declaredStem = path.basename(declared, ".json");
    if (declaredStem === storyId) {
      matchedEntries.push({ path: declared, stem: declaredStem });
    }
  }

  if (matchedEntries.length === 0) {
    return {
      ok: false,
      error: "Story not declared in pack: " + storyId,
      errorCode: "STORY_NOT_DECLARED",
      packId: packId,
      storyId: storyId,
    };
  }

  if (matchedEntries.length > 1) {
    return {
      ok: false,
      error: "Multiple stories matched: " + storyId,
      errorCode: "MULTIPLE_MATCHES",
      packId: packId,
      storyId: storyId,
      matches: matchedEntries.map(function (m) { return m.path; }),
    };
  }

  var matchedPath = matchedEntries[0].path;

  // Step 7: Resolve actual story path
  var storyPath = path.join(packDir, matchedPath);
  var resolvedStoryPath = path.resolve(storyPath);
  var resolvedPackDir = path.resolve(packDir);

  // Step 8: Confirm path stays inside pack root
  if (!resolvedStoryPath.startsWith(resolvedPackDir + path.sep) && resolvedStoryPath !== resolvedPackDir) {
    return {
      ok: false,
      error: "Unsafe pack story path: " + resolvedStoryPath,
      errorCode: "UNSAFE_PATH",
      packId: packId,
      storyId: storyId,
    };
  }

  // Step 9: Confirm story file exists
  if (!fs.existsSync(resolvedStoryPath)) {
    return {
      ok: false,
      error: "Declared story file missing: " + matchedPath,
      errorCode: "FILE_MISSING",
      packId: packId,
      storyId: storyId,
      storyPath: matchedPath,
    };
  }

  // Step 10: Success — return resolution result (read-only, no content loading)
  var relStoryPath = path.relative(packsRoot, resolvedStoryPath);

  return {
    ok: true,
    packId: packId,
    storyId: storyId,
    packPath: packDir,
    storyPath: relStoryPath,
    storyAbsolutePath: resolvedStoryPath,
    validation: "passed",
    manifest: {
      name: manifest.name,
      version: manifest.version,
      status: manifest.status,
    },
  };
}

/**
 * Print pack story resolution result.
 *
 * @param {object} result - Result from resolvePackStory().
 * @returns {number} - 0 on success, 1 on error.
 */
function printPackStoryResolution(result) {
  if (!result.ok) {
    console.error(result.error);
    return 1;
  }

  console.log("Pack Story Resolution:");
  console.log("pack: " + result.packId);
  console.log("story: " + result.storyId);
  console.log("validation: passed");
  console.log("storyPath: " + result.storyPath);
  console.log("");
  console.log("Rendering: not implemented yet");
  console.log("This resolver is read-only. It does not load story content or trigger rendering.");

  return 0;
}

module.exports = { resolvePackStory, printPackStoryResolution, parsePackStoryInput };
