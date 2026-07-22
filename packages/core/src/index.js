/**
 * @awe/core — Public API
 *
 * Re-exports from sub-packages for convenience.
 */
"use strict";

const { runPipeline } = require("@awe/presentation-pipeline");
const { compilePresentation, COMPILER_MODES, DEFAULT_MODE } = require("@awe/presentation-compiler");
const { adaptDeck, SPEAKER_PROFILES, AUDIENCE_ROLES, ADAPTATION_DIMENSIONS } = require("@awe/presentation-audience-engine");

module.exports = {
  // Pipeline
  runPipeline,

  // Compiler
  compilePresentation,
  COMPILER_MODES,
  DEFAULT_MODE,

  // Audience Engine
  adaptDeck,
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
  ADAPTATION_DIMENSIONS,
};
