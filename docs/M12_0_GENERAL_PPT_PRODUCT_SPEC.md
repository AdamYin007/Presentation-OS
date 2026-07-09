# M12.0 General-Purpose Document and Natural Language to PPT Product Specification

> Version: 1.0.0
> Date: 2026-07-09
> Status: Frozen product specification for M12.0
> Scope: Product direction, contracts, workflow, QA, acceptance, and roadmap

## 0. Current Capability Snapshot

This specification is based on a read-only audit of the current repository state on `develop` after PR78.

### Existing capabilities confirmed

- The repository already contains `pptxgenjs` as a dependency in [package.json](file:///Users/adamyin/Projects/awe/package.json#L27-L29).
- The repository already contains a legacy PPTX rendering entrypoint in [run.js](file:///Users/adamyin/Projects/awe/registry/packages/ppt-factory/bin/run.js#L1-L5).
- The architecture already defines a content engine, layout engine, theme engine, layout adapters, and renderer engine in [ARCHITECTURE.md](file:///Users/adamyin/Projects/awe/docs/ARCHITECTURE.md#L9-L49).
- The repository already contains a presentation component library backed by `pptxgenjs` in [presentation-components.test.js](file:///Users/adamyin/Projects/awe/tests/presentation-components.test.js#L22-L34).
- The repository already contains a pack-oriented content and rendering baseline plus M8-M11 quality guardrails.

### Missing capabilities confirmed

- No verified DOCX parsing implementation is present in the repository today.
- No verified Markdown or plain-text ingestion pipeline is formalized as a product contract today.
- No repository-level `PresentationIntent` contract exists today.
- No repository-level `SourceDocumentModel` contract exists today.
- No repository-level `DeckPlan` contract exists today.
- No repository-level `SlideSpec` contract exists today.
- No verified speaker-notes contract exists as a general product protocol today, even though legacy rendering may print or write notes in limited paths.
- No verified render-to-image preview pipeline exists today.
- No verified visual QA pipeline based on real rendered previews exists today.
- No verified natural-language revision capability exists today.

### Product implication

M12 does not replace the existing rendering foundation. M12 defines the product layer that sits above the current runtime baseline.

M12 prioritizes a usable general-purpose presentation product over additional hard-gate expansion.

## 1. Product Vision

### English definition

Presentation OS converts documents, structured information, and natural-language intent into editable, presentation-ready PowerPoint decks across general business, education, research, technical, and professional use cases.

### 中文定义

Presentation OS 不是简单的文档分页器，而是能够理解内容、受众和目标，重构演示故事线，设计页面，生成可编辑 PPTX，并接受自然语言修改的通用演示文稿生产系统。

### Core positioning

- It is a general-purpose presentation product.
- It is industry-agnostic at the core layer.
- Medical, government, education, consulting, sales, and research are profiles, not hard-coded product cores.
- Domain-specific rules must not be baked into the core renderer.
- The system must generate editable, revisable PowerPoint, not image-only slide screenshots.
- The system must optimize for usable outputs rather than document-to-slide mechanical transcription.

### Explicit non-goals for M12.0

- Not a medical-only PPT generator.
- Not a digital-pathology-only renderer.
- Not a government-only report writer.
- Not a consulting-only slide formatter.
- Not a Word-only conversion tool.
- Not a simple paragraph splitter that maps one paragraph to one slide.

## 2. Primary User Modes

Presentation OS must support at least four primary user modes.

### Mode A: Document to PPT

Input example:

`年度经营分析报告.docx`

Prompt:

生成 15 页董事会汇报，突出收入、利润、风险和下一年度行动，减少文字，多使用数据图表。

Expected behavior:

- Parse document structure.
- Extract key signals and data blocks.
- Infer likely executive-report narrative.
- Build a management-facing deck rather than preserving document section order mechanically.
- Produce editable PPTX and speaker notes.

### Mode B: Natural-Language Generation from Scratch

Prompt:

制作一份 12 页的人工智能入门课件，面向高中生，语言通俗，包含案例、流程图、总结和互动问题。

Expected behavior:

- Create a new source model from prompt intent.
- Infer teaching audience and beginner complexity.
- Generate a suitable learning narrative.
- Produce SlideSpec and PPTX with educational layout choices.

### Mode C: Multi-Source Presentation Generation

Future input classes:

- Word
- Markdown
- Excel
- PDF
- Images
- Web material
- Structured JSON

MVP first:

- DOCX
- Markdown
- Plain text

Architecture rule:

- The ingest architecture must not be limited to a single source type.
- The product contract must remain multi-source even if the first implementation is partial.

### Mode D: Natural-Language Revision

User examples:

- 把第 4 页改成时间轴。
- 第 7 页增加竞争对比。
- 整体改成简洁科技风。
- 压缩成 10 分钟版本。

Expected behavior:

- Revision should target intent, plan, and slide protocols first.
- Unaffected slides should remain stable whenever possible.
- The product should regenerate only the impacted representation layers.

## 3. Product Journey

The end-to-end product journey is:

`Input`
`→ Document Ingestion`
`→ Source Model`
`→ Intent Parsing`
`→ Story Planning`
`→ DeckPlan`
`→ SlideSpec`
`→ Theme/Layout Selection`
`→ Editable PPTX Rendering`
`→ Content QA`
`→ Visual QA`
`→ Revision`
`→ Final Output`

### Journey principles

- The system must not follow a one-paragraph-one-slide rule.
- The system must prefer audience fit and presentation value over source order preservation.
- The system must preserve traceability from each slide back to source references.
- The system must support repeatable generation under the same source and intent.
- The system must support post-generation revision through natural language.

## 4. Supported Inputs

### MVP priority inputs

- DOCX
- Markdown
- Plain text
- Natural-language prompt
- Optional images
- Optional template

### Future inputs

- PDF
- Excel / CSV
- Web pages
- JSON data
- Multiple documents

### Input priority rules

1. User explicit prompt
2. User provided template or brand guideline
3. Explicit document structure
4. System inference
5. Product defaults

### Conflict resolution

- User explicit instructions must override inferred defaults.
- Template guidance must override generic theme selection when both are present.
- Source facts should override unsupported model assumptions.
- If prompt and source materially conflict, the system should prefer the prompt for framing and the source for facts, and record assumptions or warnings.

## 5. PresentationIntent

`PresentationIntent` is the user-facing planning contract that captures what the deck should achieve.

```json
{
  "topic": "",
  "audience": "",
  "purpose": "",
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

### Field meanings

- `topic`: The presentation subject.
- `audience`: The expected listeners or readers.
- `purpose`: Inform, persuade, teach, review, propose, sell, defend, or summarize.
- `language`: Output language.
- `targetSlideCount`: Desired slide count.
- `durationMinutes`: Intended talk duration.
- `tone`: Formality and rhetorical style.
- `style`: Theme family or visual direction.
- `contentDensity`: Sparse, medium, or dense.
- `visualPreference`: Text-heavy, balanced, or visual-heavy.
- `speakerNotes`: Whether notes are required.
- `mustInclude`: Mandatory topics or pages.
- `mustEmphasize`: High-priority claims or evidence.
- `mustAvoid`: Topics, tones, or patterns to avoid.
- `domain`: General by default, profile-specific if explicitly requested.
- `assumptions`: System-recorded inferred decisions.

### Inference rules

- If slide count is missing, infer from document length, purpose, and duration.
- If audience is missing, infer conservatively from the source title, prompt wording, and deck purpose.
- If duration is missing, use slide count heuristics and document assumptions.
- If style is missing, prefer a general-purpose professional theme.

### Conflict handling

- Prompt beats inferred audience.
- Prompt beats inferred slide count.
- Source facts beat fabricated content.
- If the prompt asks for simplification of a complex source, preserve factual fidelity while reducing density.

### Assumptions and clarification

- Assumptions must be recorded instead of silently hidden.
- Blocking clarification should be minimized in MVP.
- Clarification should be triggered only when ambiguity can materially damage output usefulness.
- Example clarification cases:
  - audience unknown and two very different narratives are plausible
  - requested slide count impossible for mandatory content
  - requested language conflicts with required source terms

## 6. Source / Document Model

The generalized input representation is `SourceDocumentModel`.

```json
{
  "title": "",
  "metadata": {},
  "sections": [],
  "paragraphs": [],
  "lists": [],
  "tables": [],
  "images": [],
  "dataBlocks": [],
  "sourceMap": []
}
```

### Core requirements

Each source content element must preserve:

- `sourceId`
- `sourceType`
- `sourceOrder`
- `originalText`
- `sectionPath`
- `confidence`
- `fileReference`
- `origin` as `sourced` or `inferred`

### Why this model exists

- Traceability
- Hallucination resistance
- Revision support
- Source lookup
- Cross-slide provenance

### Suggested element shapes

```json
{
  "sourceId": "para-001",
  "sourceType": "paragraph",
  "sourceOrder": 12,
  "originalText": "Revenue grew 18% year over year.",
  "sectionPath": ["Executive Summary", "Performance"],
  "confidence": 0.98,
  "fileReference": "annual-report.docx#p12",
  "origin": "sourced"
}
```

```json
{
  "sourceId": "tbl-003",
  "sourceType": "table",
  "sourceOrder": 20,
  "originalText": "Quarterly revenue table",
  "sectionPath": ["Financial Results"],
  "confidence": 0.95,
  "fileReference": "annual-report.docx#table3",
  "origin": "sourced"
}
```

### Model principles

- A single source may contain multiple content types.
- The source model must remain general-purpose across industries.
- Images and tables are first-class source elements.
- Source order should be preserved even if slide order changes later.

## 7. Story Planner

The Story Planner chooses an audience-appropriate narrative instead of copying source order blindly.

### Supported narrative patterns

- Problem → Insight → Solution → Action
- Why → What → How → Value
- Current State → Gap → Target State → Roadmap
- Executive Summary → Evidence → Recommendation
- Context → Analysis → Conclusion
- Objective → Progress → Issues → Next Steps
- Market → Product → Advantage → Business Model
- Background → Method → Results → Discussion
- Concept → Example → Practice → Summary
- Proposal → Scope → Plan → Budget → Risk
- Custom narrative

### Planner inputs

- audience
- purpose
- content type
- requested duration
- slide budget
- source structure

### Planner responsibilities

- select the best-fit narrative pattern
- define the section sequence
- assign slide budgets by section
- decide which source blocks deserve summary, charting, comparison, or notes
- identify missing but implied transition pages
- generate warnings when the input does not support the requested narrative

### Planner guardrails

- Do not assume medical framing for non-medical content.
- Do not assume executive style for learning content.
- Do not assume product pitch format for research content.
- Do not force market-story patterns onto technical architecture content.

## 8. DeckPlan

`DeckPlan` is the deck-level planning contract.

```json
{
  "deckTitle": "",
  "subtitle": "",
  "audience": "",
  "purpose": "",
  "narrativePattern": "",
  "sections": [],
  "slides": [],
  "assumptions": [],
  "warnings": []
}
```

### Section shape

Each section must include:

- `id`
- `title`
- `purpose`
- `keyMessage`
- `slideAllocation`
- `sourceRefs`

### Slide planning entry shape

Each slide plan entry must include:

- `slideId`
- `role`
- `objective`
- `keyMessage`
- `candidateVisual`
- `sourceRefs`

### DeckPlan responsibilities

- establish deck-level structure
- allocate slide budgets
- capture narrative continuity
- preserve assumptions and warnings
- provide a deterministic handoff to SlideSpec generation

## 9. SlideSpec

`SlideSpec` is the only page-level core protocol.

```json
{
  "id": "slide-01",
  "index": 1,
  "section": "",
  "role": "content",
  "title": "",
  "subtitle": "",
  "keyMessage": "",
  "body": [],
  "visualType": "none",
  "visualSpec": {},
  "layout": "title-and-content",
  "speakerNotes": "",
  "sourceRefs": [],
  "designHints": {},
  "qaHints": {}
}
```

### Supported roles

- title
- agenda
- section-divider
- executive-summary
- content
- comparison
- process
- timeline
- roadmap
- data-chart
- table
- matrix
- architecture
- case-study
- recommendation
- quote
- q-and-a
- closing

### Supported visual types

- none
- image
- icon
- table
- bar-chart
- line-chart
- area-chart
- pie-chart
- scatter-chart
- timeline
- process
- roadmap
- matrix
- funnel
- pyramid
- architecture
- comparison
- metric-cards

### SlideSpec principles

- Each slide should contain one primary message.
- `sourceRefs` must make traceability possible.
- `speakerNotes` should be generated, not treated as optional decoration.
- `designHints` guide layout and theme choices without hard-coding output shapes.
- `qaHints` allow downstream QA to know what to inspect.

## 10. Layout System

The layout system maps slide role, density, and visual needs into reusable page structures.

### Initial layout families

1. title-slide
2. agenda
3. section-divider
4. executive-summary
5. title-and-bullets
6. two-column
7. three-card
8. image-and-text
9. comparison
10. horizontal-process
11. vertical-process
12. timeline
13. roadmap
14. kpi-cards
15. chart-and-insight
16. full-width-chart
17. table
18. matrix
19. architecture
20. case-study
21. recommendation
22. quote
23. q-and-a
24. closing

### MVP implementation target

- MVP may implement 10-14 layouts first.
- The layout protocol and renderer boundary must remain extensible.

### Layout selection signals

- slide role
- body item count
- text length
- visual type
- data structure
- information density
- theme
- audience

### Layout rules

- Layouts must be reusable across domains.
- Layout names should describe structure, not industry.
- Layout selection must remain data-driven.

## 11. Theme System

Themes provide design tokens rather than industry hard-coding.

### Initial theme families

- minimal-modern
- business-consulting
- corporate-blue
- technology-dark
- academic-clean
- education-friendly
- creative-colorful
- government-formal
- medical-technology
- product-launch

### Theme tokens

- page size
- font family
- font fallback
- title sizes
- body sizes
- color palette
- background
- accent
- spacing
- border
- corner radius
- line style
- chart style
- image treatment
- footer
- page number

### Theme rules

- Industry colors, fonts, and decorations must not be scattered across layout code.
- Core layouts must consume tokens, not vertical-specific constants.
- Themes may represent profiles but must not redefine product logic.

## 12. Editable PPTX Renderer

The renderer must produce editable PowerPoint output.

### Required renderer behaviors

- All titles and body text must remain editable.
- Tables should use native PowerPoint tables where possible.
- Charts should prefer native PowerPoint charts where practical.
- Process diagrams should use shapes.
- Architecture diagrams should use shapes and connectors.
- Text must not be baked into background images.
- Images must preserve aspect ratio.
- Speaker notes must be supported.
- Page numbers must be supported.
- Chinese and English font fallback must be supported.
- Repeated rendering of the same SlideSpec should be stable.

### Explicit prohibitions

- Do not render the whole slide as a single image.
- Do not hide editable text inside flattened screenshots.
- Do not hard-code medical or consulting visuals into the general renderer.

## 13. Speaker Notes

Each slide should include speaker notes with:

- page purpose
- recommended narration
- key numbers or key arguments
- transition to the next page
- suggested speaking duration
- risk notes or source notes

### Notes principles

- Notes are part of the product, not an afterthought.
- Notes should help presentation delivery, not repeat the slide verbatim.
- Notes may cite assumptions or weak evidence where necessary.

## 14. QA Pipeline

The QA pipeline must include four layers.

### Content QA

- Does the title express a conclusion or useful purpose?
- Does each slide contain one core message?
- Is content duplicated across slides?
- Does slide content conflict with the source?
- Are `mustInclude` items present?
- Is there any important unsupported factual claim?

### Story QA

- Is the narrative complete?
- Are sections balanced?
- Is the slide count reasonable?
- Do the opening and closing work as a presentation?
- Does the story fit the audience and purpose?

### Visual QA

- overflow
- overlap
- out-of-bounds
- font too small
- page too dense
- image distortion
- insufficient whitespace
- alignment issues
- connector misplacement
- chart readability issues

### File QA

- PPTX opens successfully
- slide count is correct
- no blank slides
- no missing images
- no temp path leakage
- no severe font fallback breakage
- notes exist
- all outputs are complete

### Mandatory rule

Visual QA must ultimately rely on real rendered previews, not JSON-only inspection.

## 15. Natural-Language Revision

Natural-language revision must target protocol layers before binary PPTX edits.

### Revision order of operations

1. PresentationIntent
2. DeckPlan
3. SlideSpec
4. PPTX rerender

### Supported revision categories

- modify single slide title
- modify body content
- change layout
- change visual type
- delete slide
- add slide
- reorder slides
- change theme
- compress slide count
- expand slide count
- add notes
- change audience
- change presentation duration

### Example revision contract

```json
{
  "operation": "replace-slide-layout",
  "targetSlide": 4,
  "instruction": "convert to timeline"
}
```

### Revision stability rule

Revision must preserve unchanged slides as much as possible.

## 16. Outputs

Each generation should produce:

```text
output/
├── deck.pptx
├── deck-plan.json
├── slide-specs.json
├── speaker-notes.md
├── generation-manifest.json
├── qa-report.json
└── preview/
```

### Generation manifest fields

- input file hash
- user prompt
- assumptions
- theme
- slide count
- generator version
- warnings
- source references
- QA result

### Privacy constraint

The manifest must not retain sensitive document full text.

## 17. Privacy

Privacy and local-first behavior are product requirements.

### Privacy rules

- User documents should be processed locally by default.
- Real user documents must not be committed to Git.
- Real user documents must not be added to fixtures.
- Output directories should be ignored by default.
- Full document content should not be logged.
- No upload to external services unless the user explicitly authorizes it.
- No paid API usage unless the user explicitly authorizes it.
- Temporary files should be safely clearable.
- The manifest must not store sensitive full text.

## 18. MVP Scope

### MVP must support

- single DOCX
- Markdown
- plain text
- natural-language prompt
- Chinese and English
- 8-20 slides
- at least 3 general themes
- at least 10 layouts
- editable PPTX
- speaker notes
- DeckPlan
- SlideSpec
- basic content QA
- basic visual QA
- repeatable generation
- partial natural-language revision

### MVP does not support

- real-time collaboration
- SaaS UI
- automatic internet research
- pixel-perfect arbitrary brand cloning
- complex animations
- video
- 3D
- VBA
- online publishing
- complex Excel linkage
- unlimited freeform layout

## 19. Multi-Domain Acceptance Scenarios

At least eight cross-domain acceptance scenarios are required.

### Scenario 1: Annual Business Review to Executive Deck

- input: annual operating report
- prompt: produce a 15-slide executive review for leadership
- target audience: management team
- expected slide count: 15
- required page types: executive summary, KPI, risks, actions
- output requirements: editable PPTX, notes, charts, conclusion
- QA criteria: concise management story, no mechanical pagination

### Scenario 2: Product Introduction to Sales Presentation

- input: product brief and feature list
- prompt: create a sales-ready product presentation
- target audience: prospects and partners
- expected slide count: 12
- required page types: value proposition, comparison, use case, closing
- output requirements: persuasive story and editable comparison pages
- QA criteria: customer-facing tone and clear value framing

### Scenario 3: Technical Document to Architecture Review

- input: system design document
- prompt: summarize this into an architecture briefing
- target audience: engineering leadership
- expected slide count: 10
- required page types: architecture, flow, risks, roadmap
- output requirements: editable diagrams and decision summary
- QA criteria: technical correctness and readable architecture visuals

### Scenario 4: Research Report to Academic Presentation

- input: research paper or report
- prompt: build a formal academic presentation
- target audience: academic or expert audience
- expected slide count: 14
- required page types: background, method, results, discussion
- output requirements: structured scientific narrative and notes
- QA criteria: source fidelity and academic coherence

### Scenario 5: Teaching Material to Courseware

- input: lesson notes or Markdown teaching material
- prompt: create a classroom-friendly deck
- target audience: students
- expected slide count: 12
- required page types: concept, example, exercise, recap
- output requirements: clear visuals and teaching notes
- QA criteria: pedagogy fit and simple language

### Scenario 6: Project Plan to Proposal Deck

- input: project scope document
- prompt: convert this into a proposal presentation
- target audience: sponsor or client
- expected slide count: 13
- required page types: scope, timeline, budget, risk
- output requirements: proposal narrative and action-oriented close
- QA criteria: plan clarity and commercial usefulness

### Scenario 7: Market Analysis to Consulting-Style Review

- input: market analysis notes and metrics
- prompt: create a strategy-style presentation
- target audience: business stakeholders
- expected slide count: 15
- required page types: market, trend, comparison, recommendation
- output requirements: executive summary and evidence-led recommendations
- QA criteria: balanced story and strong page conclusions

### Scenario 8: Medical Plan to Hospital Management Briefing

- input: medical program material
- prompt: create a management briefing for hospital leadership
- target audience: hospital management
- expected slide count: 12
- required page types: background, benefits, implementation, risks
- output requirements: editable PPTX with clear management framing
- QA criteria: still uses general product logic, not hard-coded medical renderer rules

## 20. Primary Acceptance Test

### Input

A real DOCX or Markdown document.

### Prompt

根据这份材料制作一份 15 页正式汇报 PPT，面向管理层，提炼核心结论，减少大段文字，多使用流程图、对比图和数据图，并生成逐页演讲稿。

### Output acceptance criteria

- A PPTX that opens successfully
- About 15 slides
- Not mechanical pagination
- Structure suitable for management reporting
- All text editable
- Includes at least one process page
- Includes at least one comparison page
- Includes at least one data page
- Includes at least one conclusion page
- No obvious overflow or overlap
- Speaker notes exist
- DeckPlan exists
- SlideSpec exists
- QA report exists
- Further natural-language modification is possible

## 21. Architecture

Suggested future module boundaries:

```text
packages/
  document-ingest/
  presentation-intent/
  story-planner/
  slide-spec/
  theme-system/
  presentation-renderer/
  presentation-qa/
  presentation-revision/
skills/
  presentation-generator/
scripts/
  generate-presentation.cjs
  revise-presentation.cjs
  check-generated-presentation.cjs
```

### M12.0 implementation rule

M12.0 does not create all empty modules.

### Product architecture principle

The product layer should sit above the current runtime and reuse the rendering foundation where appropriate.

## 22. Relationship with M8-M11

- M8-M11 remain the runtime and quality baseline.
- PackRuntimeContext may carry generation task context where appropriate.
- Strict validation may validate generation-related inputs when formalized.
- Snapshot mechanisms may protect stable outputs later.
- Informational CI should continue to observe rather than hard-gate product rollout.
- M12 must not continue expanding hard gate during this product-spec phase.
- User value now takes priority over further hard-gate expansion.

M12 prioritizes a usable general-purpose presentation product over additional hard-gate expansion.

## 23. Product Metrics

The product should eventually measure:

- generation success rate
- PPTX open rate
- slide overflow rate
- slide overlap rate
- manual rework ratio
- story quality score
- visual quality score
- source fidelity
- revision success rate
- generation duration
- theme consistency
- editable element ratio

## 24. M12 Roadmap

- M12.0 General PPT Product Specification
- M12.1 General Document Ingestion
- M12.2 Presentation Intent Parser
- M12.3 Story Planner
- M12.4 SlideSpec Contract
- M12.5 Theme and Layout System
- M12.6 Editable PPTX Renderer
- M12.7 End-to-End General PPT MVP
- M12.8 Content and Visual QA
- M12.9 Natural-Language Revision
- M12.10 Asset, Chart, and Diagram Enhancement
- M12.11 CLI and Skill Packaging
- M12.12 Multi-Domain Real-Document Pilot
- M12.13 Usability and Reliability Release

## 25. Product Boundary Summary

### What Presentation OS becomes in M12

- A general-purpose presentation generation system
- A document and prompt understanding system
- A story planning system
- A reusable PPT production engine
- A revision-capable editable presentation workflow

### What it does not become in M12.0

- A medical-only deck maker
- A Word-only converter
- A screenshot-based slide exporter
- A branch-protection or hard-gate program
- A new runtime hardening milestone

## 26. Design Principles

- User intent overrides inferred defaults.
- Facts must be traceable to sources.
- Every slide needs a purpose.
- Layouts and themes must remain reusable.
- Output must remain editable.
- Revision should be stable and localized.
- Privacy must be local-first.
- Product usefulness outranks infrastructure expansion in M12.

## 27. MVP Decision Summary

### Keep

- Existing runtime foundation
- Existing PptxGenJS-based rendering capabilities
- Existing M8-M11 validation and informational CI baseline

### Add in later M12 milestones

- General document ingestion
- Intent parsing
- Story planning
- SlideSpec contract
- General themes and layouts
- QA and revision loops

### Do not do in M12.0

- Do not implement M12.1 yet.
- Do not expand hard gate.
- Do not enable required checks.
- Do not turn the product into a domain-locked generator.

## 28. Real Repository Baseline and Gaps

This section records the audited baseline so later milestones do not redesign already existing parts.

### Confirmed today

- PptxGenJS dependency exists.
- Legacy PPT rendering entrypoint exists.
- Theme, layout, and renderer concepts exist in the architecture.
- A presentation component library exists.
- Existing output examples already include generated PPTX artifacts under `output/`.

### Not yet formalized today

- No production-grade general document ingestion contract
- No production-grade PresentationIntent contract
- No production-grade SourceDocumentModel contract
- No production-grade DeckPlan contract
- No production-grade SlideSpec contract
- No real rendered visual QA workflow
- No general natural-language revision engine

### M12 implication

M12 should reuse the rendering base and formalize the missing product contracts first.

## 29. Decision Table

| Topic | Decision |
| --- | --- |
| Product scope | General-purpose |
| Domain strategy | Profile-based, not hard-coded |
| Input scope | Multi-source architecture |
| MVP sources | DOCX, Markdown, plain text, prompt |
| Output format | Editable PPTX |
| Story generation | Required |
| Natural-language generation | Required |
| Natural-language revision | Required |
| Visual QA | Required, render-based later |
| Hard gate expansion | Not part of M12.0 |

## 30. Exit Criteria for M12.0

M12.0 is complete only when:

- the general-purpose product direction is explicitly frozen
- the product is no longer framed as a vertical-only tool
- core contracts are defined at the specification level
- MVP scope and non-goals are clear
- multi-domain acceptance scenarios are defined
- the M12 roadmap is frozen
- the repository still preserves all M11 quality baselines without expanding hard gates

## 31. Final Product Statement

Presentation OS is a general-purpose system that turns documents, structured information, and natural-language intent into editable, presentation-ready PowerPoint decks with story planning, reusable layouts and themes, speaker notes, QA, and revision support.
