# RFC-0003 — Presentation Pack Specification

> **Status**: Draft  
> **Authors**: Presentation OS Architecture Board  
> **Date**: 2026-07-01  
> **Version**: 1.0.0  
> **Track**: Platform  
> **Supersedes**: None  
> **Depends On**: RFC-0001, RFC-0002

---

## 1. Status

**Draft**

This RFC defines the Presentation Pack specification — how industry-specific extensions are structured, validated, and integrated into the Presentation OS platform.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why Formalize Packs?

The Platform Strategy (RFC-0001) established that industry knowledge lives in Presentation Packs, separate from the domain-agnostic Core. But without a formal specification:

- Pack structure is undefined
- Pack validation is ad hoc
- Pack compatibility with Core is unclear
- Third-party packs cannot be reliably developed

A formal Pack specification enables:
- Consistent Pack structure across all packs
- Automated Pack validation
- Clear compatibility guarantees
- Third-party pack development

### Why Not Bundle Industry Knowledge into the Core?

Putting industry knowledge into the Core violates the domain-agnostic principle. It creates:
- Tight coupling between industry and platform
- Frequent Core releases for industry changes
- Inability to add new industries without Core changes
- Bloated Core with unused industry code

---

## 4. Goals

1. **Standard Structure** — Every Pack follows a consistent directory structure.

2. **Clear Contract** — Packs declare their dependencies on Core capabilities.

3. **Independent Lifecycle** — Packs can be developed, tested, and updated without Core changes.

4. **Validation** — Packs are validated before integration.

5. **Composability** — Multiple Packs can be combined in a single Application.

---

## 5. Non-Goals

This RFC does NOT define:

- **Pack binary format** — Covered in RFC-0004 (Marketplace).
- **Pack signing or cryptography** — Out of scope.
- **Pack billing or pricing** — Out of scope.
- **Pack review process** — Covered in RFC-0004.
- **Pack versioning strategy** — Defined by the Pack author (semver).
- **Pack distribution mechanism** — Covered in RFC-0004.

---

## 6. Pack Types

Presentation Packs are categorized by the Core capability they extend.

### 6.1 Story Template Pack

Provides pre-defined slide sequences for common presentation types.

```
my-story-pack/
├── pack.json                    # Pack manifest
├── templates/
│   ├── investor-pitch.json      # Story template
│   ├── quarterly-report.json    # Story template
│   └── product-launch.json      # Story template
└── README.md
```

**Contents**:
- `pack.json`: Pack manifest (see Section 7).
- `templates/*.json`: Story template files conforming to the Story schema.
- `README.md`: Usage instructions.

### 6.2 Content Planner Pack

Provides industry-specific content organization rules.

```
my-content-pack/
├── pack.json
├── planners/
│   ├── value-pillars.js         # Content planner
│   ├── comparison-matrix.js     # Content planner
│   └── capability-map.js        # Content planner
└── README.md
```

**Contents**:
- `planners/*.js`: Content planner functions implementing `ContentComposer.compose()`.
- Each planner returns `ContentBlock[]` conforming to the Core schema.

### 6.3 Hero Pattern Pack

Provides industry-specific hero statement patterns.

```
my-hero-pack/
├── pack.json
├── patterns/
│   ├── problem-solution.js      # Hero pattern
│   ├── data-driven.js           # Hero pattern
│   └── vision-roadmap.js        # Hero pattern
└── README.md
```

**Contents**:
- `patterns/*.js`: Hero pattern functions implementing `HeroComposer.compose()`.
- Each pattern returns a `HeroStatement` conforming to the Core schema.

### 6.4 Layout Pattern Pack

Provides industry-specific layout patterns.

```
my-layout-pack/
├── pack.json
├── patterns/
│   ├── quadrant-grid.js         # Layout pattern
│   ├── pipeline-flow.js         # Layout pattern
│   └── radial-hub.js            # Layout pattern
└── README.md
```

**Contents**:
- `patterns/*.js`: Layout pattern functions implementing `LayoutComposer.compute()`.
- Each pattern returns a `LayoutPlan` conforming to the Core schema.

### 6.5 Theme Variant Pack

Provides industry-specific visual style configurations.

```
my-theme-pack/
├── pack.json
├── themes/
│   ├── medical-professional.js  # Theme variant
│   ├── tech-modern.js           # Theme variant
│   └── government-formal.js     # Theme variant
└── README.md
```

**Contents**:
- `themes/*.js`: Theme variant definitions providing color palettes, typography, spacing, and radius.
- Each theme extends the Core's base theme with industry-specific overrides.

### 6.6 Chart Pack

Provides industry-specific chart types and visualizations.

```
my-chart-pack/
├── pack.json
├── charts/
│   ├── iso-maturity-model.js    # Chart type
│   ├── adoption-curve.js        # Chart type
│   └── benchmark-bar.js         # Chart type
└── README.md
```

**Contents**:
- `charts/*.js`: Chart definition functions.
- Each chart defines data structure, visual encoding, and animation.

### 6.7 Icon Pack

Provides industry-specific icon sets.

```
my-icon-pack/
├── pack.json
├── icons/
│   ├── medical.svg              # Icon
│   ├── ai.svg                   # Icon
│   └── hospital.svg             # Icon
└── manifest.json                # Icon metadata
```

**Contents**:
- Icon files (SVG preferred).
- `manifest.json`: Icon name, category, usage guidelines.

### 6.8 Validation Rule Pack

Provides industry-specific content quality rules.

```
my-validation-pack/
├── pack.json
├── rules/
│   ├── no-unsubstantiated-claims.js
│   ├── requires-evidence.js
│   └── compliance-check.js
└── README.md
```

**Contents**:
- `rules/*.js`: Validation rule functions.
- Each rule returns `ValidationResult` indicating pass/fail with explanation.

### 6.9 Example Deck Pack

Provides real-world example presentations for reference.

```
my-examples-pack/
├── pack.json
├── examples/
│   ├── investor-pitch-complete.pptx
│   ├── quarterly-report-complete.pptx
│   └── product-launch-complete.pptx
└── README.md
```

**Contents**:
- Complete PPTX files as reference examples.
- Each example demonstrates best practices for the domain.

---

## 7. Pack Manifest

Every Pack must include a `pack.json` manifest.

```json
{
  "name": "digital-pathology-pack",
  "version": "1.0.0",
  "displayName": "Digital Pathology Pack",
  "description": "Presentation templates and assets for digital pathology proposals",
  "author": "AWE Medical Team",
  "license": "MIT",
  "minCoreVersion": "1.0.0",
  "maxCoreVersion": "1.99.99",
  "type": "story",
  "assets": [
    {
      "name": "investor-pitch",
      "type": "story-template",
      "entryPoint": "templates/investor-pitch.json",
      "metadata": {
        "slides": 15,
        "audience": "investors"
      }
    }
  ],
  "dependencies": [],
  "tags": ["medical", "pathology", "digital"],
  "keywords": ["digital pathology", "hospital", "proposal"]
}
```

### Manifest Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | Yes | string | Unique pack identifier (kebab-case) |
| `version` | Yes | string | Semver version |
| `displayName` | Yes | string | Human-readable display name |
| `description` | Yes | string | Pack description |
| `author` | Yes | string | Author name |
| `license` | Yes | string | SPDX license identifier |
| `minCoreVersion` | Yes | string | Minimum compatible Core version |
| `maxCoreVersion` | Yes | string | Maximum compatible Core version |
| `type` | Yes | string | Primary pack type (see Section 6) |
| `assets` | Yes | array | List of pack assets |
| `dependencies` | No | array | Other pack names this pack depends on |
| `tags` | No | array | Search tags |
| `keywords` | No | array | Search keywords |

### Asset Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | Yes | string | Asset identifier |
| `type` | Yes | string | Asset type (see Section 6) |
| `entryPoint` | Yes | string | Path to asset file |
| `metadata` | No | object | Asset-specific metadata |

---

## 8. Pack Directory Structure

### 8.1 Minimal Pack

```
my-pack/
├── pack.json
└── README.md
```

### 8.2 Full Pack

```
my-pack/
├── pack.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── templates/          # Story templates
├── planners/           # Content planners
├── patterns/           # Hero + layout patterns
├── themes/             # Theme variants
├── charts/             # Chart definitions
├── icons/              # Icon files
├── rules/              # Validation rules
├── examples/           # Example decks
└── tests/              # Pack tests
```

### 8.3 Pack Naming

- Pack directory names: kebab-case (`digital-pathology-pack`)
- Asset names: kebab-case (`investor-pitch`)
- File names: kebab-case (`value-pillars.js`)

---

## 9. Pack Lifecycle

### 9.1 Development

```
Developer writes Pack code
  ↓
Developer runs `aos pack validate my-pack`
  ↓
Validation passes?
  ├─ Yes → Developer runs `aos pack test my-pack`
  │         ↓
  │       Tests pass?
  │         ├─ Yes → Developer ships Pack
  │         └─ No → Developer fixes and retries
  └─ No → Developer fixes validation errors
```

### 9.2 Integration

1. Pack is validated against the Core SDK contract.
2. Pack is tested with the Core in an isolated environment.
3. Pack compatibility matrix is verified.
4. Pack is registered with the platform.

### 9.3 Distribution

1. Pack is published to a registry (local or marketplace).
2. Applications declare their Pack dependencies.
3. The platform loads Packs at runtime.

### 9.4 Maintenance

1. Pack author releases updates.
2. Updates are validated against the current Core SDK.
3. Updated Packs are redistributed.

---

## 10. Pack Validation

### 10.1 Static Validation

Checks performed without running the Core:

- `pack.json` is valid JSON with all required fields.
- Asset entry points exist and are accessible.
- Asset files conform to their type schema.
- No circular dependencies between Packs.
- Version constraints are satisfiable.

### 10.2 Dynamic Validation

Checks performed by running the Core:

- Pack loads without errors.
- Pack assets produce valid output.
- Pack respects sandbox boundaries.
- Pack does not crash the Core.
- Pack output matches expected schema.

### 10.3 Compatibility Validation

Checks performed against Core version:

- Pack's `minCoreVersion` ≤ installed Core version.
- Pack's `maxCoreVersion` ≥ installed Core version.
- Pack uses only SDK APIs that exist in the installed Core version.

---

## 11. Pack Composition

Multiple Packs can be combined in a single Application.

### 11.1 Composition Rules

- Packs must not conflict on asset names.
- Packs must be compatible with the same Core version.
- Packs may declare dependencies on other Packs.
- Circular Pack dependencies are not allowed.

### 11.2 Composition Example

```
Hospital Proposal Studio (Application)
├── digital-pathology-pack (Story + Content + Layout)
├── medical-device-pack (Theme + Charts)
├── government-formal-pack (Validation + Icons)
└── core (Domain-agnostic engines)
```

---

## 12. Pack Security

### 12.1 Sandboxing

Packs run in a sandbox with the following restrictions:

- No direct filesystem access outside Pack directory.
- No network access.
- No child process execution.
- No access to `eval()`, `Function()`, or `setTimeout(string)`.
- Memory limit: 256 MB per Pack.
- Execution timeout: 5 seconds per slide.

### 12.2 Audit

All Pack operations are logged:
- Pack load/unload.
- Asset access.
- Errors and exceptions.
- Sandbox violations.

---

## 13. Pack Versioning

### 13.1 Semver

Packs follow semantic versioning:

- **Major** — Breaking changes to Pack assets. Existing Applications may need updates.
- **Minor** — New assets added. Existing Applications continue to work.
- **Patch** — Bug fixes only. Zero breaking changes.

### 13.2 Core Compatibility

Packs declare their compatible Core version range:

```json
{
  "minCoreVersion": "1.0.0",
  "maxCoreVersion": "1.99.99"
}
```

The Core enforces this at load time. Incompatible Packs are rejected with a clear error message.

---

## 14. Extension Rules

### 14.1 Adding a New Pack Asset Type

1. Define the asset type in `PackAsset.type`.
2. Implement validation in the SDK.
3. Update CLI scaffolding.
4. No RFC required (additive change).

### 14.2 Modifying Pack Manifest Schema

1. Define the new schema.
2. Implement migration for existing manifests.
3. Require RFC-0003 amendment.

### 14.3 Removing a Pack Asset Type

1. Deprecate the asset type (2 major version grace).
2. Migrate existing Packs.
3. Remove the asset type.
4. Require RFC-0003 amendment + Architecture Board approval.

---

## 15. Future RFCs

| RFC | Topic | Relationship |
|---|---|---|
| RFC-0001 | Platform Specification | Defines the platform model this Pack spec serves |
| RFC-0002 | SDK Specification | Defines the SDK interface Packs use |
| RFC-0004 | Marketplace Specification | Defines Pack distribution and publishing |
| RFC-0005 | Presentation Compiler Specification | Defines Compiler-Pack interaction |

---

## 16. Implementation Status

**Specification Ready**

RFC-0003 defines the Presentation Pack specification. The 9 asset types (story, content, hero, layout, theme, chart, icon, validation, template) map to the SDK interfaces in RFC-0002. The Pack manifest schema, directory structure, and validation rules are consistent with RFC-0001's domain-agnostic principle. Implementation should precede RFC-0004 (Marketplace) as the registry format references `pack.json`.

---

## Appendix A: Pack Type Registry

| Type | Description | Core Interface |
|---|---|---|
| `story` | Story templates | StoryReader |
| `content` | Content planners | ContentComposer |
| `hero` | Hero patterns | HeroComposer |
| `layout` | Layout patterns | LayoutComposer |
| `theme` | Theme variants | ThemeApplier |
| `chart` | Chart definitions | RendererClient |
| `icon` | Icon sets | RendererClient |
| `validation` | Validation rules | SchemaValidator |
| `template` | Combined templates | All interfaces |

## Appendix B: Pack Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-01 | Initial Pack specification. 9 asset types, manifest schema, lifecycle, validation, composition, security. |

---

*This RFC defines the Presentation Pack specification. It will be updated as the platform evolves. Last reviewed: 2026-07-01.*
