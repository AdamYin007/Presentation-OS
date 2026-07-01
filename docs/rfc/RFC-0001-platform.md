# RFC-0001 — Presentation OS Platform Specification

> **Status**: Draft  
> **Authors**: Presentation OS Architecture Board  
> **Date**: 2026-06-30  
> **Version**: 1.0.0  
> **Track**: Platform

---

## 1. Status

**Draft**

This RFC proposes the foundational platform specification for Presentation OS. It is not a design document, not a vision statement, not a roadmap. It is the binding specification that governs all future Core development.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why a Platform?

Presentation OS began as a tool for generating medical and technology presentations. That scope was too narrow. The underlying problem — transforming structured ideas into high-quality presentations — exists across every industry: finance, education, consulting, government, healthcare, research, sales.

A PPT Generator solves one use case. A Platform solves the problem of presentation production universally.

### Why Not Continue as a PPT Generator?

A PPT Generator:
- Hardcodes industry knowledge into rendering logic
- Grows monolithic and unmaintainable
- Cannot accept third-party extensions
- Ties architecture to a single domain
- Makes every new industry a code change

A Platform:
- Keeps the Core domain-agnostic
- Allows industry knowledge to live in extensions
- Accepts third-party contributions
- Evolves independently of any single industry
- Makes every new industry a configuration, not a code change

### Why a Future Ecosystem?

When the Core is stable and domain-agnostic, anyone can build on top of it:
- Consulting firms create branded presentation packs
- Hospitals develop internal domain packs
- Developers publish specialty packs
- Enterprises build custom applications

The platform becomes a marketplace of expertise, not a single-product monopoly.

### Platform vs Product

Presentation OS is a **platform**, not a **product**.

Applications are built **on** the platform. The platform itself is not an application.

---

## 4. Goals

1. **Core Stability** — The Core must remain stable across versions. Breaking changes require RFC + Architecture Board approval.

2. **Domain Agnosticism** — The Core contains zero industry knowledge. No medical, financial, legal, or educational concepts exist in the Core.

3. **Long-Term Evolution** — The Core can evolve independently of any specific industry or application.

4. **Free Extension** — Presentation Packs can be added, removed, or replaced without modifying the Core.

5. **Marketplace Independence** — The marketplace layer does not affect Core behavior. It is a distribution concern, not a platform concern.

---

## 5. Non-Goals

This RFC explicitly does NOT define:

- **Specific code** — Implementation details are deferred.
- **Compiler implementation** — The Presentation Compiler is defined in a future RFC.
- **SDK API** — The SDK interface for pack developers is defined in a future RFC.
- **Marketplace API** — Distribution and packaging APIs are defined in a future RFC.
- **Package format** — The binary format for Presentation Packs is defined in a future RFC.
- **UI/UX** — User interfaces for applications are out of scope.
- **Authentication/Authorization** — Identity management is out of scope.
- **Cloud infrastructure** — Deployment and hosting are out of scope.

These topics will be covered in subsequent RFCs.

---

## 6. Platform Layers

```
Presentation OS
├── Core
├── SDK
├── Presentation Packs
├── Applications
└── Marketplace
```

### Core

The domain-agnostic engine layer. Provides presentation computing primitives only. Zero industry knowledge.

### SDK

The developer interface for building Presentation Packs. Defines how packs interact with the Core.

### Presentation Packs

Industry-specific extensions. Contain story templates, hero patterns, content planners, theme variants, charts, icons, terminology, validation rules, best practices, and example decks.

### Applications

End-user software built on top of the Core and one or more Presentation Packs. Examples: PPT Factory, Hospital Proposal Studio, Investor Deck Builder.

### Marketplace

Distribution layer. Discovers, installs, and updates Presentation Packs. Does not affect Core behavior.

---

## 7. Core Responsibilities

The Core consists of the following engines. Each has exactly one responsibility.

### Story Engine

Defines the narrative structure of a presentation. Answers:
- What is this presentation about?
- Who is the audience?
- What is the slide sequence?
- What is the message of each slide?

**Must not** contain any industry terminology, domain logic, or business rules.

### Content Engine

Organizes slide content into structured data. Converts raw story information into:
- Cards
- Takeaways
- Workflow steps
- Value pillars
- Comparison rows
- Network nodes
- Recommendation actions

**Must not** decide layout, theme, or rendering. Decides only what content exists.

### Hero Engine

Defines the most important idea on each slide. Answers:
- What should the audience see first?
- What is the one key message?
- What decision should this slide support?

Guiding rule: One slide, one hero.

**Must not** contain industry-specific hero patterns. Those belong in Presentation Packs.

### Layout Engine

Plans spatial structure. Decides:
- Flow pattern
- Content density
- Zones
- Visual hierarchy
- Constraints
- Card count
- Visual arrangement

**Must not** own business content. Decides only where content should go.

### Theme Engine

Provides design tokens. Owns:
- Colors
- Fonts
- Spacing
- Radius
- Borders
- Footer style
- Professional visual language

**Must not** contain industry-specific themes. Theme variants belong in Presentation Packs.

### Renderer Engine

Coordinates actual rendering. Must:
- Try layout adapters first
- Fall back to legacy renderers when needed
- Maintain compatibility
- Gradually reduce the role of monolithic scripts

**Must not** contain rendering logic for specific slide types.

### Future Compiler

Will provide:
- Constraint solving
- Overflow detection
- Auto pagination
- Conflict resolution
- Theme resolution
- Rendering optimization

**Must not** contain industry-specific optimization rules.

### Core Principle

**The Core never owns business knowledge.** Any engine that acquires industry-specific logic must be refactored to move that logic into a Presentation Pack.

---

## 8. Presentation Packs

A **Presentation Pack** is a platform extension that carries industry knowledge on top of the domain-agnostic Core.

### Pack Contents

A Presentation Pack may contain any of the following:

| Asset | Description |
|---|---|
| Story Templates | Pre-defined slide sequences for common presentation types |
| Hero Patterns | Industry-specific hero statement patterns |
| Content Planners | Domain-aware content organization rules |
| Theme Variants | Industry-specific color, font, and style configurations |
| Charts | Domain-specific chart types and visualizations |
| Layouts | Industry-tuned layout templates |
| Validation | Business rule validation for content quality |
| Examples | Real-world example decks for reference |
| Documentation | Domain-specific usage guides |
| Icons | Industry-specific icon sets |
| Best Practices | Curated guidelines for effective presentations |

### Pack Examples

| Pack | Industry |
|---|---|
| Medical Pack | Healthcare, medical devices, clinical research |
| Consulting Pack | Strategy consulting, advisory services |
| Finance Pack | Investment, banking, financial analysis |
| Education Pack | Academic teaching, training materials |
| Research Pack | Scientific research, academic communication |
| Investor Pack | Venture capital, fundraising, pitch decks |
| Government Pack | Public sector, policy, regulatory |

### Pack Lifecycle

1. **Development** — Pack is created independently of Core.
2. **Testing** — Pack is tested against the Core API contract.
3. **Integration** — Pack is registered with the platform.
4. **Distribution** — Pack is published to the Marketplace (optional).
5. **Maintenance** — Pack is updated independently of Core.

### Pack Isolation

- Packs must not modify Core code.
- Packs must not depend on Core internals (only public APIs).
- A broken pack must not crash the Core.
- Removing a pack must not break the Core.

---

## 9. Applications

An **Application** is the final software delivered to end users. It combines the Core, one or more Presentation Packs, and a user-facing interface.

### Application Examples

| Application | Purpose |
|---|---|
| PPT Factory | CLI-based presentation generation |
| Hospital Proposal Studio | Medical facility proposal presentations |
| Investor Deck Builder | Fundraising and investor presentations |
| Board Presentation Studio | Executive board-level presentations |
| Consulting Deck Creator | Client-facing consulting presentations |

### Application Dependencies

Applications depend on:
- **Core** — Always required. Domain-agnostic engine layer.
- **Presentation Packs** — Required. Industry-specific assets.
- **Theme Packs** — Optional. Visual style configurations.

### Application vs Platform

An Application is NOT the platform. An Application is built ON the platform.

The platform exists independently of any single application. Multiple applications can share the same Core and the same Packs.

---

## 10. Design Principles

### Platform over Product

The Core is a platform. Applications and Packs are products built on the platform. Never confuse the two.

### Core over Pack

Core changes require RFC approval. Pack changes do not. Core is stable; Packs are flexible.

### Composition over Duplication

Slide types are composed from reusable content, layout, theme, and rendering modules. Never duplicate rendering logic across packs or applications.

### Compatibility before Innovation

Default output must remain stable while new engines and packs are introduced. New capabilities are opt-in.

### Data before Logic

Business content moves toward structured data, not hardcoded renderer logic. Data-driven behavior is more maintainable than conditional logic.

### Registry over Switch

Routing is achieved through registration and lookup, not conditional branches. Adding a new pack or engine requires registration, not code modification.

### One Responsibility per Engine

Each engine has exactly one responsibility. If an engine does two things, it must be split.

---

## 11. Extension Rules

When adding new functionality, determine where it belongs:

### Decision Tree

```
Does this functionality serve ALL industries equally?
├── Yes → Evaluate for Core inclusion
│         └── Requires RFC + Architecture Board approval
├── No → Does it extend the developer interface?
│         └── Yes → SDK layer
│         └── No → Does it carry industry knowledge?
│                   └── Yes → Presentation Pack
│                   └── No → Application layer
```

### Rules

1. **Only true platform capabilities enter the Core.** If a feature serves a specific industry, it belongs in a Presentation Pack.

2. **Pack development must not require Core changes.** If adding a pack requires modifying the Core, the Core API is incomplete.

3. **Application development must not require Core changes.** Applications compose existing Core + Packs.

4. **SDK changes require RFC.** The SDK is part of the platform contract.

---

## 12. Governance

### Core Modification Process

Any modification to the Core must follow this process:

1. **RFC** — Submit an RFC describing the change, motivation, and impact.
2. **Architecture Review** — The Architecture Board reviews the RFC.
3. **Approval** — The Architecture Board approves or rejects the RFC.
4. **Implementation** — Approved changes are implemented.
5. **Review** — Peer review of the implementation.
6. **Merge** — Changes are merged into the Core.

### Rules

- **No Core modification may skip the RFC process.**
- **No emergency Core changes.** Even urgent fixes must follow the RFC process (fast-tracked).
- **All RFCs are public.** Transparency is required.
- **The Architecture Board consists of the lead architects.** Membership is defined in a future governance RFC.

### Pack Governance

Pack modifications do NOT require RFC approval. Packs are developed and maintained by their authors.

---

## 13. Future RFCs

| RFC | Topic | Status |
|---|---|---|
| RFC-0002 | SDK Specification | Planned |
| RFC-0003 | Presentation Pack Specification | Planned |
| RFC-0004 | Marketplace Specification | Planned |
| RFC-0005 | Presentation Compiler Specification | Planned |
| RFC-0006 | Audience Engine Specification | Planned |

---

## 14. Implementation Status

**Specification Ready**

RFC-0001 establishes the binding platform specification. The Core architecture described here matches the current codebase (seven layers, domain-agnostic, adapter-first). No SDK code should be implemented until RFC-0002 is finalized.

---

## Appendix A: Terminology

| Term | Definition |
|---|---|
| **Core** | Domain-agnostic engine layer. Zero industry knowledge. |
| **Presentation Pack** | Industry-specific extension carrying domain knowledge. |
| **Application** | End-user software built on Core + Packs. |
| **SDK** | Developer interface for building Packs. |
| **Marketplace** | Distribution layer for Packs. |
| **Engine** | A single-responsibility processing unit within the Core. |

## Appendix B: Document Relationships

| Document | Purpose |
|---|---|
| **VISION.md** | Long-term product and architecture vision |
| **ARCHITECTURE.md** | Current system architecture and layer details |
| **ROADMAP.md** | Development milestones and priorities |
| **RFC-0001** | Binding platform specification (this document) |
| **CONTRIBUTING.md** | Developer workflow and guidelines |

RFC-0001 is the highest normative document. Conflicts between RFC-0001 and other documents are resolved in favor of RFC-0001.

---

*This RFC is a living specification. It will be updated as the platform evolves. Last reviewed: 2026-06-30.*
