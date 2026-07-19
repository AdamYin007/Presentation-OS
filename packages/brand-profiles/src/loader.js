/**
 * Brand Profile Loader — M12.20
 *
 * Loads brand profiles from:
 *   1. Built-in profiles by name (minimal-modern, business-consulting, academic-clean)
 *   2. Custom JSON files by absolute path
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { validateProfile, getBuiltInProfiles, isBuiltinProfile } = require("./schema.js");
const { BUILTINS } = require("./builtins.js");

/**
 * Load a brand profile by name or file path.
 *
 * @param {string} profileNameOrPath — built-in name (e.g. "business-consulting") or absolute path to JSON file
 * @returns {{ profile: Object, source: string }} loaded profile and its source ("builtin" or "file:<path>")
 * @throws {Error} if profile not found, invalid, or file unreadable
 */
function loadProfile(profileNameOrPath) {
  // Trim whitespace
  const input = profileNameOrPath.trim();

  // Check for built-in first
  if (isBuiltinProfile(input)) {
    const profile = BUILTINS[input];
    // Validate built-in (should always pass, but safety check)
    const result = validateProfile(profile);
    if (!result.valid) {
      throw new Error(`Built-in profile "${input}" failed internal validation: ${result.errors.join("; ")}`);
    }
    return { profile, source: "builtin" };
  }

  // Try as file path
  const resolvedPath = path.resolve(input);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Brand profile not found: "${input}". ` +
      `Available built-ins: ${getBuiltInProfiles().join(", ")}. ` +
      `Or provide an absolute path to a JSON file.`
    );
  }

  let raw;
  try {
    raw = fs.readFileSync(resolvedPath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read brand profile file "${resolvedPath}": ${err.message}`);
  }

  let profile;
  try {
    profile = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in brand profile file "${resolvedPath}": ${err.message}`);
  }

  const validation = validateProfile(profile);
  if (!validation.valid) {
    throw new Error(
      `Brand profile validation failed for "${resolvedPath}":\n  - ${validation.errors.join("\n  - ")}`
    );
  }

  return { profile, source: `file:${resolvedPath}` };
}

/**
 * Get the merged brand config for use with visual design gate and logo safe area.
 * Flattens a profile into the config shape expected by downstream gates.
 *
 * @param {Object} profile — loaded brand profile object
 * @returns {Object} merged config with keys: logoSafeArea, allowedPalette,
 *   footerConvention, titlePlacement, requiredTitleSlide, requiredClosingSlide,
 *   maxSlidesPerSection, typographyRules
 */
function resolveBrandConfig(profile) {
  const config = {};

  if (profile.logoSafeArea) {
    config.logoSafeArea = profile.logoSafeArea;
  }
  if (profile.allowedPalette) {
    config.allowedPalette = profile.allowedPalette;
  }
  if (profile.footerConvention) {
    config.footerConvention = profile.footerConvention;
  }
  if (profile.titlePlacement) {
    config.titlePlacement = profile.titlePlacement;
  }
  if (profile.requiredSlides) {
    config.requiredTitleSlide = profile.requiredSlides.titleSlide || false;
    config.requiredClosingSlide = profile.requiredSlides.closingSlide !== false;
  }
  if (profile.maxSlidesPerSection) {
    config.maxSlidesPerSection = profile.maxSlidesPerSection;
  }
  if (profile.typographyRules) {
    config.typographyRules = profile.typographyRules;
  }

  return config;
}

module.exports = {
  loadProfile,
  resolveBrandConfig,
};
