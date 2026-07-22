/**
 * @awe/presentation-compiler — Schema and Constants (M12.24)
 *
 * Defines compiler modes, error types, and the Render Plan schema.
 */

"use strict";

// ── Compiler Modes ────────────────────────────────────────────────

const COMPILER_MODES = {
  FAST: "fast",
  STANDARD: "standard",
  OPTIMIZED: "optimized",
};

const DEFAULT_MODE = COMPILER_MODES.STANDARD;

// ── Slide Canvas Constraints (16:9 widescreen, inches → pptxgenjs units) ─
// Content area: approximately 11.33" wide × 5.83" tall (after margins)
const CANVAS_WIDTH_IN = 11.33;
const CANVAS_HEIGHT_IN = 5.83;
const MAX_BULLETS_PER_SLIDE = 6; // conservative: allow 6 bullets before pagination
const MAX_CHARACTERS_PER_BODY = 400; // rough limit for body text on one slide
const MAX_HEADING_LENGTH = 120; // characters

// ── Error Types ───────────────────────────────────────────────────

const COMPILER_ERRORS = {
  CONSTRAINT_CONFLICT: "ConstraintConflict",
  OVERFLOW: "OverflowError",
  THEME_RESOLUTION: "ThemeResolutionError",
  RESOURCE: "ResourceError",
  PAGINATION: "PaginationError",
};

// ── Resource Cache Keys ──────────────────────────────────────────

function resourceKey(type, data) {
  const hash = require("crypto")
    .createHash("md5")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 8);
  return `${type}:${hash}`;
}

module.exports = {
  COMPILER_MODES,
  DEFAULT_MODE,
  CANVAS_WIDTH_IN,
  CANVAS_HEIGHT_IN,
  MAX_BULLETS_PER_SLIDE,
  MAX_CHARACTERS_PER_BODY,
  MAX_HEADING_LENGTH,
  COMPILER_ERRORS,
  resourceKey,
};
