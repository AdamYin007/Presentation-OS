/**
 * @awe/presentation-compiler — Public API (M12.24)
 *
 * Global optimization layer between layout/theme engines and renderer.
 */

"use strict";

const { compilePresentation } = require("./compiler.js");
const { COMPILER_MODES, DEFAULT_MODE } = require("./schema.js");

module.exports = {
  compilePresentation,
  COMPILER_MODES,
  DEFAULT_MODE,
};
