// Presentation Component Library v1 — barrel export

const { C, makeFooter, makeTitle } = require("./helpers");
const { card } = require("./card");
const { timeline } = require("./timeline");
const { platformHub } = require("./platform-hub");
const { layeredArchitecture } = require("./layered-architecture");

module.exports = {
  // Palette
  C,

  // Helpers
  makeFooter,
  makeTitle,

  // Components
  card,
  timeline,
  platformHub,
  layeredArchitecture
};
