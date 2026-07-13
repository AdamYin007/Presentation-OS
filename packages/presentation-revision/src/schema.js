/**
 * Revision schema definitions for M12.9.
 */

const REVISION_SCHEMA_VERSION = "1.0.0";

const VALID_OPERATIONS = [
  "replace-slide-layout",
  "modify-title",
  "modify-body",
  "delete-slide",
  "add-slide",
  "reorder-slides",
  "change-theme",
  "compress-count",
  "expand-count",
  "add-notes",
  "change-audience",
  "change-duration",
];

const DEFAULT_REVISION_RESULT = {
  schemaVersion: REVISION_SCHEMA_VERSION,
  success: false,
  appliedOperations: [],
  warnings: [],
  slideCountBefore: 0,
  slideCountAfter: 0,
  slideSpecs: [],
  deckPlan: null,
};

module.exports = {
  REVISION_SCHEMA_VERSION,
  VALID_OPERATIONS,
  DEFAULT_REVISION_RESULT,
};
