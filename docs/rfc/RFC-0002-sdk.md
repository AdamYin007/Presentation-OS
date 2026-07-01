# RFC-0002 — SDK Specification

> **Status**: Draft  
> **Authors**: Presentation OS Architecture Board  
> **Date**: 2026-07-01  
> **Version**: 1.0.0  
> **Track**: Platform  
> **Supersedes**: None  
> **Depends On**: RFC-0001

---

## 1. Status

**Draft**

This RFC defines the Software Development Kit (SDK) for building Presentation Packs on top of the Presentation OS Core.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why an SDK?

The Core is domain-agnostic. Industry knowledge lives in Presentation Packs. But how do pack developers interact with the Core?

Without a formal SDK:
- Pack developers guess the Core's internal APIs
- Changes to Core internals break Packs unpredictably
- There is no documented contract between Core and Packs
- Third-party developers have no entry point

An SDK provides:
- A stable, documented interface between Core and Packs
- Type definitions and validation helpers
- A testing harness for Pack development
- A clear boundary: what the Core exposes vs. what Packs implement

### Why Not Expose Internal APIs?

Internal APIs change frequently. The SDK must change slowly. The separation allows the Core to evolve internally without breaking Pack compatibility.

---

## 4. Goals

1. **Stable Contract** — The SDK defines a stable interface between the Core and Packs.

2. **Developer Experience** — Pack developers can build, test, and publish Packs without reading Core source code.

3. **Type Safety** — TypeScript definitions prevent common mistakes.

4. **Validation** — Packs are validated against the SDK contract before integration.

5. **Extensibility** — The SDK grows without breaking existing Packs.

---

## 5. Non-Goals

This RFC does NOT define:

- **Compiler internals** — Covered in RFC-0005.
- **Marketplace packaging format** — Covered in RFC-0004.
- **Authentication or identity** — Out of scope.
- **Cloud deployment** — Out of scope.
- **UI/UX tooling** — Out of scope.
- **Performance benchmarks** — Out of scope.

---

## 6. SDK Layers

```
Presentation OS SDK
├── Core Bindings (stable)
├── Pack Interface (implement by packs)
├── Validation Helpers (test packs)
└── CLI Tools (develop & ship packs)
```

### Core Bindings

Read-only interfaces that the Core exposes to Packs. These are the only APIs Packs may use.

### Pack Interface

Interfaces that Pack authors implement. Each interface corresponds to a Core capability.

### Validation Helpers

Utilities for testing Packs against the SDK contract.

### CLI Tools

Command-line tools for Pack development, testing, and publishing.

---

## 7. Core Bindings

The Core exposes the following read-only bindings to Packs.

### 7.1 StoryReader

```typescript
interface StoryReader {
  /** Read a story by name */
  readStory(name: string): Story;
  /** List available stories */
  listStories(): string[];
}
```

**Purpose**: Allow Packs to read story data for validation and template generation.

**Constraints**:
- Read-only. Packs cannot modify stories.
- Stories are immutable once loaded.

### 7.2 ContentComposer

```typescript
interface ContentComposer {
  /** Compose content for a slide */
  compose(slide: Slide, context: Context): ContentBlock[];
  /** Validate content blocks */
  validate(blocks: ContentBlock[]): ValidationResult;
}
```

**Purpose**: Packs implement content composition logic. The Core provides the composition engine.

**Constraints**:
- `compose()` must return deterministic results for the same input.
- `compose()` must not depend on external state (network, filesystem, randomness).

### 7.3 HeroComposer

```typescript
interface HeroComposer {
  /** Compose hero statement for a slide */
  compose(slide: Slide, context: Context): HeroStatement;
}
```

**Purpose**: Packs define industry-specific hero patterns.

**Constraints**:
- Must return exactly one hero statement per slide.
- Must not modify the original slide.

### 7.4 LayoutComposer

```typescript
interface LayoutComposer {
  /** Compute layout plan for a slide */
  compute(slide: Slide, content: ContentBlock[], hero: HeroStatement): LayoutPlan;
  /** Validate layout plan */
  validate(plan: LayoutPlan): ValidationResult;
}
```

**Purpose**: Packs define industry-specific layout patterns.

**Constraints**:
- Must produce a valid Layout Plan conforming to the schema in RFC-0003.
- Must not hardcode pixel positions.

### 7.5 ThemeApplier

```typescript
interface ThemeApplier {
  /** Apply theme to a slide */
  apply(slide: Slide, plan: LayoutPlan, theme: ThemeConfig): ThemeResult;
  /** Resolve color token */
  resolveColor(token: string): string;
  /** Resolve typography token */
  resolveTypography(role: string): TypographyConfig;
}
```

**Purpose**: Packs define theme variants. The Core provides token resolution.

**Constraints**:
- Must not bypass token resolution. All colors must come from `resolveColor()`.
- Must not introduce hardcoded hex values.

### 7.6 RendererClient

```typescript
interface RendererClient {
  /** Render a slide using the adapter pipeline */
  render(params: RenderParams): RenderResult;
  /** Check if a slide type is supported */
  supports(type: string): boolean;
}
```

**Purpose**: Packs request rendering from the Core. The Core manages the adapter-first + legacy-fallback pipeline.

**Constraints**:
- Must not bypass the adapter pipeline.
- Must not directly invoke legacy renderers.

---

## 8. Pack Interface

Pack authors implement the following interfaces.

### 8.1 Pack Manifest

Every Pack must define a manifest:

```typescript
interface PackManifest {
  /** Pack name */
  name: string;
  /** Pack version (semver) */
  version: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Author */
  author: string;
  /** License */
  license: string;
  /** Minimum Core version required */
  minCoreVersion: string;
  /** Maximum Core version compatible */
  maxCoreVersion: string;
  /** Pack type */
  type: 'story' | 'content' | 'hero' | 'layout' | 'theme' | 'chart' | 'icon' | 'validation' | 'template';
  /** Assets */
  assets: PackAsset[];
  /** Dependencies */
  dependencies?: string[];
}
```

### 8.2 Pack Asset

```typescript
interface PackAsset {
  /** Asset name */
  name: string;
  /** Asset type */
  type: 'story-template' | 'hero-pattern' | 'content-planner' | 'theme-variant' | 'chart-type' | 'icon-set' | 'validation-rule' | 'example-deck';
  /** Entry point file */
  entryPoint: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}
```

### 8.3 Pack Implementation

```typescript
class MyPack implements Pack {
  manifest: PackManifest;
  
  async init(context: PackContext): Promise<void>;
  async composeContent(params: ContentParams): Promise<ContentBlock[]>;
  async composeHero(params: HeroParams): Promise<HeroStatement>;
  async computeLayout(params: LayoutParams): Promise<LayoutPlan>;
  async applyTheme(params: ThemeParams): Promise<ThemeResult>;
  async validate(params: ValidationParams): Promise<ValidationResult>;
  async destroy(): Promise<void>;
}
```

---

## 9. Validation Helpers

### 9.1 Schema Validator

Validates Pack assets against Core schemas.

```typescript
interface SchemaValidator {
  validateStoryTemplate(template: StoryTemplate): ValidationResult;
  validateHeroPattern(pattern: HeroPattern): ValidationResult;
  validateLayoutPlan(plan: LayoutPlan): ValidationResult;
  validateThemeVariant(variant: ThemeVariant): ValidationResult;
}
```

### 9.2 Integration Test Runner

Tests Packs against the Core in an isolated environment.

```typescript
interface IntegrationTestRunner {
  /** Run all tests for a Pack */
  runTests(pack: Pack): TestResults;
  /** Compare Pack output with expected output */
  assertOutput(actual: PPTXOutput, expected: PPTXOutput): void;
  /** Benchmark Pack performance */
  benchmark(pack: Pack, iterations: number): PerformanceMetrics;
}
```

---

## 10. CLI Tools

### 10.1 Pack Scaffolding

```bash
# Create a new Pack
aos pack init my-pack --type content

# Create a story template
aos pack template my-story --type story-template

# Create a hero pattern
aos pack hero my-hero --type hero-pattern
```

### 10.2 Pack Development

```bash
# Watch mode for development
aos pack dev my-pack --watch

# Validate a Pack
aos pack validate my-pack

# Test a Pack
aos pack test my-pack

# Build a Pack
aos pack build my-pack
```

### 10.3 Pack Publishing

```bash
# Publish to local registry
aos pack publish my-pack --local

# Publish to marketplace
aos pack publish my-pack --marketplace
```

---

## 11. Versioning Policy

### 11.1 Core SDK Versioning

The SDK follows semantic versioning:

- **Major version** — Breaking changes to Core bindings. Existing Packs may break.
- **Minor version** — New Core bindings added. Existing Packs continue to work.
- **Patch version** — Bug fixes only. Zero breaking changes.

### 11.2 Pack Compatibility Matrix

| Pack Min Core | Pack Max Core | Compatible Core Versions |
|---|---|---|
| 1.0.0 | 1.99.99 | 1.0.0 through 1.99.99 |
| 1.0.0 | 2.0.0 | 1.0.0 through 1.99.99 |

Packs must declare their minimum and maximum compatible Core versions. The SDK enforces this at load time.

### 11.3 Deprecation Policy

- Deprecated SDK features remain functional for at least 2 major versions.
- Deprecation warnings are logged but do not prevent Pack execution.
- Removal requires a new RFC.

---

## 12. Security Model

### 12.1 Sandboxing

Packs run in a sandboxed environment:

- No direct filesystem access (except Pack directory).
- No network access.
- No child process execution.
- No access to Node.js `eval()` or `Function()`.

### 12.2 Resource Limits

- Maximum execution time per slide: 5 seconds.
- Maximum memory per Pack: 256 MB.
- Maximum output size per slide: 10 MB.

### 12.3 Audit Trail

All Pack operations are logged:
- Pack load/unload events.
- Content composition requests.
- Rendering requests.
- Errors and exceptions.

---

## 13. Error Handling

### 13.1 Error Types

```typescript
type PackError =
  | ValidationError      // Invalid Pack asset
  | CompositionError     // Content composition failed
  | LayoutError          // Layout computation failed
  | ThemeError           // Theme application failed
  | RenderError          // Rendering failed
  | TimeoutError         // Execution exceeded time limit
  | MemoryError          // Memory limit exceeded
  | SandboxError         // Sandbox violation detected
```

### 13.2 Error Propagation

Errors from Packs are caught by the Core and converted to graceful fallbacks:
- Pack composition failure → fallback to generic content planner.
- Pack layout failure → fallback to generic layout planner.
- Pack theme failure → fallback to default theme.
- Pack render failure → fallback to legacy renderer.

**Packs must never crash the Core.**

---

## 14. Extension Rules

### 14.1 Adding a New Core Binding

1. Define the binding interface in the SDK.
2. Implement the binding in the Core.
3. Update Pack compatibility matrix.
4. Require RFC-0002 amendment.

### 14.2 Removing a Core Binding

1. Deprecate the binding (2 major version grace period).
2. Migrate existing Packs.
3. Remove the binding.
4. Require RFC-0002 amendment + Architecture Board approval.

### 14.3 Adding Pack Types

1. Define the Pack asset type in `PackAsset.type`.
2. Implement validation in `SchemaValidator`.
3. Update CLI scaffolding.
4. No RFC required (Pack types are additive, not breaking).

---

## 15. Future RFCs

| RFC | Topic | Relationship |
|---|---|---|
| RFC-0001 | Platform Specification | Defines the platform model this SDK serves |
| RFC-0003 | Presentation Pack Specification | Defines Pack format and lifecycle |
| RFC-0004 | Marketplace Specification | Defines how Packs are distributed |
| RFC-0005 | Presentation Compiler Specification | Defines how the Compiler integrates with the SDK |

---

## 16. Implementation Status

**Specification Ready**

RFC-0002 defines the SDK contract between the Core and Presentation Packs. The 6 Core Bindings (StoryReader, ContentComposer, HeroComposer, LayoutComposer, ThemeApplier, RendererClient) map directly to the seven-layer architecture in RFC-0001. The Pack Interface types align with RFC-0003's 9 asset types. Implementation should follow RFC-0003 stabilization.

---

## Appendix A: SDK Directory Structure

```
sdk/
├── core-bindings/       # Read-only interfaces exposed by Core
│   ├── story-reader.ts
│   ├── content-composer.ts
│   ├── hero-composer.ts
│   ├── layout-composer.ts
│   ├── theme-applier.ts
│   └── renderer-client.ts
├── pack-interface/      # Interfaces pack authors implement
│   ├── pack-manifest.ts
│   ├── pack-asset.ts
│   └── pack.ts
├── validation/          # Validation helpers
│   ├── schema-validator.ts
│   └── integration-test-runner.ts
└── cli/                 # Command-line tools
    ├── scaffold.ts
    ├── dev.ts
    ├── validate.ts
    ├── test.ts
    ├── build.ts
    └── publish.ts
```

## Appendix B: SDK Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-01 | Initial SDK specification. 6 Core bindings, Pack manifest, validation helpers, CLI tools. |

---

*This RFC defines the SDK contract between the Core and Presentation Packs. It will be updated as the platform evolves. Last reviewed: 2026-07-01.*
