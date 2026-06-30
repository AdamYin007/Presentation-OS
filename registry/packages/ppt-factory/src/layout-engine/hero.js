/**
 * Hero info extraction — shared utility for Layout Engine and Content Engine.
 *
 * Pure function. Does NOT depend on pptxgenjs, theme, or rendering.
 */

/**
 * Extract hero metadata from a slide.
 * @param {object} slide - story slide (may have .hero from hero-engine)
 * @returns {{ patternId: string|null, statement: string|null, visualFocus: string|null }}
 */
function extractHeroInfo(slide) {
  if (!slide.hero) {
    return { patternId: null, statement: null, visualFocus: null };
  }
  return {
    patternId: slide.hero.pattern_id || null,
    statement: slide.hero.statement || null,
    visualFocus: slide.hero.visual_focus || null,
  };
}

module.exports = { extractHeroInfo };
