# M12.12 Multi-Domain Real-Document Pilot — Development Plan

**Project**: Presentation OS (AWE)  
**Repository**: `/Users/adamyin/Projects/awe`  
**Branch**: `develop` (HEAD `e0b7802`)  
**Date**: 2026-07-14  
**Status**: Planning  

---

## 1. Current State Summary

### Completed Milestones (Merged to develop)
| Milestone | PR | Description | Status |
|---|---|---|---|
| M12.9 | #94 | Natural-Language Revision Engine (11 ops, reviser.js + schema.js) | ✅ Merged |
| M12.10 | #95 | Asset, Chart, Diagram Enhancement (bar, line, KPI cards, process/timeline diagrams) | ✅ Merged |
| M12.11 | #96 | CLI & Skill Packaging (`scripts/make-pptx.js`, thin entrypoint) | 🟡 OPEN, ready to merge |

### Architecture Snapshot
- **12 packages** under `packages/`: cli, document-ingest, intent-parser, story-planner, slidespec, theme-layout, pptx-renderer, presentation-pipeline, presentation-revision + legacy (presentation-components)
- **~2,260 lines of test code** across 11 test files
- **13 check scripts** in `scripts/check-m12-*.cjs` for per-milestone validation
- **Full pipeline**: `markdown → SourceDocumentModel → PresentationIntent → DeckPlan → SlideSpec[] → LayoutPlan → PPTX`
- **3 theme styles**: minimal-modern, business-consulting, academic-clean
- **16 layout families**, 15 slide types, 10 narrative patterns

### Known Issues / Risks
1. **PR #96 not yet merged** — blocks M12.12 start (check script not in `npm run check`)
2. **PIL `_imaging` import error** on visual QA PNG pixel analysis (Hermes venv Python issue, not production blocker)
3. **Legacy renderers** still preserved in `run.js` (PR32 pending — out of scope for M12)
4. **No CI integration** for M12 checks yet (informational-only from M11)
5. **Single sample fixture** — M12.12 needs diverse real-world documents

---

## 2. M12.12 Objectives

**Goal**: Validate the full pipeline against 4+ real-world document domains, identify gaps, and produce a reliability baseline before the M12.13 usability release.

### Scope
- **Real-document ingestion**: Process actual markdown/text files from distinct domains
- **Cross-domain quality assessment**: Compare output quality across domains
- **Gap identification**: Document where the pipeline fails or produces suboptimal results
- **Regression suite expansion**: Add domain-specific fixtures and tests

### Out of Scope
- New rendering features or slide types
- LLM/cloud integration
- Theme engine changes
- Legacy renderer cleanup (PR32)

---

## 3. Deliverables

### 3.1 Domain Fixtures (4 minimum)
| # | Domain | Input Format | Expected Output |
|---|---|---|---|
| 1 | **Business Review** | Markdown (existing: `business-review.md`) | ~10-18 slides, charts, KPIs |
| 2 | **Technical Report** | Markdown with code blocks, tables, references | ~8-12 slides, technical diagrams |
| 3 | **Academic Lecture** | Markdown with citations, formulas, multi-section | ~15-20 slides, structured sections |
| 4 | **Product Pitch** | Short-form markdown, persuasive narrative | ~6-10 slides, visual-heavy |

Each fixture includes:
- Input file (`docs/fixtures/m12-12/<domain>/input.md`)
- Expected output (`docs/fixtures/m12-12/<domain>/expected.pptx`)
- Quality checklist (`docs/fixtures/m12-12/<domain>/checklist.json`)

### 3.2 Cross-Domain Test Suite
- New test file: `tests/m12-12-cross-domain/cross-domain.test.js`
- Runs full pipeline on each domain fixture
- Validates: slide count, content presence, chart rendering, layout diversity
- Minimum 15 test cases

### 3.3 Gap Analysis Report
- File: `docs/M12_12_GAP_ANALYSIS.md`
- Per-domain: pass/fail summary, issues found, severity rating
- Aggregate: top 5 most common failure modes
- Recommendations for M12.13

### 3.4 Updated Check Script
- `scripts/check-m12-12-cross-domain.cjs`
- Integrated into `npm run check` and `npm run check:all`

### 3.5 Updated Documentation
- Update `ROADMAP.md`: mark M12.12 complete, define M12.13
- Update `ARCHITECTURE.md`: add domain fixture reference

---

## 4. Implementation Steps

### Step 1: Merge PR #96 (M12.11)
- **Prerequisite**: All M12.12 work depends on this being merged
- Action: Review and merge `gh pr 96`
- Verify: `npm run check:m12-11-cli-skill-packaging` passes

### Step 2: Create Domain Fixture Infrastructure
```
docs/fixtures/m12-12/
├── README.md              # Usage instructions
├── business-review/       # (expand existing)
│   ├── input.md
│   └── checklist.json
├── technical-report/
│   ├── input.md
│   └── checklist.json
├── academic-lecture/
│   ├── input.md
│   └── checklist.json
└── product-pitch/
    ├── input.md
    └── checklist.json
```

### Step 3: Produce Domain-Specific Inputs
For each domain:
1. Write/create markdown input reflecting realistic content
2. Run through `scripts/make-pptx.js` with all 3 theme styles
3. Verify PPTX validity (slide count, content, no errors)
4. Generate expected output as baseline

### Step 4: Build Cross-Domain Test Suite
- Parse each `checklist.json` for validation criteria
- Assert: slide count within ±2 of expected
- Assert: key content elements present (titles, body text, charts)
- Assert: no pipeline errors or crashes
- Assert: PPTX is valid ZIP with correct structure

### Step 5: Run Gap Analysis
- Compare outputs across domains
- Identify systematic failures (e.g., "tables never render correctly")
- Categorize by severity (blocking/warning/minor)
- Draft recommendations for M12.13

### Step 6: Update Roadmap & Ship
- Mark M12.12 items complete in `ROADMAP.md`
- Define M12.13 scope based on gap analysis
- Open PR with all deliverables

---

## 5. Verification Criteria

| Criterion | Pass Condition |
|---|---|
| Pipeline runs on all 4 domains | Zero errors, exits 0 |
| PPTX validity | Valid ZIP, correct slide count, readable content |
| Chart/diagram rendering | At least 1 chart per domain that has chart data |
| Test suite | ≥15 tests, 100% pass |
| Check script | `npm run check:m12-12` passes |
| Gap report | Published to `docs/M12_12_GAP_ANALYSIS.md` |
| ROADMAP updated | M12.12 marked complete, M12.13 defined |

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| PR #96 merge delay | High | Blocker for M12.12; escalate if >1 day |
| Domain inputs too simple | Medium | Use real-world documents from user's experience |
| Existing bugs surface broadly | Medium | Document but don't fix in M12.12; defer to M12.13 |
| PIL visual QA failure | Low | Known Hermes env issue; not a production concern |
| Fixture drift (output changes) | Low | Pin expected outputs; regenerate only on purposeful changes |

---

## 7. M12.13 Preview (Tentative)

Based on typical gap analysis outcomes, M12.13 will likely cover:

- **Usability hardening**: Fix top failure modes identified in M12.12
- **Reliability release**: Stable API contract, comprehensive error messages
- **Performance**: Batch processing, caching for repeated runs
- **Documentation**: User-facing guide, examples, troubleshooting

---

*End of plan.*
