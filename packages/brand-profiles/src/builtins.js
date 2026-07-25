/**
 * Built-in Brand Profiles — M12.20
 *
 * Three canonical brand profiles that combine theme tokens with brand-specific
 * rules for logo safe area, color palettes, typography, and slide conventions.
 */

"use strict";

/**
 * Minimal Modern — clean, tech-forward, startup-friendly.
 * Inherits from the minimal-modern theme token palette.
 */
const MINIMAL_MODERN = {
  id: "minimal-modern",
  name: "Minimal Modern",
  description: "Clean, tech-forward style for startups and SaaS products.",
  inheritsTheme: true,
  themeStyle: "minimal-modern",
  logoSafeArea: { top: 40, bottom: 40, left: 40, right: 40 },
  allowedPalette: [
    "#1A1A1A",
    "#6B7280",
    "#3B82F6",
    "#FFFFFF",
    "#F9FAFB",
    "#E5E7EB",
    "#111827",
    "#9CA3AF",
  ],
  typographyRules: {
    headingFont: "Inter, -apple-system, sans-serif",
    bodyFont: "Inter, -apple-system, sans-serif",
    monoFont: "JetBrains Mono, monospace",
    maxHeadingSize: 44,
    minBodySize: 13,
  },
  footerConvention: "slide-number",
  titlePlacement: "top",
  requiredSlides: { titleSlide: false, closingSlide: true },
  maxSlidesPerSection: 10,
};

/**
 * Business Consulting — conservative, authoritative, traditional.
 * Inherits from the business-consulting theme token palette.
 */
const BUSINESS_CONSULTING = {
  id: "business-consulting",
  name: "Business Consulting",
  description: "Conservative, authoritative style for consulting and corporate decks.",
  inheritsTheme: true,
  themeStyle: "business-consulting",
  logoSafeArea: { top: 50, bottom: 50, left: 50, right: 50 },
  allowedPalette: [
    "#1E3A5F",
    "#4A5568",
    "#D4A843",
    "#FFFFFF",
    "#F7F7F5",
    "#D4C5A9",
    "#1A202C",
    "#718096",
  ],
  typographyRules: {
    headingFont: "Georgia, serif",
    bodyFont: "Helvetica Neue, Arial, sans-serif",
    monoFont: "Courier New, monospace",
    maxHeadingSize: 40,
    minBodySize: 14,
  },
  footerConvention: "brand-name",
  titlePlacement: "top",
  requiredSlides: { titleSlide: true, closingSlide: true },
  maxSlidesPerSection: 8,
};

/**
 * Academic Clean — scholarly, readable, research-focused.
 * Inherits from the academic-clean theme token palette.
 */
const ACADEMIC_CLEAN = {
  id: "academic-clean",
  name: "Academic Clean",
  description: "Scholarly, high-readability style for research and education.",
  inheritsTheme: true,
  themeStyle: "academic-clean",
  logoSafeArea: { top: 30, bottom: 30, left: 30, right: 30 },
  allowedPalette: [
    "#2C3E50",
    "#5D6D7E",
    "#2980B9",
    "#FFFFFF",
    "#FDFDFD",
    "#DEE2E6",
    "#212529",
    "#6C757D",
  ],
  typographyRules: {
    headingFont: "Source Sans Pro, sans-serif",
    bodyFont: "Source Sans Pro, sans-serif",
    monoFont: "Source Code Pro, monospace",
    maxHeadingSize: 42,
    minBodySize: 14,
  },
  footerConvention: "both",
  titlePlacement: "top",
  requiredSlides: { titleSlide: true, closingSlide: true },
  maxSlidesPerSection: 12,
};

module.exports = {
  MINIMAL_MODERN,
  BUSINESS_CONSULTING,
  ACADEMIC_CLEAN,
  BUILTINS: {
    "minimal-modern": MINIMAL_MODERN,
    "business-consulting": BUSINESS_CONSULTING,
    "academic-clean": ACADEMIC_CLEAN,
  },
};
