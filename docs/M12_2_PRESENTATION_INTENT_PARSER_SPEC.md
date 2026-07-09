# M12.2 Presentation Intent Parser — Specification

> Version: 1.0.0
> Date: 2026-07-09
> Status: M12.2 implementation contract
> Related: M12.0 General PPT Product Specification, Section 5

## 1. Purpose

M12.2 implements the first intent layer above `SourceDocumentModel`.

The parser converts a user prompt and an optional `SourceDocumentModel` into the general-purpose `PresentationIntent` contract. It is deterministic, domain-agnostic, dependency-light, and designed as a thin slice for downstream M12 milestones.

## 2. In Scope

- Create a reusable `packages/intent-parser` module.
- Parse Chinese and English prompts.
- Infer `PresentationIntent` fields from explicit user instructions first.
- Use `SourceDocumentModel` title and source length only when prompt signals are sparse.
- Record assumptions instead of hiding inferred decisions.
- Provide fixtures, tests, and a checker wired into `npm run check:all`.

## 3. Out of Scope

- Story Planner.
- DeckPlan generation.
- SlideSpec generation.
- PPTX rendering.
- Natural-language revision.
- Cloud, paid API, or LLM dependencies.
- Domain-specific hard-coding in the core parser.

## 4. PresentationIntent Contract

The parser must output:

```json
{
  "topic": "",
  "audience": "",
  "purpose": "inform",
  "language": "zh-CN",
  "targetSlideCount": 12,
  "durationMinutes": 15,
  "tone": "professional",
  "style": "minimal-modern",
  "contentDensity": "medium",
  "visualPreference": "balanced",
  "speakerNotes": true,
  "mustInclude": [],
  "mustEmphasize": [],
  "mustAvoid": [],
  "domain": "general",
  "assumptions": []
}
```

## 5. Precedence Rules

1. Explicit user prompt.
2. Explicit default overrides passed to the parser.
3. `SourceDocumentModel` title, metadata, sections, and length.
4. Product defaults from M12.0.

Prompt instructions must override source-derived inference. Source-derived facts should help only when the prompt is underspecified.

## 6. Field Inference

The parser supports deterministic heuristic extraction for:

- `topic`
- `audience`
- `purpose`
- `language`
- `targetSlideCount`
- `durationMinutes`
- `tone`
- `style`
- `contentDensity`
- `visualPreference`
- `speakerNotes`
- `mustInclude`
- `mustEmphasize`
- `mustAvoid`
- `domain`
- `assumptions`

## 7. Domain-Agnostic Rules

The parser may recognize broad domains such as `business`, `education`, `research`, `technical`, `government`, and `medical`, but those domains are labels only.

It must not:

- assume medical framing for unrelated content
- assume digital-pathology defaults
- force executive style onto education prompts
- force pitch format onto research or technical prompts
- create domain-specific rendering behavior

## 8. Assumptions

When fields are missing, the parser must record assumptions such as:

- language defaulted
- topic inferred from source title
- audience defaulted
- slide count inferred from source length
- duration inferred from slide count
- domain defaulted

Assumptions are part of the contract because downstream milestones need to explain and revise the generated plan.

## 9. Validation

M12.2 is complete only when:

- the module exports parser and schema helpers
- Chinese and English prompts are covered by tests
- sparse prompt plus `SourceDocumentModel` inference is covered
- explicit prompt precedence over source title is covered
- assumption recording is covered
- sample prompt and output fixtures exist
- `scripts/check-m12-2-presentation-intent-parser.cjs` passes
- `npm run check:all` includes the M12.2 checker

## 10. Handoff to M12.3

M12.3 Story Planner will consume `PresentationIntent` plus `SourceDocumentModel` and produce the narrative/deck planning layer. M12.2 must not pre-build Story Planner behavior.
