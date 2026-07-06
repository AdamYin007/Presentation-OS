# M8.2 PackRuntimeContext Contract Schema Documentation

> **Version**: 1.0.0
> **Date**: 2026-07-05
> **Status**: Design — Documentation Only
> **Related**: M8.1 Contract Hardening Design, M8.0 RFC-0009, PR70, PR71
> **Category**: Architecture — Schema Contract Reference
> **Target Phase**: M8.2 (schema documentation only)

---

## Purpose

Define the stable conceptual schema of PackRuntimeContext including required sections,
required fields, allowed values, semantic meanings, compatibility rules, versioning policy,
and extension rules. This is documentation-only. No executable schema validation is added.

## Scope

This document defines the conceptual schema contract for PackRuntimeContext:
- Required top-level sections
- Section-by-section field contracts
- Required values table
- Field semantics and stability rules
- Required vs optional vs reserved fields
- Extension rules
- Immutability and read-only contract
- Compatibility rules
- Versioning and deprecation policy
- Future schema validation gates
- Invalid and valid conceptual examples
- Resolver/context consumption implications
- Multi-pack implications: See M8.3 (PR72) for detailed multi-pack discovery assumptions. M8.2 documents PackRuntimeContext schema; M8.3 documents how discovery interacts with the schema.
- M8.3 assumes PackRuntimeContext sections (boundaries, sourceOfTruth, outputPolicy) are consumed by resolver. M8.2 does not implement this consumption.
- Error model implications

## Non-goals

- **No executable schema validation.** No JSON schema files, no TypeScript types.
- **No runtime shape change.** M8.2 does not modify PackRuntimeContext at runtime.
- **No resolver/context consumption.** Resolver does not consume PackRuntimeContext.
- **No source-of-truth migration.** Registry remains default.
- **No CLI changes.** No new commands, no output format changes.
- **No smoke script changes.** Existing manual guards remain unchanged.
- **No CI integration.** Manual guards remain manual.
- **No schema validator library.** No dependencies added.
- **No contractVersion field.** Versioning is documented but not implemented.
## Baseline After M8.1

M8.1 (PR70) established the Pack Runtime Contract Hardening Design:
- PackRuntimeContext contract defined (7 sections, 11 required values).
- Pack Loader contract defined (6 owns, 8 does-not-own).
- Pack Story Resolver contract defined (8 stable behaviors, 7 future preconditions).
- Shared context, output policy, source-of-truth, compatibility, validation, error model contracts defined.
- 9 contract hardening principles established.
- 9 resolver/context consumption preconditions listed.
- Migration phases defined (M8.1 → M8.5).

## Relationship to M8.1 Contract Hardening Design

M8.1 defined WHAT the contracts require. M8.2 defines HOW each contract field is structured,
what values are allowed, what semantics they carry, and how they evolve.

M8.1 is the design. M8.2 is the schema reference.

## Schema Documentation Principles

1. **Documentation before validation.** Document the schema before adding validators.
2. **Semantic stability before implementation.** Field meanings must be stable before enforcement.
3. **Required fields before optional extension.** Required fields are frozen; optional fields are additive.
4. **Explicit false values are contract values, not placeholders.** `false` means frozen boundary.
5. **Frozen context before shared context.** PackRuntimeContext must be immutable before sharing.
6. **No schema validator before schema review.** No executable validation in M8.2.
7. **No runtime enforcement in M8.2.** This is documentation only.
8. **No resolver consumption in M8.2.** Resolver does not consume PackRuntimeContext.
9. **No source-of-truth migration in M8.2.** Registry remains default.
10. **Contract version before compatibility automation.** Versioning is documented before enforcement.

## Conceptual Schema Overview

PackRuntimeContext is a frozen, read-only object with the following top-level sections:

```
PackRuntimeContext {
  identity: { packId, manifestPath, packRoot, manifestVersion }
  metadata: { name, version, status, description }
  governance: { coreChangesAllowed, migrationMode }
  runtime: { loadedByDefault, requiresPackLoader }
  boundaries: { storyRegistryDefault, packStoryExplicit, automaticPackLookup, plannerExtraction, adapterExtraction, themeExtraction, sourceOfTruthMigration }
  sourceOfTruth: { packsAreDefault }
  outputPolicy: { registryStoryOutputPath, packStoryOutputPath, parityTempOutputPath, collisionAvoidance }
  validation: { manifestValidationRequired, assetDeclarationValidationRequired, assetPathSafetyRequired, boundarySmokeRequired, contractSmokeRequired, parityGuardRequired }
}
```

**Notes:**
- M7/M8 smoke checks directly validate: governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation.
- Identity and metadata are currently derived from manifest. M8.2 documents them as target schema.
- M8.2 does not change the runtime object shape. This is a conceptual schema reference.

## Required Top-Level Sections

All 8 sections below are required. Missing any section is a contract violation.

| Section | Required | Mutability | Validated By |
|---|---|---|---|
| identity | Yes | Immutable | Pack Loader |
| metadata | Yes | Immutable | Pack Loader |
| governance | Yes | Immutable | Contract smoke |
| runtime | Yes | Immutable | Contract smoke |
| boundaries | Yes | Immutable | Boundary smoke |
| sourceOfTruth | Yes | Immutable | Boundary smoke |
| outputPolicy | Yes | Immutable | Boundary smoke |
| validation | Yes | Immutable | Contract smoke |

## Required Values Table

These are the frozen contract values. They must not change without RFC.

| Path | Required Value | Meaning |
|---|---|---|
| boundaries.storyRegistryDefault | true | --story remains registry-backed |
| boundaries.packStoryExplicit | true | --pack-story remains explicit opt-in |
| boundaries.automaticPackLookup | false | --story must not search packs |
| boundaries.plannerExtraction | false | planner remains core-owned |
| boundaries.adapterExtraction | false | adapter remains core-owned |
| boundaries.themeExtraction | false | theme remains core-owned |
| boundaries.sourceOfTruthMigration | false | packs are not default source of truth |
| sourceOfTruth.packsAreDefault | false | registry remains default |
| runtime.loadedByDefault | false | packs are not loaded by default rendering |
| runtime.requiresPackLoader | true | pack commands require Pack Loader |
| governance.coreChangesAllowed | false | pack contract does not authorize core changes |

## Section-by-Section Contract

### A. identity

**Purpose:** Uniquely identifies the pack this context belongs to.

**Conceptual fields (future target schema):**
- `packId`: string — unique pack identifier
- `manifestPath`: string — absolute path to pack.json
- `packRoot`: string — absolute path to pack directory
- `manifestVersion`: string — version from pack.json

**Stability rules:**
- Identity must be traceable to one pack.
- Identity must not be ambiguous in multi-pack scenarios.
- Identity must not be inferred from rendering story id alone.
- M8.2 does not implement new identity fields at runtime.

**Allowed values:** Any string conforming to pack ID naming conventions.
**Forbidden values:** Empty string, null, undefined.
**Extension rules:** Additive only. No removal of existing fields.

### B. metadata

**Purpose:** Descriptive information about the pack.

**Conceptual fields:**
- `name`: string — human-readable pack name
- `version`: string — pack version (semver)
- `status`: string — pack status (e.g., "experimental")
- `description`: string — optional pack description

**Stability rules:**
- Metadata is descriptive, not authoritative for source-of-truth.
- Version does not yet enforce compatibility.
- Status "experimental" does not alter CLI behavior.

**Allowed values:** Any string.
**Extension rules:** Additive only.
**Compatibility notes:** Changing metadata does not affect CLI output compatibility.

### C. governance

**Purpose:** Defines what the pack is and is not authorized to change.

**Required fields:**
- `coreChangesAllowed`: boolean — **must be `false`**
- `migrationMode`: string — **must be `"copy-first"`**

**Stability rules:**
- Governance fields are restrictive, not permissive.
- `coreChangesAllowed: false` means packs cannot authorize core runtime changes.
- `migrationMode: copy-first` means pack assets may be copied or mirrored but not made runtime defaults without RFC.

**Allowed values:**
- `coreChangesAllowed`: only `false`
- `migrationMode`: only `"copy-first"`

**Forbidden values:**
- `coreChangesAllowed: true` — contract violation
- Any other `migrationMode` value

**Extension rules:** Additive only. No removal of required fields.

### D. runtime

**Purpose:** Defines how the pack is loaded and used at runtime.

**Required fields:**
- `loadedByDefault`: boolean — **must be `false`**
- `requiresPackLoader`: boolean — **must be `true`**

**Stability rules:**
- `loadedByDefault: false` preserves explicit pack loading.
- `requiresPackLoader: true` preserves loader-owned pack command flow.
- Runtime section must not trigger rendering.
- Runtime section must not select planner/adapter/theme.

**Allowed values:**
- `loadedByDefault`: only `false`
- `requiresPackLoader`: only `true`

**Forbidden values:**
- `loadedByDefault: true` — violates explicit opt-in policy
- `requiresPackLoader: false` — breaks loader contract

**Extension rules:** Additive only.

### E. boundaries

**Purpose:** Frozen boundary values that define the platform contract.

**Required fields:**
- `storyRegistryDefault`: boolean — **must be `true`**
- `packStoryExplicit`: boolean — **must be `true`**
- `automaticPackLookup`: boolean — **must be `false`**
- `plannerExtraction`: boolean — **must be `false`**
- `adapterExtraction`: boolean — **must be `false`**
- `themeExtraction`: boolean — **must be `false`**
- `sourceOfTruthMigration`: boolean — **must be `false`**

**Stability rules:**
- `false` values are stable contract boundaries, not placeholders.
- `false` values must not be silently flipped.
- Any flip requires future RFC and implementation task.
- Boundaries are not feature flags for runtime auto-enablement.

**Allowed values:** Only the values listed above.
**Forbidden values:** Any deviation from the table.
**Extension rules:** Additive only. No removal of required fields.

### F. sourceOfTruth

**Purpose:** Defines which component is the default story source.

**Required fields:**
- `packsAreDefault`: boolean — **must be `false`**

**Stability rules:**
- Registry remains default.
- Pack story rendering remains explicit.
- `--story` must not search packs.
- Source-of-truth migration requires future RFC.

**Allowed values:** Only `false`.
**Forbidden values:** `true` — violates explicit opt-in policy.
**Extension rules:** Additive only.

### G. outputPolicy

**Purpose:** Defines output path policies for different rendering modes.

**Conceptual fields (future target schema):**
- `registryStoryOutputPath`: string — path pattern for --story output
- `packStoryOutputPath`: string — path pattern for --pack-story output
- `parityTempOutputPath`: string — isolated temp path for parity validation
- `collisionAvoidance`: string — strategy for avoiding output collisions

**Current policy (preserved in M8.2):**
- `--story` output path remains existing registry output path.
- `--pack-story` output path remains `output/ppt-factory/packs/<pack-id>/<story-id>.pptx`.
- Parity temp outputs remain isolated under `.parity-temp/`.
- M8.2 does not change output path behavior.

**Allowed values:** Path patterns matching existing conventions.
**Extension rules:** Additive only. No removal of required fields.

### H. validation

**Purpose:** Documents which validation checks are required and their status.

**Conceptual fields (future target schema):**
- `manifestValidationRequired`: boolean — manifest schema validation required
- `assetDeclarationValidationRequired`: boolean — asset declaration validation required
- `assetPathSafetyRequired`: boolean — asset path safety validation required
- `boundarySmokeRequired`: boolean — boundary smoke check required before merge
- `contractSmokeRequired`: boolean — contract smoke check required before merge
- `parityGuardRequired`: boolean — parity validation required before merge

**Stability rules:**
- Current manual guards remain required.
- M8.2 does not add runtime schema validation.
- Contract smoke is not a complete schema validator.
- Future M8.x may add validation only after schema review.

**Allowed values:** All booleans must be `true` (all checks required).
**Extension rules:** Additive only.
## Required vs Optional Fields

### Required Fields

All fields listed in the Required Values Table above are required. Identity and metadata fields below are target schema requirements for future hardening:

- `identity.packId` — required, immutable, traceable to one pack
- `metadata.name` — required, descriptive only
- `metadata.version` — required, semver string
- `metadata.status` — required, descriptive only
- `governance.coreChangesAllowed` — required, must be `false`
- `governance.migrationMode` — required, must be `"copy-first"`
- `runtime.loadedByDefault` — required, must be `false`
- `runtime.requiresPackLoader` — required, must be `true`
- `boundaries.storyRegistryDefault` — required, must be `true`
- `boundaries.packStoryExplicit` — required, must be `true`
- `boundaries.automaticPackLookup` — required, must be `false`
- `boundaries.plannerExtraction` — required, must be `false`
- `boundaries.adapterExtraction` — required, must be `false`
- `boundaries.themeExtraction` — required, must be `false`
- `boundaries.sourceOfTruthMigration` — required, must be `false`
- `sourceOfTruth.packsAreDefault` — required, must be `false`
- `outputPolicy.registryStoryOutputPath` — required, future target
- `outputPolicy.packStoryOutputPath` — required, future target
- `outputPolicy.parityTempOutputPath` — required, future target
- `validation.manifestValidationRequired` — required, future target
- `validation.contractSmokeRequired` — required, future target
- `validation.parityGuardRequired` — required, future target

### Optional Extension Fields

Optional fields may be added only if they satisfy ALL of these constraints:

- Read-only (no mutation of existing fields)
- Do not alter `--story` behavior
- Do not alter `--pack-story` behavior
- Do not authorize core changes
- Do not imply source-of-truth migration
- Do not trigger rendering
- Do not select planner/adapter/theme
- Do not change successful CLI output format

### Reserved Future Namespaces

The following namespaces are reserved for future design. They are documented but not implemented:

| Namespace | Purpose | Status |
|---|---|---|
| `compatibility` | Version compatibility rules | Reserved |
| `capabilities` | Feature capability flags | Reserved |
| `versioning` | Contract version tracking | Reserved |
| `dependencies` | Inter-pack dependency declarations | Reserved |
| `diagnostics` | Runtime diagnostic metadata | Reserved |
| `lifecycle` | Pack lifecycle state machine | Reserved |

Reserved means documented for future design, not implemented in M8.2.

## Immutability and Read-Only Contract

PackRuntimeContext must satisfy ALL of the following immutability guarantees:

1. **Frozen.** PackRuntimeContext must remain frozen (`Object.isFrozen` returns true).
2. **Read-only.** All consumers must treat it as read-only.
3. **No mutable state.** Context must not carry mutable rendering state.
4. **No manifest mutation.** Context must not mutate manifest.
5. **No output writing.** Context must not write outputs.
6. **No network fetch.** Context must not fetch network resources.
7. **No undeclared asset reads.** Context must not read undeclared assets during construction.
8. **No code execution.** Context must not execute pack code.

These guarantees are enforced by the Pack Loader at construction time. M8.2 documents them as contract requirements.

## Compatibility Rules

M8.2 preserves ALL existing compatibility guarantees:

| Command | Compatibility Guarantee |
|---|---|
| `--list-packs` | Successful output remains compatible |
| `--inspect-pack` | Successful output remains compatible |
| `--help` | Output remains compatible |
| `--unknown-flag` | Guard behavior remains compatible |
| `--story` | Rendering remains registry-backed |
| `--pack-story` | Rendering remains explicit opt-in |
| `--validate-pack-story-parity` | Parity comparison remains required |
| Pack Loader errorCode | Error model remains stable |

No compatibility guarantee may be broken without RFC.

## Versioning Policy

M8.2 is design-only. Versioning rules are documented but not implemented:

1. **No executable contractVersion.** M8.2 does not introduce `contractVersion` field.
2. **Future contractVersion.** May be documented in M8.2+ before implementation.
3. **Additive-first.** Future contractVersion must be additive.
4. **Minor additions.** Minor contract additions must be backward compatible.
5. **Breaking changes.** Breaking schema changes require RFC.
6. **Runtime enforcement.** Requires separate implementation PR.
7. **Manifest vs context.** Pack manifest version and context contract version are related but not identical.

## Deprecation Policy

1. **Required fields cannot be removed** without RFC.
2. **Required false boundary values cannot be flipped** without RFC.
3. **Successful CLI output cannot be broken** without RFC.
4. **Deprecated fields must remain readable** for at least one milestone.
5. **Deprecation cannot change --story source-of-truth.**
6. **Deprecation cannot make packs default.**

## Future Schema Validation Gates

Before adding executable schema validation, ALL of these must be satisfied:

1. M8.2 schema documentation completed. ✅
2. Required sections approved. ✅
3. Required values approved. ✅
4. Compatibility policy approved. ✅
5. Error model impact reviewed. ⬜
6. Multi-pack impact reviewed. ⬜
7. Resolver/context consumption impact reviewed. ⬜
8. Boundary smoke expected changes reviewed. ⬜
9. No public CLI output break guaranteed. ⬜
10. Separate implementation PR approved. ⬜

**M8.2 does not add schema validation.**

## Invalid Schema Examples

The following are DOCUMENTATION-ONLY conceptual examples of invalid contracts. They illustrate what must NOT occur:

| Invalid Example | Why Invalid |
|---|---|
| `boundaries.automaticPackLookup: true` | Violates explicit opt-in policy |
| `sourceOfTruth.packsAreDefault: true` | Violates registry default policy |
| `runtime.loadedByDefault: true` | Violates explicit pack loading |
| `governance.coreChangesAllowed: true` | Violates core boundary freeze |
| Missing `boundaries` section | Required section absent = contract violation |
| Mutable context | Violates immutability contract |
| `outputPolicy` changing `--story` output path | Violates output policy contract |
| `validation` implying CI is required now | Violates manual guard policy |
| `capabilities` enabling planner extraction | Violates extension rules |

## Valid Conceptual Example

**Illustrative only — not an executable schema and not necessarily the current runtime object shape.**

```json
{
  "identity": {
    "packId": "digital-pathology",
    "manifestPath": "/path/to/pack.json",
    "packRoot": "/path/to/pack",
    "manifestVersion": "0.1.0"
  },
  "metadata": {
    "name": "Digital Pathology Presentation Pack",
    "version": "0.1.0",
    "status": "experimental",
    "description": "Digital pathology presentation pack for M7/M8 validation"
  },
  "governance": {
    "coreChangesAllowed": false,
    "migrationMode": "copy-first"
  },
  "runtime": {
    "loadedByDefault": false,
    "requiresPackLoader": true
  },
  "boundaries": {
    "storyRegistryDefault": true,
    "packStoryExplicit": true,
    "automaticPackLookup": false,
    "plannerExtraction": false,
    "adapterExtraction": false,
    "themeExtraction": false,
    "sourceOfTruthMigration": false
  },
  "sourceOfTruth": {
    "packsAreDefault": false
  },
  "outputPolicy": {
    "registryStoryOutputPath": "output/ppt-factory/<story-id>.pptx",
    "packStoryOutputPath": "output/ppt-factory/packs/<pack-id>/<story-id>.pptx",
    "parityTempOutputPath": ".parity-temp/",
    "collisionAvoidance": "path-isolation"
  },
  "validation": {
    "manifestValidationRequired": true,
    "assetDeclarationValidationRequired": true,
    "assetPathSafetyRequired": true,
    "boundarySmokeRequired": true,
    "contractSmokeRequired": true,
    "parityGuardRequired": true
  }
}
```

This is illustrative only. The actual runtime object shape may differ. M8.2 does not change runtime behavior.

## Resolver/Context Consumption Implications

M8.2 does NOT implement resolver/context consumption. The following are preconditions for future implementation:

- Resolver may consume PackRuntimeContext only after future RFC/implementation.
- Resolver may use context for declaration checks only after approval.
- Resolver may use `boundaries` to enforce explicit mode only after approval.
- Resolver must not auto-search packs for `--story`.
- Resolver must not load planners/adapters/themes from packs.

**M8.2 does not implement resolver/context consumption.**

## Multi-Pack Implications

M8.2 does NOT implement multi-pack behavior changes. The following are design assumptions:

- Identity must disambiguate packId in multi-pack scenarios.
- Duplicate pack ids require formal policy (deferred to M8.3).
- Conflicting versions require formal policy (deferred to M8.3).
- Output paths must remain collision-safe (defined in outputPolicy).
- Pack discovery changes deferred to M8.3.

**M8.2 does not implement multi-pack behavior changes.**

## Error Model Implications

- M8.2 does not add errorCode.
- Existing Pack Loader errorCode contract remains stable.
- Future schema validation may require `SCHEMA_CONTRACT_VIOLATION` or similar, but this is not implemented.
- New errorCodes require explicit implementation task.

## Migration Notes

Safe migration sequence for M8:

| Phase | Milestone | Type | Status |
|---|---|---|---|
| M8.1 | Pack Runtime Contract Hardening Design | Design | ✅ Done |
| M8.2 | PackRuntimeContext Contract Schema Documentation | Design | **This PR** |
| M8.3 | Multi-Pack Discovery Assumptions Design | Design | Proposed |
| M8.4 | Resolver/Context Consumption RFC | RFC | Proposed |
| M8.5 | M8 Runtime Contract Checkpoint | Checkpoint | Proposed |
