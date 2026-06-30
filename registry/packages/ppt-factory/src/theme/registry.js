/**
 * Theme Registry — theme store with CRUD operations.
 *
 * Pure data operations. No rendering, no pptxgenjs.
 */

const { createMedicalConsultingTheme } = require("./defaults");

/**
 * Initialize the theme registry with built-in presets.
 */
const registry = new Map();

function initRegistry() {
  if (registry.size > 0) return; // already initialized
  registry.set("medical-consulting", createMedicalConsultingTheme());
}

/**
 * Get a theme by name. Returns a deep copy to prevent mutation.
 * @param {string} name - Theme name
 * @returns {object|null} Theme object or null if not found
 */
function getTheme(name) {
  initRegistry();
  const theme = registry.get(name);
  if (!theme) return null;
  return JSON.parse(JSON.stringify(theme));
}

/**
 * Create and register a new theme.
 * @param {string} name - Theme name
 * @param {object} themeDef - Theme definition (colors, fonts, dimensions)
 * @returns {object} The registered theme (deep copy)
 */
function createTheme(name, themeDef) {
  initRegistry();
  if (registry.has(name)) {
    throw new Error(`Theme "${name}" already exists. Use updateTheme() to modify.`);
  }
  const theme = {
    name,
    colors: { ...themeDef.colors },
    fonts: themeDef.fonts || {},
    dimensions: themeDef.dimensions || {},
    spacing: themeDef.spacing || {},
  };
  registry.set(name, theme);
  return JSON.parse(JSON.stringify(theme));
}

/**
 * List all registered theme names.
 * @returns {string[]} Array of theme names
 */
function listThemes() {
  initRegistry();
  return Array.from(registry.keys());
}

module.exports = { getTheme, createTheme, listThemes };
