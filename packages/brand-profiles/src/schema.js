/**
 * Brand Profile Schema — M12.20
 *
 * Defines the shape of a reusable brand/profile configuration that overlays
 * on top of existing theme tokens. Each profile provides:
 *   - logoSafeArea: brand-specific safe-area margins (px)
 *   - allowedPalette: hex colors allowed in the deck
 *   - typographyRules: heading/body font families, size constraints
 *   - footerConvention: "none" | "slide-number" | "brand-name" | "both"
 *   - titlePlacement: "top" | "center"
 *   - requiredSlides: { titleSlide: boolean, closingSlide: boolean }
 *   - maxSlidesPerSection: section length limit
 *   - inheritsTheme: whether to inherit theme token colors/fonts
 */

const PROFILE_SCHEMA_VERSION = "1.0.0";

/**
 * Validate a profile object against the schema contract.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
function validateProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== "object") {
    return { valid: false, errors: ["Profile must be a non-null object"] };
  }

  // Required fields
  if (!profile.name && !profile.id) {
    errors.push("Profile must have 'name' or 'id' field");
  }

  // logoSafeArea (optional but validated if present)
  if (profile.logoSafeArea !== undefined) {
    const sa = profile.logoSafeArea;
    if (typeof sa !== "object" || sa === null) {
      errors.push("logoSafeArea must be an object {top, bottom, left, right}");
    } else {
      for (const key of ["top", "bottom", "left", "right"]) {
        if (sa[key] === undefined) {
          errors.push(`logoSafeArea.${key} is required`);
        } else if (typeof sa[key] !== "number" || sa[key] < 0) {
          errors.push(`logoSafeArea.${key} must be a non-negative number`);
        }
      }
    }
  }

  // allowedPalette (optional, validated if present)
  if (profile.allowedPalette !== undefined) {
    if (!Array.isArray(profile.allowedPalette)) {
      errors.push("allowedPalette must be an array of hex color strings");
    } else {
      for (let i = 0; i < profile.allowedPalette.length; i++) {
        const c = profile.allowedPalette[i];
        if (typeof c !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(c)) {
          errors.push(`allowedPalette[${i}] must be a hex color string (#RRGGBB), got "${c}"`);
        }
      }
    }
  }

  // typographyRules (optional, validated if present)
  if (profile.typographyRules !== undefined) {
    const tr = profile.typographyRules;
    if (typeof tr !== "object" || tr === null) {
      errors.push("typographyRules must be an object");
    } else {
      if (tr.headingFont && typeof tr.headingFont !== "string") {
        errors.push("typographyRules.headingFont must be a string");
      }
      if (tr.bodyFont && typeof tr.bodyFont !== "string") {
        errors.push("typographyRules.bodyFont must be a string");
      }
    }
  }

  // footerConvention (optional, enum check)
  if (profile.footerConvention !== undefined) {
    const validFooter = ["none", "slide-number", "brand-name", "both"];
    if (!validFooter.includes(profile.footerConvention)) {
      errors.push(
        `footerConvention must be one of ${validFooter.join(", ")}, got "${profile.footerConvention}"`,
      );
    }
  }

  // titlePlacement (optional, enum check)
  if (profile.titlePlacement !== undefined) {
    if (!["top", "center"].includes(profile.titlePlacement)) {
      errors.push(`titlePlacement must be "top" or "center", got "${profile.titlePlacement}"`);
    }
  }

  // requiredSlides (optional, validated if present)
  if (profile.requiredSlides !== undefined) {
    const rs = profile.requiredSlides;
    if (typeof rs !== "object" || rs === null) {
      errors.push("requiredSlides must be an object");
    } else {
      if (rs.titleSlide !== undefined && typeof rs.titleSlide !== "boolean") {
        errors.push("requiredSlides.titleSlide must be a boolean");
      }
      if (rs.closingSlide !== undefined && typeof rs.closingSlide !== "boolean") {
        errors.push("requiredSlides.closingSlide must be a boolean");
      }
    }
  }

  // maxSlidesPerSection (optional, number check)
  if (profile.maxSlidesPerSection !== undefined) {
    if (typeof profile.maxSlidesPerSection !== "number" || profile.maxSlidesPerSection <= 0) {
      errors.push("maxSlidesPerSection must be a positive number");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolve a profile name to its built-in definition, or return null if not found.
 */
const BUILTIN_PROFILES = new Set(["minimal-modern", "business-consulting", "academic-clean"]);

function getBuiltInProfiles() {
  return [...BUILTIN_PROFILES].sort();
}

function isBuiltinProfile(name) {
  return BUILTIN_PROFILES.has(name);
}

module.exports = {
  PROFILE_SCHEMA_VERSION,
  validateProfile,
  getBuiltInProfiles,
  isBuiltinProfile,
};
