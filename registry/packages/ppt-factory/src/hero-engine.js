'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Hero Engine Phase 1 — Enrich a story with hero metadata from a hero sequence.
 *
 * This is a pure function with no side effects. It never mutates the input
 * `story` object (deep copies it) and never mutates `heroSequence`.
 *
 * @param {object} story - Story JSON (immutable, will be deep-copied)
 * @param {object|null} [heroSequence] - Hero sequence JSON, or null/undefined
 * @param {object} [options] - Optional behavior controls
 * @param {boolean} [options.overrideTitle=false] - When true, hero.statement
 *   replaces slide.title. When false (default), title is preserved and
 *   hero.statement is available only on slide.hero.statement.
 * @param {string} [options.libraryPath] - Absolute path to hero-library.json.
 *   If omitted, attempts to resolve from project root.
 * @returns {object} Enriched story (deep copy with hero fields added)
 */
function enrichStoryWithHero(story, heroSequence, options) {
  const opts = Object.assign({}, options);
  if (typeof opts.overrideTitle !== 'boolean') opts.overrideTitle = false;

  // --- Passthrough when no hero sequence ---
  if (!heroSequence || !heroSequence.slides || heroSequence.slides.length === 0) {
    return JSON.parse(JSON.stringify(story));
  }

  // --- Load hero library for layout_hint derivation (best-effort) ---
  const heroPatterns = loadHeroLibrary(opts.libraryPath);
  const patternMap = new Map();
  for (const p of heroPatterns) {
    patternMap.set(p.id, p);
  }

  // --- Deep copy story ---
  const enriched = JSON.parse(JSON.stringify(story));

  // --- Build a lookup: story slide no → index ---
  const storyIndex = new Map();
  enriched.slides.forEach((slide, idx) => {
    storyIndex.set(slide.no, idx);
  });

  // --- Merge hero metadata into matching slides ---
  const matchedSlides = [];
  const unmatchedSeqNos = [];

  for (const hs of heroSequence.slides) {
    const idx = storyIndex.get(hs.slide_no);
    if (idx === undefined) {
      unmatchedSeqNos.push(hs.slide_no);
      continue;
    }

    const slide = enriched.slides[idx];

    // Derive layout_hint from hero-library.json
    let layoutHint = null;
    if (hs.hero_pattern_id && patternMap.has(hs.hero_pattern_id)) {
      layoutHint = patternMap.get(hs.hero_pattern_id).recommended_layout || null;
    }

    // Build the hero object
    const hero = {
      pattern_id: hs.hero_pattern_id || null,
      statement: hs.hero_statement || '',
      visual_focus: hs.visual_focus || null,
      decision_goal: hs.decision_goal || null,
      first_impression_5s: hs.first_impression_5s || null,
    };

    if (layoutHint) {
      hero.layout_hint = layoutHint;
    }

    if (hs.estimated_reveal_time_s != null) {
      hero.estimated_reveal_time_s = hs.estimated_reveal_time_s;
    }

    // Preserve original title before potential override
    hero.original_title = slide.title;

    // Optional: override slide.title with hero.statement
    if (opts.overrideTitle && hs.hero_statement) {
      slide.title = hs.hero_statement;
    }

    slide.hero = hero;
    matchedSlides.push(hs.slide_no);
  }

  // --- Attach _meta ---
  enriched._meta = {
    hero_engine_version: '1.0.0',
    hero_sequence_source: heroSequence.meta ? heroSequence.meta.story_id : null,
    generated_at: new Date().toISOString(),
    narrative_arc: heroSequence.meta ? heroSequence.meta.narrative_arc : null,
    matched_slides: matchedSlides,
    unmatched_sequence_slides: unmatchedSeqNos.length > 0 ? unmatchedSeqNos : undefined,
  };

  // Suppress unused _meta field warning if unmatched is undefined
  if (!unmatchedSeqNos.length) {
    delete enriched._meta.unmatched_sequence_slides;
  }

  return enriched;
}

/**
 * Load hero-library.json patterns array.
 * Best-effort: returns [] if file missing or malformed.
 *
 * @param {string|null} [libraryPath] - Absolute path to hero-library.json
 * @returns {Array<object>} Array of pattern objects with id and recommended_layout
 */
function loadHeroLibrary(libraryPath) {
  if (libraryPath) {
    try {
      const raw = fs.readFileSync(libraryPath, 'utf8');
      const lib = JSON.parse(raw);
      return Array.isArray(lib.patterns) ? lib.patterns : [];
    } catch (e) {
      // Silently fall through — layout_hint will be null for all slides
      return [];
    }
  }

  // Try to resolve from common project locations
  const candidates = [
    path.join(__dirname, '..', '..', '..', '..', 'presentation-dna', 'hero-layer', 'hero-library.json'),
    path.join(process.cwd(), 'presentation-dna', 'hero-layer', 'hero-library.json'),
  ];

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const lib = JSON.parse(raw);
      return Array.isArray(lib.patterns) ? lib.patterns : [];
    } catch (_) {
      continue;
    }
  }

  return [];
}

module.exports = { enrichStoryWithHero };
