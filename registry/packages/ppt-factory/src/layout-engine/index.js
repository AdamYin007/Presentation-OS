/**
 * Layout Engine v1 — index.js
 *
 * Phase 1: schema + planner only. No rendering, no pptxgenjs.
 *
 * Exports:
 *   compileLayoutPlan(slide, options?)  — main entry point
 *   schema (re-export)                   — constants and validators
 */

const { compileLayoutPlan } = require("./planner");
const schema = require("./schema");

module.exports = { compileLayoutPlan, schema };
