# M9.0 Contract Version Readiness Design

## 1. Purpose

M9.0 defines the design readiness for a future `contractVersion` mechanism in PackRuntimeContext.

This PR does not implement `contractVersion`. It establishes the conceptual foundation, placement strategy, compatibility rules, and migration path so that future milestones (M9.1+) can build on a shared design without ambiguity.

## 2. Non-Goals

M9.0 explicitly does NOT:

- Implement contractVersion in any runtime code
- Modify PackRuntimeContext runtime shape
- Add JSON schema files
- Add hard validation gates
- Change CLI output formats
- Change resolver behavior
- Change multi-pack discovery behavior
- Change GitHub Actions workflow

## 3. Background

M8 completed the documentation and smoke validation foundation:

- M8.2 PackRuntimeContext Contract Schema
- M8.3 Multi-Pack Discovery Assumptions
- M8.4 Resolver Boundary & Error Semantics
- M8.5 Validation Gates & Contract Enforcement
- M8.6 First Docs Smoke Check
- M8.7 Doctor Integration
- M8.8 Validation Script Entrypoints
- M8.9 GitHub Actions Check
- M8.10 Validation Checkpoint

These milestones established that PackRuntimeContext contracts are documented, discoverable, and smoke-checked. However, there is no machine-readable or runtime-identifiable contractVersion yet.

## 4. Problem Statement

The PackRuntimeContext contract is now fully documented and enforced at the smoke-check level. Without a machine-readable `contractVersion`, the system cannot:

- Safely determine compatibility between packs
- Produce structured soft validation reports
- Plan safe progression toward hard validation gates
- Help downstream consumers assess whether a pack meets their contract requirements
- Reference a specific contract version in error reports

This gap prevents moving from smoke checks to soft validation and eventually hard gates.

## 5. Contract Version Goals

A future `contractVersion` mechanism should support:

- **Explicit contract lineage**: Each pack's contractVersion identifies which contract specification it targets.
- **Backward compatibility assessment**: Consumers can determine whether a pack's contract is compatible with their expectations.
- **Soft validation reporting**: Validation reports can include contractVersion context for structured diagnostics.
- **Future hard gate eligibility**: Packs with a recognized contractVersion become candidates for hard gate promotion.
- **Downstream consumer awareness**: External tools and consumers can evaluate contract compatibility without parsing full schema.
- **Error report referencing**: Validation errors can cite the specific contractVersion for traceability.

## 6. Proposed Contract Version Shape

The following conceptual fields are proposed for future implementation (NOT implemented in this PR):

| Field | Type | Description |
|---|---|---|
| `contractVersion` | string | Machine-readable contract version identifier |
| `contractName` | string | Human-readable contract name |
| `contractStatus` | enum | One of: `stable`, `beta`, `deprecated`, `experimental` |
| `minSupportedVersion` | string | Minimum contract version this pack supports |
| `introducedIn` | string | Milestone or version where this contract was introduced |
| `deprecatedIn` | string | Milestone or version where this contract was deprecated |
| `compatibilityNotes` | string | Free-form notes about known compatibility considerations |

These fields would likely reside in a `metadata` or `identity` section of PackRuntimeContext, but M9.0 does not decide the final placement — it only proposes options.

## 7. Placement Options

### Option A: Top-level `contractVersion`

Place `contractVersion` directly at the root of PackRuntimeContext.

**Pros:**
- Easiest to discover and parse
- No nesting complexity
- Immediate availability for all consumers

**Risks:**
- Pollutes the top-level namespace
- May conflict with existing or future top-level fields
- Less flexible for contract metadata evolution

**Compatibility impact:**
- Low risk for readers (extra field at root)
- Moderate risk for writers who validate top-level keys strictly

### Option B: `metadata.contractVersion`

Nest `contractVersion` under a `metadata` object.

**Pros:**
- Keeps contract information grouped with other metadata
- Non-intrusive to top-level namespace
- Easy to extend with additional metadata fields

**Risks:**
- Slightly harder to discover (requires navigating one level deep)
- Requires consumers to understand metadata structure

**Compatibility impact:**
- Low risk — `metadata` is a natural extension point
- Existing tools ignoring unknown objects are unaffected

### Option C: `identity.contractVersion`

Nest `contractVersion` under a dedicated `identity` section.

**Pros:**
- Semantically clear: identity describes what the pack IS
- Separates identity from general metadata
- Clean separation of concerns

**Risks:**
- Requires defining an `identity` section (may not exist yet)
- More structural change than Option B

**Compatibility impact:**
- Moderate risk — requires adding a new top-level section
- Most intrusive of the three options

## 8. Recommended Placement

**Recommendation: Prioritize Option B (`metadata.contractVersion`)** for initial design consideration, with Option C (`identity.contractVersion`) as an alternative if an `identity` section is planned.

**Why NOT top-level (Option A) immediately:**

1. The top-level namespace should remain minimal and stable. Adding contract metadata there increases collision risk as the schema evolves.
2. `metadata` is the conventional location for non-functional attributes in many schema designs.
3. If an `identity` section is introduced later, `contractVersion` could naturally move there without breaking changes (since it would still be nested).

**M9.0 stance:** This recommendation is design-only. No placement is finalized. Future milestones should revisit this decision when implementing soft validators.

## 9. Missing Version Behavior

When a PackRuntimeContext lacks a `contractVersion`, the system should behave as follows across milestones:

| Milestone | Behavior |
|---|---|
| M9.0 | Documentation only. No runtime check. |
| M9.1 | Soft warning only. `awe doctor` reports missing contractVersion as advisory. |
| M9.2 / M9.3 | Structured soft validation report. Missing contractVersion appears in validation output with severity `warning`. |
| M10+ | Eligible for hard gate, but only after migration period. |

Missing contractVersion should never cause immediate failure in M9.x.

## 10. Compatibility Rules

The following rules govern contractVersion behavior:

1. **Missing contractVersion should not cause immediate failure.** Packs without contractVersion are tolerated until M10+.
2. **Unknown higher versions should not silently succeed.** If a pack reports a contractVersion higher than the consumer understands, produce a warning rather than assuming compatibility.
3. **Lower versions should produce a compatibility warning.** If a pack's contractVersion is older than the consumer's minimum, flag it as a compatibility concern.
4. **Deprecated versions should produce a deprecation warning.** Packs with `deprecatedIn` status should be flagged in validation reports.
5. **Hard fail can only be enabled after migration.** Hard validation gates must wait until a migration period has elapsed and consumers have had opportunity to update.
6. **CLI output compatibility is paramount.** No breaking changes to existing CLI output formats. New information must be additive or opt-in.

## 11. Validation Readiness Gates

The following gates are proposed for future implementation (NOT implemented in this PR):

| Gate ID | Description | Severity Target |
|---|---|---|
| `CONTRACT_VERSION_PRESENT_SOFT_GATE` | Warns if contractVersion is missing | Warning |
| `CONTRACT_VERSION_FORMAT_GATE` | Validates contractVersion format (e.g., semver) | Warning |
| `CONTRACT_VERSION_SUPPORTED_RANGE_GATE` | Checks contractVersion against min/max supported range | Warning → Error |
| `CONTRACT_VERSION_DEPRECATION_GATE` | Flags deprecated contractVersions | Warning |
| `CONTRACT_VERSION_HARD_GATE_READINESS` | Determines if hard gate is eligible based on migration progress | Informational |

These gates define the target state. M9.1+ will progressively implement them, starting with soft validators.

## 12. Error Reporting Implications

Future validation reports should include the following fields when contractVersion is relevant:

| Field | Description |
|---|---|
| `gateId` | Identifier of the gate that triggered the report |
| `severity` | One of: `info`, `warning`, `error`, `critical` |
| `errorCode` | Machine-readable error code |
| `contractVersion` | The pack's reported contractVersion |
| `expectedVersion` | The consumer's expected or minimum version |
| `actualVersion` | The version actually found (may differ from contractVersion) |
| `migrationHint` | Human-readable suggestion for resolving the issue |

This structure enables structured, machine-parseable validation output while remaining human-readable.

## 13. CLI Compatibility Implications

The following CLI compatibility principles apply:

- **`awe doctor`** can display a warning about missing contractVersion without changing existing output format.
- **`npm run check:all`** continues to run smoke checks and soft validation only. No behavioral change.
- **`list` / `help` / `story` / `pack-story`** output remains unchanged. contractVersion is not surfaced in these commands until M10+.
- **No breaking behavior changes.** All new output must be additive, opt-in, or behind a flag.

## 14. Migration Sequence

The recommended migration sequence toward contractVersion enforcement:

1. **M9.0 Contract Version Readiness Design** (this PR)
   - Define goals, placement options, compatibility rules
   - Establish design baseline for future work

2. **M9.1 Soft Validator Design**
   - Design the soft validator architecture
   - Define warning output format

3. **M9.2 Soft Validator Implementation**
   - Implement CONTRACT_VERSION_PRESENT_SOFT_GATE
   - Add warning to `awe doctor` output

4. **M9.3 Resolver ErrorCode Soft Validation**
   - Integrate contractVersion into resolver error codes
   - Add structured validation reporting

5. **M9.4 Validation Report Format**
   - Standardize the validation report structure
   - Include all proposed fields from Section 12

6. **M10.0 Hard Gate Candidate**
   - Evaluate readiness for hard gate promotion
   - Define migration criteria and timeline

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Premature hard fail | Breaks existing packs before migration | Only enable hard gates after migration period; use soft validation first |
| Downstream consumer incompatibility | External tools may fail on new fields | Keep contractVersion optional; additive-only changes |
| Top-level namespace pollution | Schema becomes unwieldy | Prefer nested placement (metadata or identity) |
| Version semantics instability | Semver vs date-based confusion | Define clear versioning policy in M9.1; stick to one convention |
| CLI output breaking | Users lose ability to parse output | Never change existing output format; add new fields only |
| Multi-pack version conflicts | Different packs with incompatible contractVersions | Define conflict resolution strategy in M9.3+; warn not fail |

## 16. Open Questions

The following questions remain open for future milestones:

1. Should contractVersion use semantic versioning (semver) or date-based versioning?
2. Is a separate `contractName` field necessary, or is contractVersion sufficient?
3. Should individual packs be allowed to override the global contractVersion?
4. Must every resolver read and validate contractVersion, or only specific resolver types?
5. What is the earliest milestone eligible for hard gate promotion (M10.0, M11.0, or later)?
6. How should deprecated contractVersions be communicated to downstream consumers?
7. Should contractVersion support multiple concurrent versions (e.g., `["2.0", "1.5"]`)?

## 17. Checkpoint

M9.0 is a design readiness milestone. After M9.0 completes:

- No runtime code has changed.
- No CLI behavior has changed.
- No validation gates have been implemented.
- No JSON schema files have been added.
- The design baseline for contractVersion is established.

Future milestones (M9.1+) will build on this design to progressively implement soft validation and eventually evaluate hard gate readiness.
