/**
 * Template Analyzer Schema — M12.31
 *
 * Defines the output contract for template analysis results.
 * Ensures deterministic, validated output structure for downstream consumers.
 */

"use strict";

// ─── Schema Constants ────────────────────────────────────────────

const SCHEMA_VERSION = "1.0.0";
const ANALYSIS_TIMESTAMP_FORMAT = "ISO8601";

// Element categories that must be preserved
const PRESERVABLE_CATEGORIES = [
  "brand-element",  // logos, watermarks
  "footer",         // page numbers, copyright
  "background",     // slide backgrounds
  "decorative",     // decorative shapes
  "heading",        // title/heading placeholders
];

// Required fields for principles output
const REQUIRED_PRINCIPLES_FIELDS = [
  "metadata",
  "commonElements",
  "uniqueByType",
  "slideTypes",
  "styleTokens",
  "recommendations",
];

// Required metadata fields
const REQUIRED_METADATA_FIELDS = [
  "totalSlides",
  "generatedAt",
  "sourceFile",
];

// Required common elements structure
const REQUIRED_COMMON_ELEMENTS_FIELDS = [
  "mustPreserve",
  "brandElements",
  "footers",
  "backgrounds",
];

// Required recommendations structure
const REQUIRED_RECOMMENDATION_FIELDS = [
  "priority",  // "critical", "high", "medium"
  "rule",      // snake_case rule identifier
  "description",
];

// Valid priority levels
const VALID_PRIORITIES = ["critical", "high", "medium"];

// ─── Validation Functions ────────────────────────────────────────

/**
 * Validate principles output structure
 */
function validatePrinciples(principles) {
  const errors = [];

  if (!principles || typeof principles !== "object") {
    return { ok: false, errors: ["principles must be an object"] };
  }

  // Check required top-level fields
  for (const field of REQUIRED_PRINCIPLES_FIELDS) {
    if (!(field in principles)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate metadata
  if (principles.metadata) {
    for (const field of REQUIRED_METADATA_FIELDS) {
      if (!(field in principles.metadata)) {
        errors.push(`Missing metadata field: ${field}`);
      }
    }
    // Validate timestamp format
    if (principles.metadata.generatedAt) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!isoRegex.test(principles.metadata.generatedAt)) {
        errors.push("metadata.generatedAt must be ISO 8601 format");
      }
    }
    // Validate totalSlides is positive integer
    if (
      typeof principles.metadata.totalSlides !== "number" ||
      !Number.isInteger(principles.metadata.totalSlides) ||
      principles.metadata.totalSlides < 0
    ) {
      errors.push("metadata.totalSlides must be a non-negative integer");
    }
  }

  // Validate commonElements
  if (principles.commonElements) {
    for (const field of REQUIRED_COMMON_ELEMENTS_FIELDS) {
      if (!(field in principles.commonElements)) {
        errors.push(`Missing commonElements field: ${field}`);
      }
    }
    // Validate mustPreserve is array of strings
    if (
      !Array.isArray(principles.commonElements.mustPreserve) ||
      !principles.commonElements.mustPreserve.every((x) => typeof x === "string")
    ) {
      errors.push("commonElements.mustPreserve must be an array of strings");
    }
  }

  // Validate recommendations
  if (principles.recommendations) {
    if (!Array.isArray(principles.recommendations)) {
      errors.push("recommendations must be an array");
    } else {
      for (let i = 0; i < principles.recommendations.length; i++) {
        const rec = principles.recommendations[i];
        for (const field of REQUIRED_RECOMMENDATION_FIELDS) {
          if (!(field in rec)) {
            errors.push(`recommendations[${i}] missing field: ${field}`);
          }
        }
        if (rec.priority && !VALID_PRIORITIES.includes(rec.priority)) {
          errors.push(
            `recommendations[${i}].priority must be one of: ${VALID_PRIORITIES.join(", ")}`
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate slide element structure
 */
function validateSlideElement(element) {
  const errors = [];

  if (!element || typeof element !== "object") {
    return { ok: false, errors: ["element must be an object"] };
  }

  // Required fields
  if (!element.type) {
    errors.push("element.type is required");
  }

  const validTypes = [
    "background",
    "shape",
    "table",
    "chart",
    "image",
    "text",
  ];
  if (element.type && !validTypes.includes(element.type)) {
    errors.push(`Invalid element type: ${element.type}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate slide analysis result
 */
function validateSlide(slide) {
  const errors = [];

  if (!slide || typeof slide !== "object") {
    return { ok: false, errors: ["slide must be an object"] };
  }

  if (typeof slide.slideNum !== "number" || !Number.isInteger(slide.slideNum)) {
    errors.push("slide.slideNum must be an integer");
  }

  if (!Array.isArray(slide.elements)) {
    errors.push("slide.elements must be an array");
  } else {
    for (let i = 0; i < slide.elements.length; i++) {
      const elemValidation = validateSlideElement(slide.elements[i]);
      errors.push(...elemValidation.errors.map((e) => `elements[${i}]: ${e}`));
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Cross-validate analysis results against template structure
 */
function crossValidate(slides, principles) {
  const warnings = [];

  if (!slides || slides.length === 0) {
    warnings.push("No slides analyzed — template may be empty or invalid");
    return warnings;
  }

  // Validate metadata.totalSlides matches actual slide count
  if (principles && principles.metadata) {
    if (principles.metadata.totalSlides !== slides.length) {
      warnings.push(
        `Metadata totalSlides (${principles.metadata.totalSlides}) does not match actual slide count (${slides.length})`
      );
    }
  }

  // Check for slides with no elements
  const emptySlides = slides.filter((s) => !s.elements || s.elements.length === 0);
  if (emptySlides.length > 0) {
    warnings.push(
      `${emptySlides.length} slide(s) have no extractable elements`
    );
  }

  // Check for slides without text
  const slidesWithoutText = slides.filter((s) => !s.hasText);
  if (slidesWithoutText.length > 0) {
    warnings.push(
      `${slidesWithoutText.length} slide(s) have no text content`
    );
  }

  return warnings;
}

// ─── Module Exports ──────────────────────────────────────────────

module.exports = {
  // Schema constants
  SCHEMA_VERSION,
  PRESERVABLE_CATEGORIES,
  VALID_PRIORITIES,

  // Validation functions
  validatePrinciples,
  validateSlideElement,
  validateSlide,
  crossValidate,

  // Export for testing
  REQUIRED_PRINCIPLES_FIELDS,
  REQUIRED_METADATA_FIELDS,
  REQUIRED_COMMON_ELEMENTS_FIELDS,
  REQUIRED_RECOMMENDATION_FIELDS,
};
