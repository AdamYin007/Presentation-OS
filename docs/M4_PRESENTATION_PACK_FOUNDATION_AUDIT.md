# M4 Presentation Pack Foundation Audit

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR34 — audit of domain-specific assets for M4 Presentation Pack Foundation
> **Governance**: RFC-0001, RFC-0003 — documentation only, no code changes
> **Status**: Draft — awaiting review

---

## 1 Summary

M4 Presentation Pack Foundation begins by auditing current domain-specific assets
and proposing the minimal `presentation-packs/digital-pathology/` structure.

**Key findings:**

- **Story files**: 2 files in `story/` — `digital-pathology-15.json` (renderable) and
  `digital-pathology-15-hero-sequence.json` (hero metadata, not renderable).
- **Planners**: 15 planner files, 14 contain hardcoded digital pathology domain content.
  Only `executive.js` and `roi.js` are domain-agnostic.
- **Adapters**: 16 adapter files, 15 contain hardcoded digital pathology domain content.
  Only `cover.js` is domain-agnostic.
- **Hero patterns**: 37 patterns in `presentation-dna/hero-layer/hero-library.json`,
  3 are domain-specific (H-007, H-009, H-026).
- **Story grammar**: `presentation-dna/grammar/digital-pathology-story-v1.md` defines
  the 15-page structure and audience-specific variants.
- **Themes**: `medical-consulting` theme registered in `theme/defaults.js` and `theme/registry.js`.
- **RFC-0003** already defines the pack specification with clear directory structure and `pack.json` manifest.

**Conclusion:** M4 can proceed under existing RFCs (RFC-0001, RFC-0003). No new RFC required.

---

## 2 Current Domain Asset Inventory

### 2.1 Story Files

| Asset | Location | Size | Domain Knowledge | Should Move | Priority | Notes |
|---|---|---|---|---|---|---|
| `digital-pathology-15.json` | `story/` | 3.4 KB | 15 slides, all domain-specific | ✅ Yes | High | Primary story template |
| `digital-pathology-15-hero-sequence.json` | `story/` | 9.4 KB | Hero metadata, slide_type format | ✅ Yes | High | Companion file for --hero flag |

### 2.2 Planners (Hardcoded Content)

| Planner | Contains Domain Content | Domain Terms | Should Move | Priority |
|---|---|---|---|---|
| `architecture.js` | ✅ | 质控, 科研 | ✅ Yes | Medium |
| `collaboration.js` | ✅ | 病理 | ✅ Yes | Medium |
| `cover.js` | ❌ | — | — | N/A |
| `differentiation.js` | ✅ | 数字病理, 病理 | ✅ Yes | Medium |
| `executive.js` | ❌ | — | — | N/A |
| `generic.js` | ✅ | 科研, 区域协同 | ✅ Yes | Medium |
| `governance.js` | ✅ | 质控, CAP, ISO | ✅ Yes | Medium |
| `problem.js` | ✅ | 病理, 质控, 科研, 远程 | ✅ Yes | Medium |
| `recommendation.js` | ✅ | 数字病理, 病理, 科研, 区域协同 | ✅ Yes | Medium |
| `research.js` | ✅ | 病理 | ✅ Yes | Medium |
| `roadmap.js` | ✅ | 质控, 科研 | ✅ Yes | Medium |
| `roi.js` | ✅ | 科研 | ✅ Yes | Medium |
| `solution.js` | ✅ | 数字病理, 病理, 质控 | ✅ Yes | Medium |
| `transformation.js` | ✅ | 质控 | ✅ Yes | Medium |
| `why-now.js` | ✅ | 病理, 远程, 区域协同 | ✅ Yes | Medium |
| `workflow.js` | ✅ | 质控 | ✅ Yes | Medium |

**14/15 planners contain hardcoded domain content.** Only `executive.js` and `generic.js` are partially domain-agnostic.

### 2.3 Adapters (Hardcoded Content)

| Adapter | Contains Domain Content | Domain Terms | Should Move | Priority |
|---|---|---|---|---|
| `architecture.js` | ✅ | 质控, 科研 | ✅ Yes | Medium |
| `collaboration.js` | ✅ | 病理 | ✅ Yes | Medium |
| `cover.js` | ❌ | — | — | N/A |
| `differentiation.js` | ✅ | 数字病理, 病理 | ✅ Yes | Medium |
| `executive.js` | ❌ | — | — | N/A |
| `generic.js` | ✅ | 科研, 区域协同 | ✅ Yes | Medium |
| `governance.js` | ✅ | 质控, CAP, ISO | ✅ Yes | Medium |
| `problem.js` | ✅ | 病理, 质控, 科研, 远程 | ✅ Yes | Medium |
| `recommendation.js` | ✅ | 数字病理, 病理, 科研, 区域协同 | ✅ Yes | Medium |
| `research.js` | ✅ | 病理 | ✅ Yes | Medium |
| `roadmap.js` | ✅ | 质控, 科研 | ✅ Yes | Medium |
| `roi.js` | ✅ | 数字病理, 病理, 科研 | ✅ Yes | Medium |
| `solution.js` | ✅ | 数字病理, 病理, 质控 | ✅ Yes | Medium |
| `transformation.js` | ✅ | 质控 | ✅ Yes | Medium |
| `why-now.js` | ✅ | 病理, 远程, 区域协同 | ✅ Yes | Medium |
| `workflow.js` | ✅ | 质控 | ✅ Yes | Medium |

**15/16 adapters contain hardcoded domain content.** Only `cover.js` and `executive.js` are domain-agnostic.

### 2.4 Hero Patterns

| Asset | Location | Size | Domain Knowledge | Should Move | Priority |
|---|---|---|---|---|---|
| `hero-library.json` | `presentation-dna/hero-layer/` | — | 37 patterns, 3 domain-specific | ✅ Partially | Medium |
| `hero-patterns.md` | `presentation-dna/hero-layer/` | — | Domain-agnostic principles | — | Low |
| `hero-principles.md` | `presentation-dna/hero-layer/` | — | Domain-agnostic principles | — | Low |
| `hero-rules.md` | `presentation-dna/hero-layer/` | — | Domain-agnostic rules | — | Low |

### 2.5 Theme

| Asset | Location | Domain Knowledge | Should Move | Priority |
|---|---|---|---|---|
| `medical-consulting` theme | `theme/defaults.js`, `theme/registry.js` | Domain-specific color palette | ✅ Yes | Medium |

### 2.6 Documentation

| Asset | Location | Domain Knowledge | Should Move | Priority |
|---|---|---|---|---|
| `digital-pathology-story-v1.md` | `presentation-dna/grammar/` | Story grammar for digital pathology | ✅ Yes | High |
| `presentation-patterns-v1.md` | `presentation-dna/patterns/` | General patterns | — | Low |
| `medical-ai-layouts-v1.md` | `presentation-dna/layouts/` | Domain-specific layouts | ✅ Yes | Medium |
| `medical-ai-layouts-v2.md` | `presentation-dna/layouts/` | Domain-specific layouts | ✅ Yes | Medium |

---

## 3 Core vs Pack Boundary

### 3.1 Must Stay in Core (Domain-Agnostic)

These files must remain in the Core and should NOT be moved to any Presentation Pack:

| File | Reason |
|---|---|
| `bin/run.js` | CLI entry point, orchestrates all rendering |
| `src/renderer-engine/` | Core rendering dispatch (adapter-first + legacy fallback) |
| `src/layout-engine/schema.js` | Core schema validation (buildLayoutPlan) |
| `src/layout-engine/index.js` | Core layout engine entry |
| `src/layout-engine/planner.js` | Core planner registry + dispatch |
| `src/content-engine/` | Core content compilation |
| `src/theme/index.js` | Core theme system |
| `src/theme/helpers.js` | Core theme helpers |
| `src/hero-engine.js` | Core hero enrichment (bridges story + hero-sequence) |
| `src/layout-adapters/index.js` | Core adapter registry |

### 3.2 Should Move to Presentation Pack

These files contain domain-specific knowledge and should eventually move to a pack:

| File | Current Location | Pack Location |
|---|---|---|
| `digital-pathology-15.json` | `story/` | `packs/digital-pathology/stories/` |
| `digital-pathology-15-hero-sequence.json` | `story/` | `packs/digital-pathology/hero-sequences/` |
| `planners/*.js` (14 files) | `src/layout-engine/planners/` | `packs/digital-pathology/planners/` |
| `adapters/*.js` (15 files) | `src/layout-adapters/` | `packs/digital-pathology/adapters/` |
| `medical-consulting` theme | `theme/defaults.js` | `packs/digital-pathology/themes/` |
| `hero-library.json` (partial) | `presentation-dna/hero-layer/` | `packs/digital-pathology/hero-library.json` |
| `digital-pathology-story-v1.md` | `presentation-dna/grammar/` | `packs/digital-pathology/README.md` |
| `medical-ai-layouts-v1.md` | `presentation-dna/layouts/` | `packs/digital-pathology/layouts/` |

### 3.3 Should Remain Temporarily for Compatibility

These files should stay in Core during the transition period:

| File | Reason |
|---|---|
| `planners/generic.js` | Fallback for unknown slide types — keep domain-agnostic version |
| `adapters/cover.js` | Most slides use domain-specific adapters, but cover may need a generic fallback |
| `adapters/executive.js` | May be needed by other packs — keep minimal version |

---

## 4 Digital Pathology Pack v0 Proposal

### 4.1 Minimal Pack Structure

Based on RFC-0003 Section 8.1 (Minimal Pack) and Section 8.2 (Full Pack):

```
presentation-packs/
└── digital-pathology/
    ├── pack.json                    # Pack manifest
    ├── README.md                    # Usage + story grammar
    ├── stories/
    │   ├── digital-pathology-15.json
    │   └── digital-pathology-15-hero-sequence.json
    ├── planners/
    │   ├── architecture.js
    │   ├── collaboration.js
    │   ├── differentiation.js
    │   ├── generic.js
    │   ├── governance.js
    │   ├── problem.js
    │   ├── recommendation.js
    │   ├── research.js
    │   ├── roadmap.js
    │   ├── roi.js
    │   ├── solution.js
    │   ├── transformation.js
    │   ├── why-now.js
    │   └── workflow.js
    ├── adapters/
    │   ├── architecture.js
    │   ├── collaboration.js
    │   ├── differentiation.js
    │   ├── generic.js
    │   ├── governance.js
    │   ├── problem.js
    │   ├── recommendation.js
    │   ├── research.js
    │   ├── roadmap.js
    │   ├── roi.js
    │   ├── solution.js
    │   ├── transformation.js
    │   ├── why-now.js
    │   └── workflow.js
    ├── themes/
    │   └── medical-consulting.js
    ├── hero-library.json
    └── layouts/
        ├── medical-ai-layouts-v1.md
        └── medical-ai-layouts-v2.md
```

### 4.2 pack.json Skeleton

```json
{
  "name": "digital-pathology-pack",
  "version": "0.1.0",
  "displayName": "Digital Pathology Pack",
  "description": "Presentation templates and assets for digital pathology proposals",
  "author": "AWE Medical Team",
  "license": "MIT",
  "minCoreVersion": "1.0.0",
  "maxCoreVersion": "1.99.99",
  "type": "story",
  "assets": [
    {
      "name": "digital-pathology-15",
      "type": "story-template",
      "entryPoint": "stories/digital-pathology-15.json",
      "metadata": {
        "slides": 15,
        "audience": "院长办公会 / 病理科 / 信息中心"
      }
    },
    {
      "name": "hero-sequence",
      "type": "hero-metadata",
      "entryPoint": "stories/digital-pathology-15-hero-sequence.json",
      "metadata": {
        "patterns": 15,
        "narrativeArc": "开场 → 方案 → 信任 → 行动"
      }
    }
  ],
  "dependencies": [],
  "tags": ["medical", "pathology", "digital", "hospital"],
  "keywords": ["数字病理", "病理科", "AI诊断", "医院"]
}
```

### 4.3 Do NOT Overbuild

The v0 proposal is intentionally minimal:
- No `charts/`, `icons/`, `rules/`, `examples/`, `tests/` directories yet
- No `CHANGELOG.md` or `LICENSE` yet
- No pack loader code yet
- No SDK integration yet

These can be added in follow-up PRs as the pack matures.

---

## 5 Migration Candidates

### 5.1 Immediate Candidates (Safe to Move)

| Asset | From | To | Risk |
|---|---|---|---|
| `digital-pathology-15.json` | `story/` | `packs/digital-pathology/stories/` | Low — copy only, keep original |
| `digital-pathology-15-hero-sequence.json` | `story/` | `packs/digital-pathology/stories/` | Low — copy only, keep original |
| `digital-pathology-story-v1.md` | `presentation-dna/grammar/` | `packs/digital-pathology/README.md` | None — documentation only |
| `pack.json` skeleton | — | `packs/digital-pathology/pack.json` | None — new file |

### 5.2 Later Candidates (Require Runtime Changes)

| Asset | From | To | Prerequisite |
|---|---|---|---|
| Planners (14 files) | `src/layout-engine/planners/` | `packs/digital-pathology/planners/` | Pack loader must resolve planners from pack |
| Adapters (15 files) | `src/layout-adapters/` | `packs/digital-pathology/adapters/` | Pack loader must resolve adapters from pack |
| Theme variants | `theme/defaults.js` | `packs/digital-pathology/themes/` | Theme registry must support pack themes |
| Hero patterns | `presentation-dna/hero-layer/` | `packs/digital-pathology/` | Hero engine must support pack patterns |

### 5.3 Should NOT Move Yet

| Asset | Reason |
|---|---|
| `planners/generic.js` | Must remain in Core as fallback for unknown slide types |
| `adapters/cover.js` | May be needed by other packs — keep minimal domain-agnostic version |
| `adapters/executive.js` | May be needed by other packs — keep minimal domain-agnostic version |
| `src/layout-engine/schema.js` | Core validation logic, domain-agnostic |
| `src/hero-engine.js` | Core bridge between story and hero-sequence |
| `bin/run.js` | CLI entry point |

---

## 6 Hardcoded Content Debt

### 6.1 Planners with Hardcoded Domain Content

| Planner | Hardcoded Content Type | Example |
|---|---|---|
| `architecture.js` | 质控, 科研 | Domain-specific card titles and descriptions |
| `collaboration.js` | 病理 | Domain-specific collaboration scenario |
| `differentiation.js` | 数字病理, 病理 | Domain-specific value proposition |
| `generic.js` | 科研, 区域协同 | Generic fallback uses domain terms |
| `governance.js` | 质控, CAP, ISO | Domain-specific compliance content |
| `problem.js` | 病理, 质控, 科研, 远程 | Domain-specific pain points |
| `recommendation.js` | 数字病理, 病理, 科研, 区域协同 | Domain-specific CTA |
| `research.js` | 病理 | Domain-specific research enablement |
| `roadmap.js` | 质控, 科研 | Domain-specific milestones |
| `roi.js` | 数字病理, 病理, 科研 | Domain-specific ROI metrics |
| `solution.js` | 数字病理, 病理, 质控 | Domain-specific platform features |
| `transformation.js` | 质控 | Domain-specific transformation steps |
| `why-now.js` | 病理, 远程, 区域协同 | Domain-specific urgency drivers |
| `workflow.js` | 质控 | Domain-specific workflow steps |

**Total: 14/15 planners contain hardcoded domain content.**

### 6.2 Adapters with Hardcoded Domain Content

Same 15 adapters (excluding cover.js, executive.js) contain hardcoded domain content.

### 6.3 Migration Path for Hardcoded Content

1. **Phase 1 (PR35-36):** Copy files to pack directory without modifying content
2. **Phase 2 (PR37-38):** Update Core to load planners/adapters from pack directory
3. **Phase 3 (PR39+):** Replace hardcoded content with data-driven content from pack assets

---

## 7 RFC Alignment

### 7.1 RFC-0001 Platform Specification

RFC-0001 establishes the Core + Presentation Packs + Applications model.
M4 Presentation Pack work is fully aligned with RFC-0001.

### 7.2 RFC-0003 Presentation Pack Specification

RFC-0003 already defines:
- Pack types (story template, content planner, hero pattern, layout pattern, theme variant)
- Pack manifest (`pack.json`) schema
- Pack directory structure (minimal and full)
- Pack lifecycle (development, integration, release)
- Pack naming conventions (kebab-case)

**M4 can proceed under RFC-0003 without a new RFC.** The proposed pack structure
follows RFC-0003 Section 8.2 (Full Pack) with the minimal subset appropriate for v0.

### 7.3 RFC-0002 SDK Specification

RFC-0002 defines the SDK interface for pack developers.
M4 v0 does NOT require SDK implementation — that is future work.

---

## 8 Recommended M4 Sequence

| PR | Scope | Risk | Notes |
|---|---|---|---|
| **PR35** | Create `presentation-packs/digital-pathology/` skeleton + `pack.json` | None | Documentation-only, no runtime impact |
| **PR36** | Copy `digital-pathology-15.json` and hero-sequence to pack | Low | Keep originals in `story/` for compatibility |
| **PR37** | Copy story grammar + layouts to pack | None | Documentation only |
| **PR38** | Add pack loader proof of concept (optional) | Medium | Only if needed to validate pack structure |
| **PR39** | Begin planner migration (copy to pack) | Medium | Requires runtime changes |

### PR35 — Create Minimal Pack Skeleton

```
presentation-packs/
└── digital-pathology/
    ├── pack.json
    └── README.md
```

### PR36 — Copy Stories to Pack

```
presentation-packs/
└── digital-pathology/
    ├── pack.json
    ├── README.md
    └── stories/
        ├── digital-pathology-15.json
        └── digital-pathology-15-hero-sequence.json
```

### PR37 — Copy Documentation Assets

```
presentation-packs/
└── digital-pathology/
    ├── pack.json
    ├── README.md
    ├── stories/
    │   ├── digital-pathology-15.json
    │   └── digital-pathology-15-hero-sequence.json
    ├── layouts/
    │   ├── medical-ai-layouts-v1.md
    │   └── medical-ai-layouts-v2.md
    └── hero-library.json
```

### PR38 — Pack Loader Proof of Concept

Optional: Implement a minimal pack loader that can resolve story files from the pack directory.
This validates the pack structure without changing the default rendering path.

### PR39 — Begin Planner Migration

Copy planners to pack directory. Update Core to load planners from pack when available,
falling back to Core planners. This is the first step toward decoupling domain content from Core.

---

## 9 Risks

### 9.1 Runtime Breakage Risk — Low

Moving files to pack directory does NOT change runtime behavior if:
- Original files remain in Core (copy, not move)
- Pack loader is not yet integrated
- No Core API changes

### 9.2 Duplicated Content Risk — Medium

Copying files to pack creates two copies:
- Original in Core (runtime source of truth)
- Copy in pack (documentation/reference)

**Mitigation:** Clearly document which copy is authoritative. Use symlinks or copy-on-write if needed.

### 9.3 Premature Abstraction Risk — Medium

Moving planners/adapters too early could break existing rendering if:
- Pack loader is not yet implemented
- Core fallback is not robust
- File paths are inconsistent

**Mitigation:** Phase 1 (PR35-37) only copies files. Phase 2 (PR38+) integrates pack loader.

### 9.4 Story Format Confusion Risk — Low

The hero-sequence file uses `slide_type`/`slide_no` format, not standard `type`/`no`.
This was documented in PR31D. Moving the file to pack does NOT fix the format issue —
it just makes the format incompatibility more visible.

**Mitigation:** Document the format difference clearly in pack README. Do NOT attempt to fix
the format in M4 — that is a separate story format migration task.

---

## 10 Recommendation

### 10.1 M4 Can Proceed Under Existing RFCs

No new RFC required. RFC-0001 and RFC-0003 already define the pack specification.

### 10.2 Recommended Starting Point

**PR35** — Create minimal pack skeleton:
```
presentation-packs/
└── digital-pathology/
    ├── pack.json
    └── README.md
```

This is a documentation-only change with zero runtime impact.

### 10.3 What NOT to Do in M4

- Do NOT remove files from Core (keep originals for compatibility)
- Do NOT change run.js or any rendering logic
- Do NOT create pack loader code yet
- Do NOT start SDK implementation
- Do NOT remove legacy renderers
- Do NOT start PR32 (legacy renderer removal)

### 10.4 Success Criteria for M4

- [ ] `presentation-packs/digital-pathology/` directory exists with minimal structure
- [ ] `pack.json` follows RFC-0003 schema
- [ ] Story files copied (not moved) to pack
- [ ] Documentation assets copied to pack
- [ ] README.md explains pack purpose and structure
- [ ] No runtime changes
- [ ] No Core API changes


