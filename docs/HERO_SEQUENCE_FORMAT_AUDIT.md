# Hero Sequence Story Format Audit

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR31D — audit of `digital-pathology-15-hero-sequence.json`
> **Governance**: RFC-0001 — documentation only, no code changes
> **Status**: Draft — awaiting review

---

## 1 Summary

`digital-pathology-15-hero-sequence.json` is **not a standard story file**.
It is a **hero sequence metadata file** that was placed in the `story/` directory,
causing confusion about whether it should be rendered as a standalone presentation.

**Key findings:**
- The file uses `slide_type` instead of `type` and `slide_no` instead of `no`.
- It lacks `name` and `title` at the top level.
- Its top-level structure (`meta`, `narrative_flow`, `transition_logic`) is designed for
  the Hero Engine, not for the layout engine or legacy renderers.
- It **cannot be rendered** as a standalone story in either legacy or adapter mode.
- Its intended purpose is to serve as a **hero sequence companion** to `digital-pathology-15.json`.

**Classification:** This file should be moved out of `story/` to a dedicated directory
(e.g., `hero-sequences/` or `presentation-dna/hero-layer/`).

---

## 2 Current Files

| File | Path | Purpose |
|---|---|---|
| `digital-pathology-15.json` | `story/digital-pathology-15.json` | Standard story file — renders successfully |
| `digital-pathology-15-hero-sequence.json` | `story/digital-pathology-15-hero-sequence.json` | Hero sequence metadata — **not renderable** |

The hero sequence file is auto-discovered by `run.js` when `--hero` flag is used:

```javascript
// run.js L41
heroSequencePath = path.join(process.cwd(), "story", storyName + "-hero-sequence.json");
```

This auto-discovery works correctly when `--hero` is passed alongside a standard story.

---

## 3 Schema Differences

### 3.1 Top-Level Structure

| Field | Standard Story | Hero Sequence | Notes |
|---|---|---|---|
| `name` | Present | Missing | Used for output filename |
| `title` | Present | Missing (in meta.title) | Used for slide titles |
| `audience` | Present | In meta | Location differs |
| `slides` | Array of 15 | Array of 15 | Same count |
| `style` | Present | Missing | Theme data absent |
| `meta` | Missing | Present | Hero metadata container |
| `narrative_flow` | Missing | Present | Act grouping |
| `transition_logic` | Missing | Present | Slide transitions |

### 3.2 Slide-Level Structure

| Field | Standard Story | Hero Sequence | Notes |
|---|---|---|---|
| `no` | Present | Missing | Hero uses `slide_no` |
| `slide_no` | Missing | Present | Different field name |
| `type` | Present | Missing | Hero uses `slide_type` |
| `slide_type` | Missing | Present | Different field name |
| `title` | Present | Missing | Hero uses `hero_statement` |
| `hero_statement` | Missing | Present | Hero metadata |
| `hero_pattern_id` | Missing | Present | Pattern reference |
| `visual_focus` | Missing | Present | Visual guidance |
| `decision_goal` | Missing | Present | Decision objective |
| `first_impression_5s` | Missing | Present | 5-second hook |
| `message` | Present | Missing | Legacy slide content |
| `pattern` | Present | Missing | Legacy slide content |

### 3.3 Slide Type Mapping

Both files describe the same 15 slides with identical slide types:

```
1: cover              1: cover
2: executive-summary  2: executive-summary
3: why-now            3: why-now
4: problem            4: problem
5: transformation     5: transformation
6: solution           6: solution
7: architecture       7: architecture
8: roadmap            8: roadmap
9: workflow           9: workflow
10: governance        10: governance
11: research          11: research
12: collaboration     12: collaboration
13: roi               13: roi
14: differentiation   14: differentiation
15: recommendation    15: recommendation
```

The slide content and ordering are identical. The hero-sequence file adds metadata on top.

---

## 4 Current Runtime Behavior

### 4.1 Standard Story + Hero Flag (Works)

```bash
node bin/run.js --story digital-pathology-15 --hero
```

Flow:
1. Loads `digital-pathology-15.json` (standard story)
2. Auto-discovers `digital-pathology-15-hero-sequence.json`
3. Calls `enrichStoryWithHero(story, heroSequence)`
4. Hero engine matches `slide.no` (from story) with `hs.slide_no` (from hero-sequence)
5. All 15 slides enriched with `hero` field
6. Layout engine compiles plans using `slide.type` and `slide.no`
7. Adapter rendering succeeds — 15/15 slides match

Result: **Success.** All 15 slides enriched and rendered.

### 4.2 Hero-Sequence as Standalone Story (Fails)

```bash
node bin/run.js --story digital-pathology-15-hero-sequence
```

Flow:
1. Loads `digital-pathology-15-hero-sequence.json`
2. `story.name` is **undefined** → output file named `undefined.pptx`
3. `story.slides[0].type` is **undefined** (field is `slide_type`)
4. Legacy renderer lookup: `getLegacyRenderer(undefined)` → **no renderer found**
5. No slide is rendered → empty PPTX (0 content slides, only masters/layouts)

Result: **Generates empty PPTX.** Filename is `undefined.pptx`. No content slides.

### 4.3 Hero-Sequence as Standalone Story + Layout Engine (Fails)

```bash
node bin/run.js --story digital-pathology-15-hero-sequence --layout-engine
```

Flow:
1. Loads `digital-pathology-15-hero-sequence.json`
2. `story.name` is **undefined**
3. Layout engine: `compileLayoutPlan(slide)` calls `planners[slide.type]`
4. `slide.type` is **undefined** → falls through to `generic` planner
5. Generic planner: `buildLayoutPlan({ slideNo: slide.no, slideType: slide.type, ... })`
6. `slide.no` is **undefined**, `slide.type` is **undefined**
7. Schema validation throws: `buildLayoutPlan: slideNo, slideType, flow, density, zones are required`

Result: **Crashes with schema validation error.**

### 4.4 Hero-Sequence as Standalone Story + Hero Flag (Fails)

```bash
node bin/run.js --story digital-pathology-15-hero-sequence --hero
```

Flow:
1. Loads `digital-pathology-15-hero-sequence.json`
2. Looks for `digital-pathology-15-hero-sequence-hero-sequence.json` (appends `-hero-sequence`)
3. File not found → falls back to original story without hero enrichment
4. Same failure as 4.2: undefined type, undefined name

Result: **Falls back to broken legacy rendering.**

---

## 5 Root Cause

The hero-sequence file was designed for a **different purpose** than the standard story format:

| Aspect | Standard Story | Hero Sequence |
|---|---|---|
| **Purpose** | Render as PPTX | Provide metadata for Hero Engine |
| **Slide ID field** | `no` | `slide_no` |
| **Slide type field** | `type` | `slide_type` |
| **Slide title** | `title` | `hero_statement` |
| **Slide content** | `message`, `pattern` | `decision_goal`, `visual_focus` |
| **Top-level name** | `name` | `meta.story_id` |
| **Top-level title** | `title` | `meta.title` |
| **Metadata** | `audience`, `style` | `narrative_flow`, `transition_logic`, `meta` |

**The hero-engine.js correctly bridges the two formats:**
- It reads `hs.slide_no` from hero-sequence
- It matches against `slide.no` from standard story
- It enriches the standard story with `hero` fields

**But when the hero-sequence file is used AS the story:**
- `compileLayoutPlan` accesses `slide.type` → undefined
- `compileLayoutPlan` accesses `slide.no` → undefined
- `getLegacyRenderer` accesses `s.type` → undefined
- Output filename uses `story.name` → undefined

This is a **format incompatibility**, not a bug in the adapters or renderers.

---

## 6 Options

### Option A — Move hero-sequence to hero-sequences/ directory

Move the file from `story/` to `hero-sequences/` (or `presentation-dna/hero-layer/`).

**Pros:**
- Clearly distinguishes hero sequence metadata from renderable stories
- Prevents accidental use as a standalone story
- Aligns with hero-engine.js auto-discovery pattern
- No code changes required (run.js already looks for `<name>-hero-sequence.json`)

**Cons:**
- run.js L41 uses `path.join("story", storyName + "-hero-sequence.json")` — would need to update the search path
- Breaking change if other tools reference `story/*-hero-sequence.json`

**Required code change:** Update run.js L41 to search `hero-sequences/` instead of `story/`.

### Option B — Add story format compatibility layer

Make `compileLayoutPlan` and `getLegacyRenderer` accept both `type`/`no` and `slide_type`/`slide_no`.

**Pros:**
- Hero-sequence could render as a standalone story
- No file movement needed

**Cons:**
- Introduces dual-field support in layout engine — increases complexity
- Hero-sequence slides lack `title`, `message`, `pattern` — content would be incomplete
- Hero-sequence has no `style` field — theme resolution would fail
- **Violates PR31D constraint: "Do not modify layout planners"**

### Option C — Create a wrapper adapter

Build a thin adapter that transforms hero-sequence format to standard format at runtime.

**Pros:**
- Keeps hero-sequence format intact
- Provides standalone rendering capability

**Cons:**
- Adds another layer of indirection
- Hero-sequence slides lack renderable content (`title`, `message`, `pattern`)
- Would need to synthesize content from `hero_statement`, `decision_goal`, etc.
- **Significant scope creep for a documentation audit**

### Option D — Keep as-is and document as non-runtime asset

Leave the file in `story/` but explicitly document it as **not a renderable story**.

**Pros:**
- Zero code changes
- Zero risk of breaking existing hero-engine auto-discovery
- Clear documentation prevents misuse
- Aligns with RFC governance: document, don't refactor

**Cons:**
- File sits in `story/` which implies "this is a story"
- New contributors may mistakenly try `--story digital-pathology-15-hero-sequence`

**Recommendation: Option D is the safest short-term choice. Option A is the correct long-term fix.**

---

## 7 Recommendation

**Immediate (PR31D scope):** Document hero-sequence as a non-runtime asset.

**Long-term (separate PR):** Move hero-sequence files to `hero-sequences/` directory and update run.js auto-discovery path.

**Rationale:**
1. The hero-sequence file serves a valid purpose — it provides metadata for the Hero Engine.
2. It was never designed to be rendered as a standalone story.
3. The hero-engine.js correctly bridges the two formats when used as intended.
4. Moving the file is a low-risk change that improves clarity.
5. Adding compatibility layers (Options B/C) introduces unnecessary complexity.

**Priority:** Low. This is a documentation/cleanup task, not a blocker for M3 completion.

---

## 8 Next Step

1. **Document this audit** in `docs/HERO_SEQUENCE_FORMAT_AUDIT.md` ← current PR
2. **Update `docs/M3_ALL_STORY_RENDERING_VALIDATION.md`** to explicitly classify hero-sequence
3. **Consider a follow-up PR** to move hero-sequence files to `hero-sequences/` directory
4. **Do NOT start hero-sequence rendering support** — it is out of scope for M3

---

## Appendix: Git History

| Commit | Scope |
|---|---|
| `e2cf108` | docs: document adapter-first default rendering (PR31C) |
| `6d0682d` | feat(renderer): enable adapter rendering by default with legacy rollback (PR31B) |
| `0c8258a` | docs: audit all-story rendering validation (PR31A) |
| `ba7b718` | refactor(renderer): remove dead dispatcher code (PR30) |


