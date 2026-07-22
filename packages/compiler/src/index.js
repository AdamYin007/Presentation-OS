/**
 * @awe/compiler — Public API
 */
"use strict";

const { compilePresentation } = require("@awe/presentation-compiler");
const { COMPILER_MODES, DEFAULT_MODE } = require("@awe/presentation-compiler");

module.exports = {
  compilePresentation,
  COMPILER_MODES,
  DEFAULT_MODE,
};
