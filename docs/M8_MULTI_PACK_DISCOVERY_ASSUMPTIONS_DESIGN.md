# M8.3 Multi-Pack Discovery Assumptions Design

> **Version**: 1.0.0
> **Date**: 2026-07-06
> **Status**: Design — Documentation Only
> **Related**: M8.1 Contract Hardening Design (PR70), M8.2 PackRuntimeContext Schema (PR71), RFC-0009
> **Category**: Architecture — Discovery & Resolution Assumptions
> **Target Phase**: M8.3 (assumptions design only)

---

## Purpose

Define the formal assumptions, constraints, and policy decisions for **multi-pack discovery** in AWE Presentation OS. This document establishes what the system assumes about pack discovery, duplicate handling, version conflicts, ordering, output paths, and their implications for the resolver, CLI, and future validation gates.

This is **documentation-only**. No code is changed. No runtime behavior is altered.

## Scope

This document covers assumptions for:

1. **Multi-pack discovery** — how the system finds and enumerates packs
2. **Duplicate pack IDs** — policy when multiple packs share the same ID
3. **Conflicting pack versions** — policy when the same pack ID has different versions
4. **Discovery ordering** — deterministic ordering guarantees
5. **Output path collision** — isolation strategy for multi-pack rendering
6. **Resolver implications** — what the Pack Story Resolver assumes about discovery
7. **CLI compatibility** — how existing CLI flags interact with multi-pack scenarios
8. **Future validation gates** — what checks must pass before M8.4+ implementation
9. **Migration sequence** — safe progression from single-pack to multi-pack

---

## Non-goals

- **No executable discovery validation.** No new schema files, no new validators.
- **No runtime shape change.** M8.3 does not modify pack-discovery.js, pack-loader.js, or pack-registry.js.
- **No new CLI flags.** Existing flags (--list-packs, --inspect-pack, --validate-pack, --pack-story) remain unchanged.
- **No source-of-truth migration.** Registry remains default.
- **No automatic pack lookup.** automaticPackLookup remains false.
- **No resolver/context consumption implementation.** Resolver does not consume multi-pack discovery results.
- **No CI integration.** Manual guards remain manual.
- **No SDK API.** No public API changes.
- **No pack version resolution logic.** Version conflict policies are documented, not implemented.
- **No output path auto-generation.** --out behavior unchanged.
## Baseline: Current Pack Discovery Implementation

### Current State (as of M8.2)

The existing pack discovery pipeline operates as follows:

| Component | File | Responsibility |
|---|---|---|
| **Discovery** | `pack-discovery.js` | Scan `SCAN_DIRECTORIES` for `pack.json`; skip duplicates (first wins); return `{packId, packRoot}` |
| **Loader** | `pack-loader.js` | Discover → Read manifest → Validate → Resolve assets → Build context → Register |
| **Registry** | `pack-registry.js` | In-memory singleton; rejects duplicate `packId` with `DUPLICATE_PACK_ID` error |
| **CLI** | `bin/run.js` | `--list-packs` calls `loadAllPacks()`; `--inspect-pack` calls `inspectPack()` |

### Key Existing Behaviors

1. **Single scan directory**: `SCAN_DIRECTORIES = ["presentation-packs"]` (hardcoded)
2. **First-wins duplicate policy**: `pack-discovery.js` skips any pack ID already seen in an earlier directory
3. **Registry rejects duplicates**: `pack-registry.js` returns `DUPLICATE_PACK_ID` for second registration
4. **Partial success in loadAllPacks**: Returns `ok: true` if at least one pack loaded, even if others failed
5. **No version awareness**: Discovery returns pack ID and root; version is read only during manifest parsing
6. **No cross-directory coordination**: Each directory is scanned independently; no inter-directory communication

### Relevant Contract References

- M8.1 defines `boundaries.automaticPackLookup === false` (explicit opt-in required)
- M8.1 defines `runtime.loadedByDefault === false` (packs must be explicitly loaded)
- M8.1 defines `sourceOfTruth.packsAreDefault === false` (registry is default)
- M8.2 documents PackRuntimeContext schema including `governance.coreChangesAllowed === false`

---

## Assumption 1: Multi-Pack Discovery

### A1.1 Discovery Scanning

**Assumption**: The system scans a **configurable list** of directories for packs.

- **Current**: Single hardcoded directory `["presentation-packs"]`
- **Future**: Could expand to `["presentation-packs", "external-packs", "marketplace-packs"]`
- **Constraint**: Directory order determines precedence (first match wins for duplicate IDs)

**Policy Decision**: Directory order is a **deployment concern**, not a runtime concern. The order should be determined by:
1. Local packs (project-specific) — highest precedence
2. Shared packs (team/organization-level) — medium precedence
3. Marketplace/community packs (public) — lowest precedence

**Risk**: Adding new scan directories without updating `SCAN_DIRECTORIES` documentation creates inconsistency between code and design.

### A1.2 Discovery Completeness

**Assumption**: Discovery is **best-effort**, not exhaustive.

- If a `pack.json` exists but is malformed, discovery still "finds" the pack but loading fails.
- If a directory exists but contains no valid packs, discovery returns empty (not an error).
- If the scan directory itself doesn't exist, `discoverPacksWithError()` returns `PACKS_DIR_NOT_FOUND`.

**Policy Decision**: Discovery failures are **not fatal**. The system continues loading remaining packs. Only when zero packs succeed does `loadAllPacks()` return `ok: false`.

### A1.3 Discovery Performance

**Assumption**: Discovery is **fast enough** to run on every CLI invocation.

- No caching layer is assumed or required.
- `fs.readdirSync()` and `fs.existsSync()` are sufficient for typical pack counts (< 100 packs).
- If scan directories contain thousands of entries, performance may degrade — but this is outside the assumed operational envelope.

**Risk**: Large monorepos with hundreds of subdirectories in scan paths could cause noticeable CLI latency.
## Assumption 2: Duplicate Pack IDs

### D1. Duplicate Detection Policy

**Assumption**: Duplicate pack IDs are **detected at discovery time** (first-wins) and **rejected at registry time** (second-wins fails).

| Layer | Behavior | Error Code |
|---|---|---|
| **Discovery** | First occurrence wins; subsequent duplicates silently skipped | None (silent skip) |
| **Registry** | Second registration attempt returns `DUPLICATE_PACK_ID` | `DUPLICATE_PACK_ID` |
| **Loader** | Tolerates registry duplicate for previously loaded packs | Silently continues |

### D2. Current Behavior Analysis

The current `pack-discovery.js` implements silent skip:
```javascript
// Skip duplicates — first discovery wins
if (seenIds[packId]) {
  continue;
}
```

The current `pack-registry.js` implements hard rejection:
```javascript
if (_registry[context.packId]) {
  return { ok: false, error: "Duplicate pack id...", errorCode: "DUPLICATE_PACK_ID" };
}
```

The current `pack-loader.js` tolerates registry duplicate:
```javascript
// Register in memory (tolerate duplicates — loadAllPacks may have pre-registered)
var regResult = packRegistry.register(context);
if (!regResult.ok && regResult.errorCode !== "DUPLICATE_PACK_ID") {
  return normalizeError(regResult);
}
```

### D3. Policy Decisions for Multi-Pack

1. **Silent skip at discovery is acceptable for same-version duplicates.** If two directories contain a pack with the same ID and same version, silently skipping the second is the right behavior.

2. **Different versions of the same pack ID require explicit policy.** When `pack-a v1.0` exists in `presentation-packs/` and `pack-a v2.0` exists in `external-packs/`:
   - **Option A**: First-wins (current behavior). The older version is loaded; the newer is silently skipped. Risk: users unknowingly run outdated packs.
   - **Option B**: Last-wins. The newer version is loaded. Risk: breaks reproducibility.
   - **Option C**: Error. Both are reported; user must disambiguate. Safest but most disruptive.

   **Recommended policy**: **Option C (error)** for version conflicts. Silent skip (Options A/B) is acceptable only when versions are identical.

3. **Duplicate detection should be auditable.** Even though M8.3 does not implement logging, the design must allow future addition of a `--verbose` flag that reports skipped duplicates.

### D4. Risk

- **Breaking change risk**: Moving from silent skip to error on version conflicts will change CLI behavior for existing users with duplicate packs.
- **Mitigation**: The migration sequence (Section 9) must address this transition explicitly.
## Assumption 3: Conflicting Pack Versions

### V1. Version Resolution Policy

**Assumption**: Pack version conflicts are resolved by **manifest comparison**, not by filename or directory position.

- `pack.json` contains a `version` field (semver-compatible).
- When the same pack ID appears in multiple directories, versions are compared.
- Identical versions → silent skip (acceptable).
- Different versions → error (user must disambiguate).

### V2. Version Comparison Semantics

**Assumption**: Version comparison uses **semver-major-minor-patch** ordering.

| Scenario | Action |
|---|---|
| Same ID, same version | Skip silently (first wins) |
| Same ID, newer version found | Error: `VERSION_CONFLICT` |
| Same ID, older version found | Skip silently (newer wins) |
| Same ID, pre-release vs release | Treat as different versions → Error |

**Note**: Pre-release handling (e.g., `1.0.0-alpha` vs `1.0.0`) follows semver precedence rules: `1.0.0` > `1.0.0-alpha`.

### V3. Manifest Version Stability

**Assumption**: The `version` field in `pack.json` is **stable and immutable** after publication.

- Packs may be updated (new version published), but existing pack directories are not modified in-place.
- Migration from old pack to new pack is done by replacing the directory, not by editing `pack.json`.
- This assumption simplifies discovery: we never need to worry about a pack changing version between discovery and loading.

### V4. Risk

- **Semver library dependency**: Implementing proper semver comparison requires a library or careful manual parsing. M8.3 does not add any dependency.
- **Pre-release ambiguity**: Users may publish `1.0.0-beta.1` and `1.0.0-beta.2` as "compatible." The policy treats them as different versions, requiring explicit user choice.
## Assumption 4: Discovery Ordering

### O1. Deterministic Ordering Guarantee

**Assumption**: Discovery produces a **deterministic, stable order** regardless of filesystem behavior.

- `fs.readdirSync()` does **not** guarantee alphabetical order on all platforms (macOS APFS vs Linux ext4 behave differently).
- The discovered pack list must be **sorted by pack ID** after scanning all directories.
- Within a single directory, subdirectory order is sorted alphabetically.

### O2. Directory Precedence Ordering

**Assumption**: Directory order defines **precedence**, not just enumeration order.

| Directory Position | Precedence Level | Example |
|---|---|---|
| Index 0 (first) | Highest | `presentation-packs/` — local project packs |
| Index 1 | Medium | `shared-packs/` — team/organization packs |
| Index 2 (last) | Lowest | `community-packs/` — marketplace/public packs |

When the same pack ID exists in multiple directories:
- The pack from the **higher-precedence directory** is selected (subject to version conflict policy).
- Lower-precedence duplicates are silently skipped (unless version conflict detected).

### O3. Ordering Stability Across Runs

**Assumption**: Running discovery twice on the same filesystem state produces the **same result**.

- This is guaranteed by sorting pack IDs alphabetically after scanning.
- No reliance on `fs.readdirSync()` ordering.
- No reliance on hash map iteration order.

### O4. Risk

- **Performance cost**: Sorting N pack IDs is O(N log N). For N < 100, this is negligible.
- **Breaking change risk**: If existing users rely on undocumented `fs.readdirSync()` ordering, switching to sorted order could change which pack wins in a duplicate scenario.
- **Mitigation**: The migration sequence must include a deprecation period where ordering changes are logged but not errored.
## Assumption 5: Output Path Collision

### P1. Output Path Isolation Principle

**Assumption**: Each pack's rendered output goes to a **unique, isolated path** to prevent accidental overwrites.

Current behavior for `--pack-story`:
- Output goes to `output/ppt-factory/packs/<pack-id>/<story-name>.pptx`
- This is already isolated per pack.

Multi-pack implication:
- When multiple packs contain the same story ID (e.g., `digital-pathology-15` in both `pack-a` and `pack-b`), each pack's output must go to its own subdirectory.

### P2. Output Path Structure

**Assumption**: Multi-pack output follows this structure:

```
output/ppt-factory/
├── registry/                          # --story (registry-backed, unchanged)
│   └── digital-pathology-15.pptx
├── packs/
│   ├── pack-a/                        # --pack-story pack-a/digital-pathology-15
│   │   └── digital-pathology-15.pptx
│   ├── pack-b/                        # --pack-story pack-b/digital-pathology-15
│   │   └── digital-pathology-15.pptx
│   └── shared/                        # Packs loaded by loadAllPacks()
│       ├── pack-a-context.json
│       └── pack-b-context.json
```

### P3. --out Flag Interaction

**Assumption**: The existing `--out <path>` flag **overrides** all output path isolation.

- If the user specifies `--out /tmp/my-output`, all outputs go there regardless of pack identity.
- This is a **user responsibility** — the system does not protect against collisions when `--out` is explicitly set.
- The `--help` text should clarify this: "When --out is specified, pack isolation is disabled."

### P4. Risk

- **Disk space**: Multiple packs rendering the same story generates multiple output files. Users should be aware of this.
- **Cleanup strategy**: No automatic cleanup is assumed. Users must manage output directories.
- **CI/CD integration**: Automated runs that don't clean output directories between pack runs may accumulate stale files.
## Assumption 6: Resolver Implications

### R1. Pack Story Resolver Assumptions

**Assumption**: The Pack Story Resolver (`pack-story-resolver.js`) operates on a **single pack context** at a time.

Current behavior:
- `resolvePackStory("<pack-id>/<story-id>")` looks up `<pack-id>` in the registry, then resolves the story path.
- It does not iterate over multiple packs.
- It does not handle ambiguous story IDs across packs.

Multi-pack implication:
- If two packs both contain a story named `digital-pathology-15`, the resolver must be told **which pack** to look in.
- The `<pack-id>/<story-id>` format already supports this — the pack ID is explicit.
- However, `loadAllPacks()` loads multiple packs into the registry. The resolver must handle the case where the same pack ID is registered once (first-wins).

### R2. Resolver + Registry Consistency

**Assumption**: The resolver always finds the pack it's looking for **if it was successfully loaded**.

- If discovery skipped a duplicate pack, the resolver will only find the first-registered version.
- If version conflict caused an error, the pack may not be in the registry at all.
- The resolver should **never silently fall back** to a different pack — it must error if the requested pack is not found.

### R3. Resolver Error Codes

**Assumption**: Multi-pack scenarios introduce new error codes:

| Error Code | Condition |
|---|---|
| `PACK_NOT_FOUND` | Requested pack ID not in registry |
| `STORY_NOT_FOUND_IN_PACK` | Pack found, but story ID not in pack's contents |
| `VERSION_CONFLICT` | Same pack ID found in multiple directories with different versions |
| `MULTI_PACK_AMBIGUITY` | Multiple packs match a partial ID (future, not in M8.3) |

### R4. Risk

- **Breaking change risk**: If the resolver currently falls back gracefully when a pack is not found, changing to hard error will break existing workflows.
- **Mitigation**: M8.3 documents the desired behavior; M8.4+ implements it with a deprecation period.
## Assumption 7: CLI Compatibility

### C1. Existing CLI Flags

**Assumption**: All existing CLI flags remain **backward compatible** with multi-pack scenarios.

| Flag | Current Behavior | Multi-Pack Impact |
|---|---|---|
| `--list-packs` | Lists all loaded packs | Unchanged — already lists all discovered packs |
| `--inspect-pack <id>` | Inspects one pack | Unchanged — looks up by ID in registry |
| `--validate-pack <path>` | Validates one pack manifest | Unchanged — operates on a single path |
| `--pack-story <pack>/<story>` | Renders from pack story | Unchanged — explicit pack ID resolves ambiguity |
| `--story <id>` | Renders from registry | Unchanged — registry-backed, pack-agnostic |
| `--out <path>` | Sets output directory | Unchanged — user takes responsibility for collisions |
| `--validate-pack-story-parity` | Compares registry vs pack story | May need pack-awareness for multi-pack parity |

### C2. No New CLI Flags

**Assumption**: M8.3 does **not** add any new CLI flags.

- Future M8.4+ may add `--discover-packs` (dry-run discovery report), `--version-conflicts` (report version conflicts without loading), or `--verbose` (show skipped duplicates).
- These are **out of scope** for M8.3.

### C3. Help Text Updates

**Assumption**: The `--help` text should be updated to reflect multi-pack assumptions:

- Clarify that `--list-packs` reports all discovered packs.
- Clarify that duplicate pack IDs are handled by first-wins policy.
- Clarify that `--pack-story` requires an explicit pack ID to disambiguate.

### C4. Risk

- **Help text drift**: If help text is not updated alongside design documentation, users may rely on outdated behavior descriptions.
- **Backward compatibility**: Any new error messages or output format changes must be opt-in or behind a flag to avoid breaking existing CI/CD pipelines.
## Assumption 8: Future Validation Gates

### G1. Pre-Implementation Gates

Before M8.4+ implements multi-pack discovery changes, the following gates must pass:

| Gate | Description | Owner |
|---|---|---|
| **Gate 1: Schema Review** | PackRuntimeContext schema (M8.2) must be reviewed for multi-pack implications | Architecture Lead |
| **Gate 2: Resolver Contract** | Pack Story Resolver contract (M8.1) must document multi-pack behavior | Contract Owner |
| **Gate 3: CLI Compatibility** | All existing CLI flags must be verified against multi-pack scenarios | CLI Owner |
| **Gate 4: Output Isolation** | Output path isolation strategy must be validated against collision scenarios | Release Manager |
| **Gate 5: Version Policy** | Version conflict resolution policy must be approved by stakeholders | Product Owner |
| **Gate 6: Migration Plan** | Migration sequence from current behavior to multi-pack must be documented | Tech Lead |

### G2. Validation Checkpoints

**Assumption**: Each gate corresponds to a **manual review checkpoint** in the M8 milestone process.

- Gate 1-3: Can be reviewed in parallel (they cover different subsystems).
- Gate 4-6: Must be reviewed sequentially (Gate 4 depends on Gate 2, Gate 6 depends on Gate 5).

### G3. Risk Assessment Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate pack IDs cause silent data loss | Low | High | Error on version conflicts (Section D3) |
| Discovery ordering varies across platforms | Medium | Medium | Sort pack IDs alphabetically (Section O1) |
| Output path collisions corrupt PPTX files | Low | High | Per-pack output isolation (Section P2) |
| Resolver falls back to wrong pack | Medium | High | Hard error on missing pack (Section R2) |
| CLI help text becomes outdated | High | Low | Update help text with each PR (Section C3) |
| Migration breaks existing CI/CD pipelines | Medium | High | Deprecation period + opt-in flags (Section C4) |
## Assumption 9: Migration Sequence

### M1. Phased Migration Approach

**Assumption**: Multi-pack discovery changes are introduced in **three phases**, each gated by M8 milestones.

| Phase | Milestone | Changes | Risk Level |
|---|---|---|---|
| **Phase 1** | M8.3 (this doc) | Document all assumptions, policies, and risks. No code changes. | None |
| **Phase 2** | M8.4 | Implement discovery sorting, version conflict detection, and error reporting. Add `--discover-packs` dry-run flag. | Medium |
| **Phase 3** | M8.5 | Implement output path isolation, resolver hardening, and migration tooling. Remove silent skip for version conflicts. | High |

### M2. Phase 1: Documentation (M8.3)

**Deliverables**:
- This document (M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md)
- Updated ROADMAP.md referencing M8.3
- Updated M8.1 Contract Hardening Design noting multi-pack readiness
- Updated M8.2 PackRuntimeContext Schema noting multi-pack implications

**Verification**:
- No code changes → no smoke test changes needed
- Document reviewed by Architecture Lead and Contract Owner

### M3. Phase 2: Implementation (M8.4)

**Deliverables**:
- Discovery sorting by pack ID (alphabetical)
- Version conflict detection and error reporting
- `--discover-packs` dry-run flag (reports all discovered packs, skips, conflicts)
- Updated help text

**Verification**:
- Boundary smoke updated to verify discovery order
- Contract smoke updated to verify version conflict error codes
- Existing `--list-packs` output format unchanged

### M4. Phase 3: Hardening (M8.5)

**Deliverables**:
- Output path isolation enforcement
- Resolver hardening (hard error on missing pack)
- Migration tooling (`--migrate-duplicates` flag)
- Deprecation warnings for silent skip behavior

**Verification**:
- Full boundary smoke suite passes
- Contract smoke suite passes
- Parity validation passes for multi-pack scenarios
- CI integration (if applicable)

### M5. Backward Compatibility Guarantee

**Assumption**: Each phase maintains **backward compatibility** with existing single-pack workflows.

- `--list-packs` output format unchanged.
- `--inspect-pack` output format unchanged.
- `--pack-story` behavior unchanged for single-pack scenarios.
- `--story` behavior completely unchanged.
- New error codes are additive, not replacement.

### M6. Risk

- **Phase 2 disruption**: Adding version conflict errors may break existing projects with duplicate packs.
- **Mitigation**: Phase 2 introduces `--discover-packs` as a dry-run so users can identify conflicts before enabling hard errors.
- **Phase 3 disruption**: Removing silent skip for version conflicts is a breaking change.
- **Mitigation**: Phase 3 includes a `--allow-version-conflicts` flag for users who need the old behavior during migration.
## Cross-Reference: Assumptions to Contracts

The following table maps each assumption to the relevant contract from M8.1 and M8.2:

| Assumption | Related Contract | Contract Section | Status |
|---|---|---|---|
| A1.1 Configurable scan dirs | M8.1 Boundaries | `automaticPackLookup === false` | Documented |
| A1.2 Best-effort discovery | M8.1 Error Model | Partial success in `loadAllPacks()` | Documented |
| A1.3 Fast discovery | M8.1 Performance | No caching assumed | Documented |
| D1-D4 Duplicate policy | M8.1 Registry | `DUPLICATE_PACK_ID` error code | Documented |
| V1-V4 Version conflicts | M8.2 Schema | `identity.version` field | Documented |
| O1-O4 Ordering | M8.1 Contract | Deterministic behavior | Documented |
| P1-P4 Output paths | M8.2 Schema | `outputPolicy.paths` | Documented |
| R1-R4 Resolver | M8.1 Contract | `resolver.explicit` policy | Documented |
| C1-C4 CLI | M8.0 RFC | `--pack-story` explicit opt-in | Documented |
| G1-G3 Gates | M8.1 Contract | Validation contract | Documented |
| M1-M6 Migration | M8.1 Contract | Migration phases (M8.1 → M8.5) | Documented |

---

## Open Questions

The following questions are identified for future resolution (M8.4+):

1. **Should `SCAN_DIRECTORIES` be configurable via CLI flag?** (`--scan-dir <path>`)
   - Pro: Flexibility for diverse deployment models.
   - Con: Adds complexity; current single-directory model works for all known use cases.
   - **Recommendation**: Defer to M8.4+.

2. **Should discovery report skipped duplicates in verbose mode?**
   - Pro: Transparency helps debugging.
   - Con: Adds output noise for single-pack users.
   - **Recommendation**: Implement in M8.4 via `--discover-packs --verbose`.

3. **Should version conflict policy be configurable?** (`--version-policy <first-wins|error|newest-wins>`)
   - Pro: Flexibility for teams with different needs.
   - Con: Increases CLI surface area and mental model complexity.
   - **Recommendation**: Default to `error`; make configurable only in M8.5+.

4. **Should the resolver support wildcard pack matching?** (`--pack-story "*/digital-pathology-15"`)
   - Pro: Convenience when pack ID is unknown.
   - Con: Ambiguity risk; contradicts explicit opt-in philosophy.
   - **Recommendation**: Never implement. Require explicit pack ID.

5. **Should output path collision detection be proactive?** (Warn before rendering if output would overwrite)
   - Pro: Prevents accidental data loss.
   - Con: Adds I/O overhead; users who manage output directories manually may find it noisy.
   - **Recommendation**: Implement in M8.5 as `--warn-output-collisions` flag.
## Review Checklist

- [x] M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md created
- [x] Documentation-only (no code changes)
- [x] No package.json changes
- [x] No bin/run.js changes
- [x] No src/ changes
- [x] No scripts/ changes
- [x] No story JSON changes
- [x] No adapters/planners changes
- [x] Multi-pack discovery assumptions defined
- [x] Duplicate pack ID policy defined
- [x] Conflicting pack version policy defined
- [x] Discovery ordering guarantees defined
- [x] Output path collision isolation defined
- [x] Resolver implications documented
- [x] CLI compatibility analysis completed
- [x] Future validation gates defined (6 gates)
- [x] Migration sequence defined (3 phases)
- [x] Cross-reference to M8.1/M8.2 contracts completed
- [x] Open questions listed (5 questions)
- [x] Risk assessment matrix completed
- [x] No runtime behavior changes
- [x] No schema validation code
- [x] No JSON schema files
- [x] No PackRuntimeContext implementation changes
- [x] Boundary smoke expectations documented (unchanged)
- [x] Contract smoke expectations documented (unchanged)
- [x] Parity validation expectations documented (unchanged)

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-06 | Hermes | Initial Multi-Pack Discovery Assumptions Design (M8.3) |
