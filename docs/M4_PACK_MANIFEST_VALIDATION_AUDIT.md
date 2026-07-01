# M4 Pack Manifest Validation Audit

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR38 — audit of digital-pathology pack.json before pack loader implementation
> **Governance**: RFC-0001, RFC-0003 — documentation only, no code changes

---

## 1 Summary

This audit reviews the current `presentation-packs/digital-pathology/pack.json` manifest
and the pack's on-disk asset structure. It identifies what a future pack loader must validate,
what errors must be handled gracefully, and recommends a safe PR39 scope.

**Key findings:**
- `pack.json` is valid JSON ✅
- `pack.json` follows RFC-0003 conventions ✅
- All paths listed in `pack.json` exist on disk ✅
- 3 files present but unlisted in manifest (README.md, pack.json itself, .gitkeep×9)
- No Core changes required for a read-only manifest validator
- Hero-sequence binding to stories is implicit (via file relationship, not explicit field)

---

## 2 Current Pack Structure

```
presentation-packs/digital-pathology/
├── pack.json                          # Manifest (listed ✅)
├── README.md                          # Documentation (unlisted)
├── stories/
│   ├── .gitkeep                       # Placeholder (unlisted)
│   └── digital-pathology-15.json      # Story (listed ✅)
├── hero-sequences/
│   ├── .gitkeep                       # Placeholder (unlisted)
│   └── digital-pathology-15-hero-sequence.json  # Hero metadata (listed ✅)
├── content/
│   └── .gitkeep                       # Placeholder (unlisted)
├── planners/
│   └── .gitkeep                       # Placeholder (unlisted)
├── adapters/
│   └── .gitkeep                       # Placeholder (unlisted)
├── themes/
│   └── .gitkeep                       # Placeholder (unlisted)
├── terminology/
│   ├── .gitkeep                       # Placeholder (unlisted)
│   └── digital-pathology-story-v1.md  # Story grammar (listed ✅)
├── references/
│   ├── .gitkeep                       # Placeholder (unlisted)
│   ├── medical-ai-layouts-v1.md       # Layout ref 1 (listed ✅)
│   └── medical-ai-layouts-v2.md       # Layout ref 2 (listed ✅)
└── examples/
    └── .gitkeep                       # Placeholder (unlisted)
```

**Total files on disk:** 16 (including pack.json and README.md)
**Files listed in pack.json:** 6 (stories, heroSequences, terminology, references arrays)
**Unlisted files:** 10 (README.md, pack.json, 9× .gitkeep)

---

## 3 Manifest Review

| Field | Current Value | Required? | RFC Alignment | Loader Use | Notes |
|---|---|---|---|---|---|
| `name` | `"digital-pathology"` | ✅ Yes | RFC-0003 §7 | Pack identifier | ✅ Valid kebab-case |
| `version` | `"0.1.0"` | ✅ Yes | RFC-0003 §7 | Semver comparison | ✅ Valid semver |
| `status` | `"experimental"` | ❌ No | RFC-0003 §5 | Display metadata | Not in RFC spec, useful for UX |
| `type` | `"presentation-pack"` | ✅ Yes | RFC-0003 §6 | Dispatch logic | RFC-0003 uses specific types (story, planner, etc.) |
| `domain` | `"healthcare/digital-pathology"` | ❌ No | RFC-0003 §7 | Tag/filter | Not in RFC spec, useful for search |
| `description` | String | ✅ Yes | RFC-0003 §7 | Display metadata | ✅ Present |
| `compatibleWith.presentationOS` | `">=0.3.0"` | ✅ Yes | RFC-0003 §7 | Version check | ✅ Valid semver range |
| `compatibleWith.rfc` | `["RFC-0001", "RFC-0003"]` | ❌ No | RFC-0003 §7 | Dependency check | ✅ Lists governing RFCs |
| `contents.stories` | Array (1 entry) | ✅ Yes | RFC-0003 §6.1 | Story exposure | ✅ 1 story listed |
| `contents.heroSequences` | Array (1 entry) | ❌ No | RFC-0003 §6.3 | Hero exposure | Not in RFC spec, pack-specific extension |
| `contents.content` | `[]` | ❌ No | RFC-0003 §6.2 | Content exposure | Empty placeholder |
| `contents.planners` | `[]` | ❌ No | RFC-0003 §6.2 | Planner exposure | Empty placeholder |
| `contents.adapters` | `[]` | ❌ No | RFC-0003 §6.4 | Adapter exposure | Empty placeholder |
| `contents.themes` | `[]` | ❌ No | RFC-0003 §6.5 | Theme exposure | Empty placeholder |
| `contents.terminology` | Array (1 entry) | ❌ No | RFC-0003 §6.2 | Terminology exposure | Pack-specific extension |
| `contents.references` | Array (2 entries) | ❌ No | RFC-0003 §6.9 | Reference exposure | Pack-specific extension |
| `contents.examples` | `[]` | ❌ No | RFC-0003 §6.9 | Example exposure | Empty placeholder |
| `runtime.loadedByDefault` | `false` | ❌ No | RFC-0003 §9 | Load control | Pack-specific extension |
| `runtime.requiresPackLoader` | `true` | ❌ No | RFC-0003 §9 | Dependency check | Pack-specific extension |
| `governance.coreChangesRequired` | `false` | ❌ No | RFC-0003 §5 | Dependency check | Pack-specific extension |
| `governance.migrationMode` | `"copy-first"` | ❌ No | RFC-0003 §5 | Migration policy | Pack-specific extension |

**Key observations:**
- RFC-0003 uses `assets` array (Section 7), not `contents` object. Our manifest uses a different but compatible structure.
- `type` should ideally be one of the RFC-0003 types: `story-template`, `content-planner`, `hero-pattern`, `layout-pattern`, `theme-variant`, `chart`, `icon`, `validation-rule`, `example-deck`. Current value `"presentation-pack"` is a meta-type.
- All `contents.*` arrays use relative paths from the pack root — this is correct and RFC-0003 compliant.

---

## 4 Asset Path Validation

| Manifest Section | Path | Exists | Type | Notes |
|---|---|---|---|---|
| `contents.stories[0]` | `stories/digital-pathology-15.json` | ✅ | Story | Listed in pack.json, exists on disk |
| `contents.heroSequences[0]` | `hero-sequences/digital-pathology-15-hero-sequence.json` | ✅ | Hero Seq | Listed in pack.json, exists on disk |
| `contents.terminology[0]` | `terminology/digital-pathology-story-v1.md` | ✅ | Grammar | Listed in pack.json, exists on disk |
| `contents.references[0]` | `references/medical-ai-layouts-v1.md` | ✅ | Layout Ref | Listed in pack.json, exists on disk |
| `contents.references[1]` | `references/medical-ai-layouts-v2.md` | ✅ | Layout Ref | Listed in pack.json, exists on disk |
| `contents.content` | *(empty)* | — | Placeholder | Empty array, no paths to validate |
| `contents.planners` | *(empty)* | — | Placeholder | Empty array, no paths to validate |
| `contents.adapters` | *(empty)* | — | Placeholder | Empty array, no paths to validate |
| `contents.themes` | *(empty)* | — | Placeholder | Empty array, no paths to validate |
| `contents.examples` | *(empty)* | — | Placeholder | Empty array, no paths to validate |

**Result:** All 5 listed paths exist on disk. No broken references.

---

## 5 Unlisted Pack Files

| File | Listed in pack.json? | Action Needed |
|---|---|---|
| `README.md` | ❌ | No. Documentation file, not a runtime asset. |
| `pack.json` | N/A | Self-referencing manifest, not listed in its own contents. |
| `stories/.gitkeep` | ❌ | No. Git placeholder, not a runtime asset. |
| `hero-sequences/.gitkeep` | ❌ | No. Git placeholder. |
| `content/.gitkeep` | ❌ | No. Git placeholder. |
| `planners/.gitkeep` | ❌ | No. Git placeholder. |
| `adapters/.gitkeep` | ❌ | No. Git placeholder. |
| `themes/.gitkeep` | ❌ | No. Git placeholder. |
| `terminology/.gitkeep` | ❌ | No. Git placeholder. |
| `references/.gitkeep` | ❌ | No. Git placeholder. |
| `examples/.gitkeep` | ❌ | No. Git placeholder. |

**Conclusion:** Unlisted files are all non-runtime assets (documentation, git placeholders). No loader concern.

---

## 6 Loader Requirements

A future pack loader must perform these operations, in order:

### 6.1 Manifest Parsing
1. Read `presentation-packs/<name>/pack.json`
2. Validate it is well-formed JSON
3. Parse required fields: `name`, `version`, `type`, `contents`
4. Parse optional fields: `status`, `description`, `compatibleWith`, `runtime`

### 6.2 Schema Validation
1. `name`: must be non-empty string, kebab-case
2. `version`: must be valid semver
3. `type`: must be one of known pack types or a registered custom type
4. `contents`: must be an object with at least one non-empty array
5. `contents.stories`: each entry must be a `.json` file path
6. `contents.heroSequences`: each entry must be a `.json` file path
7. `contents.terminology`: each entry must be a `.md` file path
8. `contents.references`: each entry must be a `.md` file path

### 6.3 Path Resolution
1. Resolve all paths relative to pack root directory
2. Verify each resolved path exists on filesystem
3. Report missing files with clear error messages

### 6.4 Version Compatibility
1. Check `compatibleWith.presentationOS` against current version
2. Check `compatibleWith.rfc` against known RFC versions
3. Warn on incompatible versions, reject on hard mismatch

### 6.5 Story Exposure
1. Load stories listed in `contents.stories`
2. Make them available to the story resolver
3. Do NOT auto-register them as default render targets

### 6.6 Hero Sequence Exposure
1. Load hero sequences listed in `contents.heroSequences`
2. Bind them to their corresponding story (by name/id)
3. Do NOT treat hero sequences as standalone stories

### 6.7 Terminology & References
1. Load `.md` files listed in `contents.terminology` and `contents.references`
2. Store as metadata for documentation/search purposes
3. Do NOT inject into rendering pipeline

### 6.8 Safety Constraints
1. **Never** modify Core behavior
2. **Never** change default rendering path
3. **Never** overwrite existing story files
4. **Never** auto-load packs at startup (`loadedByDefault: false`)
5. **Never** execute pack content as code

---

## 7 Error Handling Requirements

| Error Condition | Severity | Loader Action | User Message |
|---|---|---|---|
| `pack.json` not found | Critical | Skip pack entirely | "Presentation pack '<name>' not found: missing pack.json" |
| Invalid JSON in pack.json | Critical | Skip pack entirely | "Invalid JSON in '<path>/pack.json': <error>" |
| Missing required field (name/version/type) | Critical | Skip pack entirely | "Invalid pack manifest: missing required field '<field>'" |
| Missing story file | Warning | Log warning, continue | "Story file not found: '<path>' in pack '<name>'" |
| Missing hero-sequence file | Warning | Log warning, continue | "Hero sequence file not found: '<path>' in pack '<name>'" |
| Missing terminology file | Info | Log info, continue | "Terminology file not found: '<path>' in pack '<name>'" |
| Unsupported pack type | Warning | Skip pack | "Unsupported pack type '<type>' in pack '<name>'" |
| Incompatible RFC version | Warning | Skip pack | "Incompatible RFC version in pack '<name>'" |
| Incompatible Presentation OS version | Warning | Skip pack | "Incompatible Presentation OS version in pack '<name>'" |
| Invalid semver in version field | Critical | Skip pack | "Invalid semver in pack '<name>': '<value>'" |
| Invalid semver in compatibleWith | Warning | Log warning, continue | "Invalid semver range in '<name>': '<value>'" |

---

## 8 Story and Hero Sequence Binding

### Current State

| File | Role | Bound To |
|---|---|---|
| `stories/digital-pathology-15.json` | Renderable story | Standalone |
| `hero-sequences/digital-pathology-15-hero-sequence.json` | Hero metadata | Implicitly bound to story `digital-pathology-15` |

### Binding Rules

1. **Hero sequences are not standalone stories.** They are companion metadata that describe the hero animation for a specific story slide.
2. **Binding is implicit.** The hero sequence filename contains the story name (`digital-pathology-15-hero-sequence.json` → story `digital-pathology-15`).
3. **Future explicit binding.** A future RFC may add a `meta.story_id` field to hero sequences for explicit binding. Until then, filename-based matching is acceptable.
4. **Loader must NOT treat hero sequences as renderable stories.** They should only be exposed to the Hero Engine when the corresponding story is rendered.

### Story-Hero Relationship Diagram

```
pack.json
  ├── contents.stories[0] → stories/digital-pathology-15.json
  └── contents.heroSequences[0] → hero-sequences/digital-pathology-15-hero-sequence.json
                                    │
                                    └── bound to story "digital-pathology-15" (implicit)
```

---

## 9 PR39 Loader PoC Recommendation

### Recommendation: Proceed with Read-Only Manifest Validator

**PR39 Scope:** Implement a read-only pack manifest validator, NOT a full runtime loader.

### What PR39 Should Do

1. Read `pack.json` from a given pack directory
2. Validate JSON syntax
3. Validate required fields (name, version, type, contents)
4. Resolve and verify all listed paths exist
5. Report validation results (pass/fail with details)
6. **Do NOT** change default rendering behavior
7. **Do NOT** auto-load packs
8. **Do NOT** inject pack assets into rendering pipeline

### CLI Interface

```bash
# Validate a specific pack
node bin/run.js --validate-pack presentation-packs/digital-pathology

# Expected output (success):
# ✅ Pack 'digital-pathology' v0.1.0 validated successfully
# ✅ 1 story(s) found
# ✅ 1 hero sequence(s) found
# ✅ 1 terminology file(s) found
# ✅ 2 reference file(s) found
# ✅ All paths resolved

# Expected output (failure):
# ❌ Pack 'digital-pathology' validation failed
# ⚠️ Missing story file: stories/nonexistent.json
# ⚠️ Missing hero sequence: hero-sequences/missing.json
```

### What PR39 Should NOT Do

- ❌ Change default rendering path
- ❌ Register pack stories as render targets
- ❌ Modify Core APIs
- ❌ Implement pack loading at startup
- ❌ Support dynamic pack discovery
- ❌ Implement pack SDK or plugin system

---

## 10 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Runtime behavior change | Low | High | PR39 is read-only, no rendering changes |
| Pack/story path confusion | Medium | Medium | Clear documentation of pack vs registry paths |
| Hero-sequence misuse as story | Medium | High | Explicit loader rule: hero ≠ story |
| Premature SDK abstraction | High | Medium | PR39 is validator only, no SDK |
| `loadedByDefault` confusion | Low | Medium | PR39 ignores this field; documents meaning |
| RFC version incompatibility | Low | Low | PR39 validates but does not enforce |
| Duplicate content between pack and registry | Medium | Medium | `migrationMode: "copy-first"` allows duplication during transition |

---

## 11 Recommendation

### What Should Happen Next

1. **PR38 (this PR)** — ✅ Complete. Audit documented.
2. **PR39** — Implement a read-only pack manifest validator with CLI interface (`--validate-pack`). No runtime changes. No default behavior changes.
3. **PR40** — After PR39 validation passes, implement minimal pack story exposure (load stories from pack, make available to resolver, but do NOT change default rendering).
4. **PR41** — Implement hero-sequence binding (filename-based matching, no runtime impact on legacy rendering).
5. **PR42** — Implement terminology/reference loading (metadata only, no rendering impact).

### Strict PR39 Boundary

PR39 must be **strictly read-only validation**. It should:
- Only read `pack.json` and verify paths
- Only output validation results to stdout/stderr
- Never modify any rendering behavior
- Never change default CLI behavior
- Never auto-load any pack

If PR39 passes validation without issues, the pack is ready for future runtime integration. If PR39 fails, the loader should report clear errors but never crash the rendering pipeline.

---

**End of Audit.**

| Item | Status |
|---|---|
| pack.json valid JSON | ✅ |
| All listed paths exist | ✅ |
| No runtime changes made | ✅ |
| No code files modified | ✅ |
| PR39 scope defined | ✅ |
| Risks documented | ✅ |

**Next step:** Await user decision on PR39 scope.

---

## Implementation Note

> **PR39 Implemented** — A read-only pack manifest validator was added to the project.
> - Module: `registry/packages/ppt-factory/src/pack-validator.js`
> - CLI: `node bin/run.js --validate-pack <path>`
> - No runtime loading, no default behavior changes, no story modification.
> - Validates all required manifest fields, path existence, path traversal security.
