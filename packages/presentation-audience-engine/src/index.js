/**
 * @awe/audience-engine — Public API (M12.25)
 *
 * Universal dynamic adaptation engine. Adjusts presentation content
 * based on speaker profile AND audience role.
 */

"use strict";

const { adaptDeck } = require("./engine.js");
const { SPEAKER_PROFILES, AUDIENCE_ROLES, ADAPTATION_DIMENSIONS } = require("./schema.js");

module.exports = {
  adaptDeck,
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
  ADAPTATION_DIMENSIONS,
};
