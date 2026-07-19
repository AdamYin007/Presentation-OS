/**
 * @awe/brand-profiles — Public API (M12.20)
 *
 * Reusable brand/client profile packs for Presentation OS.
 * Provides logo margins, color rules, typography, and footer/title conventions.
 */

"use strict";

const {
  PROFILE_SCHEMA_VERSION,
  validateProfile,
  getBuiltInProfiles,
  isBuiltinProfile,
} = require("./schema.js");

const {
  loadProfile,
  resolveBrandConfig,
} = require("./loader.js");

const {
  MINIMAL_MODERN,
  BUSINESS_CONSULTING,
  ACADEMIC_CLEAN,
  BUILTINS,
} = require("./builtins.js");

module.exports = {
  // Schema
  PROFILE_SCHEMA_VERSION,
  validateProfile,
  getBuiltInProfiles,
  isBuiltinProfile,

  // Loader
  loadProfile,
  resolveBrandConfig,

  // Built-in profiles
  MINIMAL_MODERN,
  BUSINESS_CONSULTING,
  ACADEMIC_CLEAN,
  BUILTINS,
};
