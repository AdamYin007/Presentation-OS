/**
 * Platform-aware path resolution for Presentation OS.
 *
 * Provides configurable paths for external tools (LibreOffice, ImageMagick, etc.)
 * with sensible defaults per platform and environment variable overrides.
 *
 * Usage:
 *   const { getToolPath } = require('./packages/presentation-pipeline/src/tool-paths.js');
 *   const soffice = getToolPath('soffice'); // Returns path or null
 */

"use strict";

const path = require("path");

// ── Default tool paths by platform ───────────────────────────────

const DEFAULT_PATHS = {
  darwin: {
    soffice: "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    identify: "identify",       // ImageMagick on PATH
    magick: "magick",           // ImageMagick 7+ on PATH
    pdfinfo: "pdfinfo",         // Poppler on PATH
    pdftotext: "pdftotext",     // Poppler on PATH
    python3: "python3",         // System Python on PATH
  },
  win32: {
    soffice: "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    identify: "identify",
    magick: "magick",
    pdfinfo: "pdfinfo",
    pdftotext: "pdftotext",
    python3: "python",
  },
  linux: {
    soffice: "/usr/lib/libreoffice/program/soffice",
    identify: "identify",
    magick: "magick",
    pdfinfo: "pdfinfo",
    pdftotext: "pdftotext",
    python3: "python3",
  },
};

const PLATFORM = process.platform;
const PATHS = DEFAULT_PATHS[PLATFORM] || DEFAULT_PATHS.darwin;

/**
 * Get the path to an external tool.
 * Priority: env var > default path > command on PATH (via which).
 * @param {string} toolName - Tool identifier (e.g., 'soffice', 'identify')
 * @returns {string|null} Absolute path or null if not found
 */
function getToolPath(toolName) {
  // 1. Environment variable override
  const envKey = toolName.toUpperCase().replace(/[^A-Z]/g, "_");
  const envPath = process.env[`LIBREOFFICE_PATH`] || process.env[`AWE_${envKey}`];
  if (envPath && envPath !== "") return envPath;

  // 2. Default path
  const defaultPath = PATHS[toolName];
  if (!defaultPath) return null;

  // For commands expected on PATH, just return the name
  if (["identify", "magick", "pdfinfo", "pdftotext", "python3"].includes(toolName)) {
    return defaultPath; // caller uses execSync(`which ${name}`) to verify
  }

  // 3. Check if default path exists
  const fs = require("fs");
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return null;
}

/**
 * Check if a tool is available on this system.
 * @param {string} toolName
 * @returns {boolean}
 */
function toolExists(toolName) {
  const p = getToolPath(toolName);
  if (!p) return false;

  const cp = require("child_process");
  try {
    // For PATH commands, check via 'which' / 'where'
    if (["identify", "magick", "pdfinfo", "pdftotext", "python3"].includes(toolName)) {
      cp.execSync(`which ${p}`, { stdio: "ignore" });
      return true;
    }
    // For absolute paths, check existence
    return require("fs").existsSync(p);
  } catch {
    return false;
  }
}

module.exports = { getToolPath, toolExists };
