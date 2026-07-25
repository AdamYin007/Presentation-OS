/**
 * @awe/template-injector — Template Decorative Elements Injection (M12.27)
 *
 * Takes a generated PPTX buffer and injects template-based decorative elements:
 *   1. Background images per slide role
 *   2. Role-to-template-slide mapping
 *   3. Fallback role detection from SlideSpecs
 *
 * This is extracted from pipeline.js to keep the orchestrator lean.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Defaults ─────────────────────────────────────────────────────

const FALLBACK_ROLE_MAP = {
  cover: 1, title: 1, agenda: 2, "section-divider": 3, content: 4, closing: 5,
};

const INJECTOR_SCRIPT = path.join(__dirname, "..", "scripts", "template-injector.py");

/**
 * Inject template decorative elements into a PPTX buffer.
 *
 * @param {Buffer} pptxBuffer - Raw PPTX buffer from renderer
 * @param {Array} slideSpecs - SlideSpec array for role inference
 * @param {object} opts - Template options
 * @param {string} opts.templatePath - Path to template PPTX
 * @param {string} [opts.templateSpecPath] - Path to template spec markdown
 * @param {string} [opts.templateBackgroundsDir] - Directory with background images
 * @param {Object} [opts.templateRoleMap] - Manual role→template slide mapping
 * @returns {{ buffer: Buffer, warnings: string[] }} New PPTX buffer + any warnings
 */
function injectTemplate(pptxBuffer, slideSpecs, opts = {}) {
  const warnings = [];

  if (!opts.templatePath) {
    return { buffer: pptxBuffer, warnings };
  }

  // ── Resolve role map ──────────────────────────────────────────

  let roleMap = opts.templateRoleMap || {};

  if (Object.keys(roleMap).length === 0 && opts.templateSpecPath) {
    try {
      const { parseTemplateSpec, generateRoleMap } = require("./template-parser.js");
      const specData = parseTemplateSpec(opts.templateSpecPath);
      const roleMapData = generateRoleMap(specData);
      roleMap = roleMapData.roleMap;
    } catch (e) {
      warnings.push(`Template spec parsing failed: ${e.message}`);
    }
  }

  // Build fallback role map from slide specs
  if (Object.keys(roleMap).length === 0) {
    roleMap = {};
    for (let i = 0; i < slideSpecs.length; i++) {
      const spec = slideSpecs[i];
      const slideNum = spec.index || (i + 1);
      const role = spec.role || "content";
      const tmplIdx = FALLBACK_ROLE_MAP[role];
      if (tmplIdx) {
        roleMap[String(slideNum)] = tmplIdx;
      }
    }
  }

  // ── Load template backgrounds ─────────────────────────────────

  if (opts.templateBackgroundsDir && !opts.templateBackgrounds) {
    try {
      const bgFiles = fs.readdirSync(opts.templateBackgroundsDir)
        .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
        .sort();
      if (bgFiles.length > 0) {
        const backgrounds = {};
        for (let i = 0; i < Math.min(bgFiles.length, slideSpecs.length); i++) {
          backgrounds[String(i + 1)] = path.join(opts.templateBackgroundsDir, bgFiles[i]);
        }
        opts.templateBackgrounds = backgrounds;
      }
    } catch (e) {
      warnings.push(`Background loading failed: ${e.message}`);
    }
  }

  // ── Run injection ─────────────────────────────────────────────

  const tmpDir = fs.mkdtempSync("/tmp/presentation-os-inject-");
  try {
    const inputPptx = path.join(tmpDir, "input.pptx");
    const outputPptx = path.join(tmpDir, "output.pptx");
    const roleMapPath = path.join(tmpDir, "role-map.json");

    fs.writeFileSync(inputPptx, pptxBuffer);
    fs.writeFileSync(roleMapPath, JSON.stringify(roleMap));

    execSync(
      `python3 "${INJECTOR_SCRIPT}" "${inputPptx}" "${opts.templatePath}" "${outputPptx}" "${roleMapPath}"`,
      { stdio: "pipe", timeout: 60000 }
    );

    return { buffer: fs.readFileSync(outputPptx), warnings };
  } catch (e) {
    warnings.push(`Template injection failed: ${e.message}`);
    return { buffer: pptxBuffer, warnings };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { injectTemplate };
