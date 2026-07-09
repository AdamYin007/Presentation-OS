/**
 * Theme and Layout System Schema — M12.5
 *
 * Defines layout families, theme tokens, and the LayoutPlan contract.
 */

const LAYOUT_FAMILIES = [
  "title-slide", "agenda", "section-divider", "executive-summary",
  "title-and-bullets", "two-column", "three-card", "image-and-text",
  "comparison", "horizontal-process", "vertical-process", "timeline",
  "roadmap", "kpi-cards", "chart-and-insight", "full-width-chart",
  "table", "matrix", "architecture", "case-study", "recommendation",
  "quote", "q-and-a", "closing",
];

const THEME_TOKENS = {
  "minimal-modern": {
    name: "Minimal Modern",
    colors: {
      primary: "#1A1A1A",
      secondary: "#6B7280",
      accent: "#3B82F6",
      background: "#FFFFFF",
      surface: "#F9FAFB",
      border: "#E5E7EB",
      text: "#111827",
      muted: "#9CA3AF",
    },
    fonts: {
      heading: "Inter, -apple-system, sans-serif",
      body: "Inter, -apple-system, sans-serif",
      mono: "JetBrains Mono, monospace",
    },
    spacing: { unit: 8, scale: [0, 4, 8, 16, 24, 32, 48, 64] },
    borderRadius: 8,
    shadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  "business-consulting": {
    name: "Business Consulting",
    colors: {
      primary: "#1E3A5F",
      secondary: "#4A5568",
      accent: "#D4A843",
      background: "#FFFFFF",
      surface: "#F7F7F5",
      border: "#D4C5A9",
      text: "#1A202C",
      muted: "#718096",
    },
    fonts: {
      heading: "Georgia, serif",
      body: "Helvetica Neue, Arial, sans-serif",
      mono: "Courier New, monospace",
    },
    spacing: { unit: 8, scale: [0, 8, 16, 24, 32, 48, 64, 96] },
    borderRadius: 0,
    shadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  "academic-clean": {
    name: "Academic Clean",
    colors: {
      primary: "#2C3E50",
      secondary: "#5D6D7E",
      accent: "#2980B9",
      background: "#FFFFFF",
      surface: "#FDFDFD",
      border: "#DEE2E6",
      text: "#212529",
      muted: "#6C757D",
    },
    fonts: {
      heading: "Source Sans Pro, sans-serif",
      body: "Source Sans Pro, sans-serif",
      mono: "Source Code Pro, monospace",
    },
    spacing: { unit: 8, scale: [0, 4, 8, 16, 24, 32, 48] },
    borderRadius: 4,
    shadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
};

const DEFAULT_THEME = "minimal-modern";

function getThemeTokens(themeName) {
  return THEME_TOKENS[themeName] || THEME_TOKENS[DEFAULT_THEME];
}

module.exports = {
  LAYOUT_FAMILIES,
  THEME_TOKENS,
  DEFAULT_THEME,
  getThemeTokens,
};
