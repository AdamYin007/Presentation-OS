# M12.3 Story Planner Specification

> **Version**: 1.0.0  
> **Date**: 2026-07-09  
> **Status**: Implemented  
> **Next**: M12.4 SlideSpec Contract

## Overview

The Story Planner converts a `PresentationIntent` (and optional `SourceDocumentModel`) into a `DeckPlan`. It selects an audience-appropriate narrative pattern, allocates slide budgets per section, generates slide planning entries with roles and visual suggestions, preserves source references where possible, and records assumptions and warnings.

**Domain-agnostic.** No LLM or cloud dependency. Deterministic heuristics only.

## Input Contracts

### PresentationIntent

Defined in M12.2 (`packages/intent-parser/src/schema.js`). Key fields used by the planner:

| Field | Usage |
|---|---|
| `purpose` | Primary signal for narrative pattern selection |
| `audience` | Audience-specific hints (student → education, management → executive) |
| `domain` | Domain hint (education, research, technical, business) |
| `targetSlideCount` | Total slide budget to distribute across sections |
| `language` | Output language for deck title/subtitle |
| `speakerNotes` | Whether to add a closing slide |
| `mustInclude` | Items that may generate warnings if not covered |

### SourceDocumentModel (optional)

Defined in M12.1 (`packages/document-ingest/src/schema.js`). Used for:

- Overriding `deckTitle` from `sourceDocument.title`
- Boosting slide allocation for sections with more matching content
- Populating `sourceRefs` on slide planning entries

## Output Contract: DeckPlan

```json
{
  "schemaVersion": "1.0.0",
  "deckTitle": "",
  "subtitle": "",
  "audience": "",
  "purpose": "",
  "narrativePattern": "",
  "sections": [
    {
      "id": "",
      "title": "",
      "purpose": "",
      "keyMessage": "",
      "slideAllocation": 0,
      "sourceRefs": []
    }
  ],
  "slides": [
    {
      "slideId": "slide-001",
      "index": 1,
      "role": "",
      "section": "",
      "objective": "",
      "keyMessage": "",
      "candidateVisual": "",
      "sourceRefs": []
    }
  ],
  "assumptions": [],
  "warnings": []
}
```

## Narrative Patterns

10 deterministic patterns selected by scoring:

| Pattern ID | When Used |
|---|---|
| `exec-summary-evidence-recommendation` | Business review, management audience, purpose=review |
| `problem-insight-solution-action` | Persuade/sell proposals |
| `why-what-how-value` | Product pitches, propose |
| `current-gap-target-roadmap` | Strategic planning, propose/review |
| `objective-progress-issues-next-steps` | Status updates, review/inform |
| `background-method-results-discussion` | Research briefing, academic audience |
| `concept-example-practice-summary` | Education, teaching purpose |
| `context-analysis-conclusion` | General analysis, fallback default |
| `market-product-advantage-business-model` | Sales pitches, market-focused |
| `proposal-scope-plan-budget-risk` | Project proposals |

Scoring weights:
- Purpose match: +10
- Domain match: +5
- Audience hints: +6–10 (teaching patterns boosted for student audiences)
- Slide count fit: +1–3 (based on closeness to target)
- Special bonuses: +3 for exec-summary on review, +2 for problem-solution on sell/propose

## Section-to-Slide Mapping

Each section gets a `slideAllocation` proportional to the total target count. Content slides are generated with roles derived from section type:

| Section | Typical Slide Roles |
|---|---|
| Executive Summary | executive-summary, content |
| Evidence | content, data-chart, table |
| Recommendation | recommendation |
| Background/Method | content, process |
| Concept/Example | content, case-study |
| Progress/Issues | content, matrix |

Section divider slides are inserted between sections. A closing slide is added when `speakerNotes !== false`.

## Source Reference Preservation

Source document paragraphs are matched to planned slides using keyword-based matching. The `SECTION_KEYWORD_MAP` maps narrative section titles to bilingual keywords (English + Chinese). A paragraph's `sectionPath` and `originalText` are checked against these keywords.

## Assumptions and Warnings

**Assumptions recorded:**
- Deck title inferred from source document when intent topic is empty
- Default narrative pattern used when no strong signal detected

**Warnings generated:**
- Slide budget exceeds 25 or below 4
- `mustInclude` items not covered by planned slide content

## Module Structure

```
packages/story-planner/
├── package.json
├── src/
│   ├── index.js          # Public API: planDeck()
│   ├── planner.js        # Core planning logic
│   ├── schema.js         # DeckPlan contract + validation
│   └── narrative-patterns.js  # Pattern definitions + selection
```

## Validation

`validateDeckPlan()` checks:
- All required top-level fields present
- Sections array has required fields (id, title, purpose, keyMessage, slideAllocation, sourceRefs)
- Slides array has required fields (slideId, role, objective, keyMessage, candidateVisual, sourceRefs)
- assumptions/warnings are arrays if present

## Out of Scope

- SlideSpec generation (M12.4)
- PPTX rendering (M12.6)
- Theme/layout selection (M12.5)
- Natural-language revision (M12.9)

## Next Milestone

M12.4 — SlideSpec Contract: Convert DeckPlan into page-level SlideSpec[] with body content, layout, speaker notes text, and design hints.
