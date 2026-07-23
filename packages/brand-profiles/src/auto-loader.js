/**
 * @awe/brand-profiles — Brand Config Auto-Loader (M12.30)
 *
 * Discovers and loads brand profiles from:
 *   1. CLI flag (--brand <name>)
 *   2. Project-level config file (.brandrc in cwd or parent dirs)
 *   3. Environment variable (BRAND_PROFILE)
 *   4. Built-in fallback (minimal-modern)
 *
 * Supports profile inheritance: a project .brandrc can reference a built-in
 * and override specific fields, enabling "extend-and-customize" workflows.
 */

const fs = require("fs");
const path = require("path");
const { loadProfile, resolveBrandConfig, getBuiltInProfiles } = require("./loader.js");

// ─── Profile Inheritance ──────────────────────────────────────────────────

/**
 * Merge an override object into a base profile.
 * Shallow merge at top level; deep merge for nested objects like typographyRules.
 */
function mergeProfile(base, overrides) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value) && typeof base[key] === "object") {
      merged[key] = { ...(base[key] || {}), ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

// ─── Project Config Discovery ─────────────────────────────────────────────

/**
 * Find the nearest .brandrc file by walking up from cwd.
 * Returns { path, content } or null.
 */
function findProjectBrandConfig(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;

  while (dir !== root || dir === "/") {
    const rcPath = path.join(dir, ".brandrc");
    if (fs.existsSync(rcPath)) {
      try {
        const raw = fs.readFileSync(rcPath, "utf-8");
        // Support JSON or YAML-like key=value format
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // Simple key=value parser
          parsed = {};
          for (const line of raw.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
              parsed[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
            }
          }
        }
        return { path: rcPath, content: parsed };
      } catch (e) {
        return null;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Load brand configuration with full auto-discovery.
 *
 * Resolution order (highest priority first):
 *   1. Explicit profileNameOrPath argument
 *   2. .brandrc project config
 *   3. BRAND_PROFILE environment variable
 *   4. Built-in fallback ("minimal-modern")
 *
 * @param {string} [profileNameOrPath] - Override: built-in name or JSON file path
 * @param {object} [projectOverrides] - Additional overrides from CLI/config
 * @returns {{ config: object, source: string, profile: object }}
 */
function loadBrandProfile(profileNameOrPath, projectOverrides = {}) {
  // Priority 1: explicit argument
  if (profileNameOrPath) {
    const { profile, source } = loadProfile(profileNameOrPath);
    const merged = projectOverrides.baseProfile ? 
      mergeProfile(projectOverrides.baseProfile, profile) : profile;
    return {
      config: resolveBrandConfig(merged),
      source: `explicit:${source}`,
      profile: merged,
    };
  }

  // Priority 2: project .brandrc
  const projectConfig = findProjectBrandConfig();
  if (projectConfig) {
    const baseProfileName = projectConfig.content.profile || projectConfig.content.brand;
    let profile;
    let source;

    if (baseProfileName) {
      const loaded = loadProfile(baseProfileName);
      profile = loaded.profile;
      source = `project:${projectConfig.path} → ${loaded.source}`;
    } else {
      // .brandrc is a complete profile
      profile = projectConfig.content;
      source = `project:${projectConfig.path}`;
    }

    // Apply any additional overrides from the .brandrc itself
    if (projectConfig.content.overrides) {
      profile = mergeProfile(profile, projectConfig.content.overrides);
    }

    return {
      config: resolveBrandConfig(profile),
      source,
      profile,
    };
  }

  // Priority 3: environment variable
  const envProfile = process.env.BRAND_PROFILE;
  if (envProfile) {
    try {
      const { profile, source } = loadProfile(envProfile);
      return {
        config: resolveBrandConfig(profile),
        source: `env:${source}`,
        profile,
      };
    } catch (e) {
      console.warn(`[Brand] BRAND_PROFILE="${envProfile}" failed: ${e.message}, falling back`);
    }
  }

  // Priority 4: built-in fallback
  try {
    const { profile, source } = loadProfile("minimal-modern");
    return {
      config: resolveBrandConfig(profile),
      source: `builtin:${source}`,
      profile,
    };
  } catch (e) {
    // Last resort: empty config
    return {
      config: {},
      source: "fallback:none",
      profile: {},
    };
  }
}

/**
 * Quick helper: load brand config for pipeline use.
 * Same resolution as loadBrandProfile but returns just the config object.
 */
function getBrandConfig(profileNameOrPath) {
  return loadBrandProfile(profileNameOrPath).config;
}

module.exports = {
  loadBrandProfile,
  getBrandConfig,
  mergeProfile,
  findProjectBrandConfig,
};
