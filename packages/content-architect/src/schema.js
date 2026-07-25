/**
 * @awe/content-architect — JSON Schema definition (M12.28)
 *
 * Defines the output contract for the Content Architect module.
 * All slides must conform to this structure.
 */

const LAYOUT_TYPES = [
  "Cover",
  "SectionDivider",
  "TitleAndContent",
  "TwoColumns",
  "ThreeColumns",
  "BigNumber",
  "Quote",
  "Timeline",
  "Matrix",
  "End",
];

const VALID_ROLE_MAP = {
  Cover: "title",
  SectionDivider: "section-divider",
  TitleAndContent: "content",
  TwoColumns: "content",
  ThreeColumns: "content",
  BigNumber: "data-chart",
  Quote: "quote",
  Timeline: "timeline",
  Matrix: "matrix",
  End: "closing",
};

function validateArchitectOutput(slides) {
  const errors = [];

  if (!Array.isArray(slides)) {
    return { ok: false, errors: ["Output must be an array of slide objects"] };
  }

  if (slides.length < 3) {
    errors.push(`Minimum 3 slides required, got ${slides.length}`);
  }

  if (slides.length > 40) {
    errors.push(`Maximum 40 slides allowed, got ${slides.length}`);
  }

  // First slide must be Cover
  if (slides[0] && slides[0].type !== "Cover") {
    errors.push("First slide must have type 'Cover'");
  }

  // Last slide should be End or TitleAndContent
  const lastSlide = slides[slides.length - 1];
  if (lastSlide && lastSlide.type !== "End" && lastSlide.type !== "TitleAndContent") {
    // Not a hard error — just a warning
  }

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const prefix = `Slide ${i + 1} (id=${slide.slide_id})`;

    // Required fields
    if (typeof slide.slide_id !== "number" || slide.slide_id <= 0) {
      errors.push(`${prefix}: slide_id must be a positive integer`);
    }

    if (!LAYOUT_TYPES.includes(slide.type)) {
      errors.push(`${prefix}: invalid type "${slide.type}". Must be one of: ${LAYOUT_TYPES.join(", ")}`);
    }

    if (typeof slide.title !== "string" || !slide.title.trim()) {
      errors.push(`${prefix}: title is required and must be non-empty`);
    } else if (slide.title.length > 60) {
      errors.push(`${prefix}: title too long (${slide.title.length} chars), recommend ≤10 Chinese characters`);
    }

    if (slide.type === "Cover" && (!slide.subtitle || !slide.subtitle.trim())) {
      errors.push(`${prefix}: Cover slide requires a subtitle`);
    }

    if (slide.content !== undefined && !Array.isArray(slide.content)) {
      errors.push(`${prefix}: content must be an array`);
    }

    // Body item validation
    if (Array.isArray(slide.content)) {
      for (let j = 0; j < slide.content.length; j++) {
        const item = slide.content[j];
        if (typeof item !== "string") {
          errors.push(`${prefix}[${j}]: content items must be strings`);
        } else if (item.length > 80) {
          errors.push(`${prefix}[${j}]: content item too long (${item.length} chars), recommend ≤20 Chinese characters`);
        }
      }

      // KISS rule: max 5 bullets per slide
      if (slide.content.length > 5) {
        errors.push(`${prefix}: too many content items (${slide.content.length}), max 5 recommended`);
      }
    }

    // Visual suggestion should exist for non-special slides
    if (slide.type !== "Cover" && slide.type !== "SectionDivider" && slide.type !== "End") {
      if (!slide.visual_suggestion || !slide.visual_suggestion.trim()) {
        errors.push(`${prefix}: non-special slides should have a visual_suggestion`);
      }
    }

    // Section divider validation
    if (slide.type === "SectionDivider" && (!slide.content || slide.content.length > 0)) {
      // Section dividers typically have no body content
    }

    // TwoColumns / ThreeColumns structure check
    if (slide.type === "TwoColumns" || slide.type === "ThreeColumns") {
      // Support both old content[] format and new columns[] format
      if (Array.isArray(slide.content) && slide.content.length > 0 && typeof slide.content[0] === "object" && slide.content[0].label) {
        // New format: content is [{label, bullets[]}]
        const colCount = slide.content.length;
        if (slide.type === "TwoColumns" && colCount !== 2) {
          errors.push(`${prefix}: TwoColumns requires exactly 2 columns in content array`);
        } else if (slide.type === "ThreeColumns" && colCount !== 3) {
          errors.push(`${prefix}: ThreeColumns requires exactly 3 columns in content array`);
        }
        for (let ci = 0; ci < slide.content.length; ci++) {
          const col = slide.content[ci];
          if (!col.label || !col.bullets || !Array.isArray(col.bullets)) {
            errors.push(`${prefix}[column ${ci}]: must have 'label' and 'bullets[]' fields`);
          }
        }
      } else if (slide.columns) {
        // Legacy columns format
        if (slide.type === "TwoColumns" && slide.columns.length !== 2) {
          errors.push(`${prefix}: TwoColumns requires exactly 2 columns`);
        } else if (slide.type === "ThreeColumns" && slide.columns.length !== 3) {
          errors.push(`${prefix}: ThreeColumns requires exactly 3 columns`);
        }
      }
    }
    
    // BigNumber structure check
    if (slide.type === "BigNumber") {
      // Should have numeric content or metrics
      const hasNumeric = Array.isArray(slide.content) && slide.content.length > 0 && slide.content.some(c => 
        (typeof c === "string" && /\d/.test(c)) ||
        (typeof c === "object" && c && (c.value || c.label))
      );
      if (!hasNumeric) {
        errors.push(`${prefix}: BigNumber should contain numeric data`);
      }
      // BigNumber should have exactly 1-3 big numbers
      const count = Array.isArray(slide.content) ? slide.content.filter(c => typeof c === "string" && /\d/.test(c)).length : 0;
      if (count > 3) {
        errors.push(`${prefix}: BigNumber should have at most 3 data points, got ${count}`);
      }
    }
    
    // Timeline structure check
    if (slide.type === "Timeline") {
      // Should have sequential steps with at least 2 and at most 8 events
      const stepCount = Array.isArray(slide.content) ? slide.content.length : 0;
      if (stepCount < 2) {
        errors.push(`${prefix}: Timeline should have at least 2 steps, got ${stepCount}`);
      }
      if (stepCount > 8) {
        errors.push(`${prefix}: Timeline should have at most 8 steps, got ${stepCount}`);
      }
      // Each timeline item should have a title and optionally description
      for (let ti = 0; ti < stepCount; ti++) {
        const item = slide.content[ti];
        if (typeof item === "string") continue; // legacy string format is OK
        if (typeof item === "object" && item) {
          if (!item.title && !item.event) {
            errors.push(`${prefix}[step ${ti}]: Timeline item must have 'title' or 'event' field`);
          }
        }
      }
    }

    // Quote structure check
    if (slide.type === "Quote") {
      // Should have a quote text and optionally an attribution
      const hasQuote = Array.isArray(slide.content) && slide.content.length > 0;
      if (!hasQuote) {
        errors.push(`${prefix}: Quote slide should have at least one quote text`);
      }
    }

    // Matrix structure check
    if (slide.type === "Matrix") {
      // Should have 4 quadrants with labels and descriptions
      if (Array.isArray(slide.content) && slide.content.length > 0) {
        const hasQuadrants = slide.content.every((q, i) => {
          if (typeof q === "object" && q) {
            return q.label || q.title || q.name;
          }
          return false;
        });
        if (!hasQuadrants) {
          errors.push(`${prefix}: Matrix should have labeled quadrants in content array`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Map architect layout type to SlideSpec role.
 */
function mapLayoutToRole(layoutType) {
  return VALID_ROLE_MAP[layoutType] || "content";
}

/**
 * Map architect layout type to SlideSpec layout family.
 */
function mapLayoutToSlideSpecLayout(layoutType) {
  const mapping = {
    Cover: "title-slide",
    SectionDivider: "section-divider",
    TitleAndContent: "title-and-bullets",
    TwoColumns: "two-column",
    ThreeColumns: "three-card",
    BigNumber: "kpi-cards",
    Quote: "quote",
    Timeline: "timeline",
    Matrix: "matrix",
    End: "closing",
  };
  return mapping[layoutType] || "title-and-bullets";
}

module.exports = {
  LAYOUT_TYPES,
  VALID_ROLE_MAP,
  validateArchitectOutput,
  mapLayoutToRole,
  mapLayoutToSlideSpecLayout,
};
