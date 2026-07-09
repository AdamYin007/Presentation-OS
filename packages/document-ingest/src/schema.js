/**
 * SourceDocumentModel schema definition.
 *
 * This is the generalized input representation contract defined in M12.0
 * (Section 6). Every content element extracted from a source document
 * (plain text, Markdown, DOCX, etc.) must conform to this schema so
 * downstream consumers (Intent Parser, Story Planner, DeckPlan, SlideSpec)
 * can rely on a stable, traceable data model.
 *
 * Schema overview:
 * {
 *   title: string,
 *   metadata: object,
 *   sections: Section[],
 *   paragraphs: ParagraphElement[],
 *   lists: ListElement[],
 *   tables: TableElement[],
 *   images: ImageElement[],
 *   dataBlocks: DataBlock[],
 *   sourceMap: SourceRef[]
 * }
 */

const SCHEMA_VERSION = "1.0.0";

/**
 * Create an empty SourceDocumentModel with the required top-level fields.
 * @param {object} options
 * @param {string} [options.title] — document title
 * @param {object} [options.metadata] — arbitrary key/value metadata
 * @returns {object} SourceDocumentModel
 */
function createEmptySourceDocumentModel({ title = "", metadata = {} } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    metadata,
    sections: [],
    paragraphs: [],
    lists: [],
    tables: [],
    images: [],
    dataBlocks: [],
    sourceMap: [],
  };
}

/**
 * Validate that an object conforms to the SourceDocumentModel contract.
 * Returns { ok: boolean, errors: string[] }.
 *
 * @param {object} model — the model to validate
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateSourceDocumentModel(model) {
  const errors = [];

  if (typeof model !== "object" || model === null) {
    return { ok: false, errors: ["SourceDocumentModel must be an object"] };
  }

  // Required top-level fields
  const requiredFields = [
    "schemaVersion",
    "title",
    "metadata",
    "sections",
    "paragraphs",
    "lists",
    "tables",
    "images",
    "dataBlocks",
    "sourceMap",
  ];

  for (const field of requiredFields) {
    if (!(field in model)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Array fields must be arrays
  const arrayFields = ["sections", "paragraphs", "lists", "tables", "images", "dataBlocks", "sourceMap"];
  for (const field of arrayFields) {
    if (field in model && !Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    }
  }

  // metadata must be an object
  if ("metadata" in model && typeof model.metadata !== "object") {
    errors.push('Field "metadata" must be an object');
  }

  // Validate sourceMap entries have required properties
  if (Array.isArray(model.sourceMap)) {
    model.sourceMap.forEach((ref, i) => {
      if (typeof ref !== "object" || ref === null) {
        errors.push(`sourceMap[${i}] must be an object`);
        return;
      }
      const sourceRefRequired = ["sourceId", "sourceType", "sourceOrder"];
      for (const key of sourceRefRequired) {
        if (!(key in ref)) {
          errors.push(`sourceMap[${i}] missing required property: ${key}`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  SCHEMA_VERSION,
  createEmptySourceDocumentModel,
  validateSourceDocumentModel,
};
