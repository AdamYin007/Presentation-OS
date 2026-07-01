# Presentation OS — RFC Index

> **Last Updated**: 2026-07-01  
> **Maintained By**: Presentation OS Architecture Board

## Specifications

| RFC | File | Topic | Status | Priority |
|---|---|---|---|---|
| RFC-0001 | [RFC-0001-platform.md](RFC-0001-platform.md) | Platform Specification | Specification Ready | Foundation |
| RFC-0002 | [RFC-0002-sdk.md](RFC-0002-sdk.md) | SDK Specification | Specification Ready | Foundation |
| RFC-0003 | [RFC-0003-pack.md](RFC-0003-pack.md) | Presentation Pack Specification | Specification Ready | Foundation |
| RFC-0004 | [RFC-0004-marketplace.md](RFC-0004-marketplace.md) | Marketplace Specification | Not for Immediate Implementation | Future |
| RFC-0005 | [RFC-0005-compiler.md](RFC-0005-compiler.md) | Presentation Compiler Specification | Not for Immediate Implementation | Future |
| RFC-0006 | [RFC-0006-audience.md](RFC-0006-audience.md) | Audience Engine Specification | Not for Immediate Implementation | Future |

## Implementation Order

1. **Foundation** (RFC-0001, RFC-0002, RFC-0003) — These three RFCs form the core platform contract and are ready for implementation reference.
2. **Infrastructure** (RFC-0004) — Marketplace should be implemented only when there is demand for third-party Pack distribution.
3. **Optimization** (RFC-0005) — Compiler should be implemented after Adapter Migration (M3) and Content Data Migration (M4) are complete.
4. **Intelligence** (RFC-0006) — Audience Engine should be implemented after the Compiler is stable.

## Governance

- **Core modifications** require an approved RFC before implementation. See [CONTRIBUTING.md](../CONTRIBUTING.md) Section 0.
- **Pack/Application modifications** do not require RFC approval.
- **SDK modifications** require RFC-0002 amendment.

## Document Relationships

```
RFC-0001 (Platform)
  ├── Depends on: None
  ├── References: ARCHITECTURE.md, ROADMAP.md
  └── Enables: RFC-0002, RFC-0003

RFC-0002 (SDK)
  ├── Depends on: RFC-0001
  ├── References: RFC-0003 (Pack types)
  └── Enables: Pack development

RFC-0003 (Pack)
  ├── Depends on: RFC-0001, RFC-0002
  ├── References: RFC-0004 (Marketplace format)
  └── Enables: RFC-0004, RFC-0005

RFC-0004 (Marketplace)
  ├── Depends on: RFC-0001, RFC-0002, RFC-0003
  └── Distributes: Presentation Packs

RFC-0005 (Compiler)
  ├── Depends on: RFC-0001, RFC-0002
  ├── Integrates with: RFC-0006 (Audience)
  └── Optimizes: Renderer Engine output

RFC-0006 (Audience)
  ├── Depends on: RFC-0001, RFC-0002
  └── Feeds into: RFC-0005 (Compiler Render Plan)
```
