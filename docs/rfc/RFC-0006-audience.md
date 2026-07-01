# RFC-0006 — Audience Engine Specification

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

This RFC defines the Audience Engine — a platform capability that adapts presentation output based on audience metadata.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why Audience Awareness?

Currently, the Presentation OS generates the same presentation regardless of who will view it. A digital pathology proposal for a hospital director should differ from the same proposal for an IT administrator.

An Audience Engine enables:
- Different emphasis for different roles (clinical vs. technical vs. financial)
- Different terminology levels (expert vs. layperson)
- Different content depth (overview vs. detailed)
- Different visual priorities (data-heavy vs. narrative-heavy)

### Why Not Hardcode Audience Logic in Packs?

Hardcoding audience logic in Packs violates the separation of concerns:
- Packs carry industry knowledge, not audience knowledge.
- Audience adaptation is a cross-cutting concern.
- The Engine decides HOW to adapt. Packs decide WHAT to adapt.

---

## 4. Goals

1. **Audience Classification** — Define standard audience roles.

2. **Adaptive Emphasis** — Adjust content emphasis based on audience.

3. **Terminology Level** — Adjust technical depth based on audience expertise.

4. **Visual Prioritization** — Adjust visual hierarchy based on audience priorities.

5. **Zero Breaking Changes** — Default behavior is unchanged.

---

## 5. Non-Goals

This RFC does NOT define:

- **Audience detection** — How audience is determined is out of scope.
- **Personalization** — Per-individual adaptation is out of scope.
- **Real-time adaptation** — Live presentation adjustment is out of scope.
- **Audience analytics** — Tracking who viewed what is out of scope.
- **Multi-language support** — Translation is out of scope.

---

## 6. Audience Roles

The Audience Engine defines standard audience roles.

| Role | Code | Description |
|---|---|---|
| Hospital Director | `hospital-director` | Administrative, strategic, financial focus |
| Department Head | `department-head` | Operational, clinical, team focus |
| Pathologist | `pathologist` | Technical, clinical, diagnostic focus |
| IT Administrator | `it-admin` | Infrastructure, integration, security focus |
| Researcher | `researcher` | Methodology, evidence, data focus |
| Investor | `investor` | Financial, market, ROI focus |
| Government Official | `government` | Compliance, regulation, policy focus |
| Vendor | `vendor` | Technical specifications, integration focus |
| General Public | `public` | Accessible, simplified, narrative focus |

---

## 7. Audience Engine Architecture

```
Audience Engine
├── Role Classifier
├── Emphasis Mapper
├── Terminology Resolver
├── Visual Priority Engine
└── Output Composer
```

### Role Classifier

Maps audience metadata from the story to a standard role code.

### Emphasis Mapper

Determines which content blocks should be emphasized, de-emphasized, or hidden for each role.

### Terminology Resolver

Adjusts technical depth based on audience expertise level.

### Visual Priority Engine

Rearranges visual hierarchy based on audience priorities.

### Output Composer

Combines all adaptations into a final Render Plan.

---

## 8. Integration Points

### 8.1 Story Layer

Stories can include audience metadata:

```json
{
  "name": "digital-pathology-proposal",
  "audience": ["hospital-director", "it-admin"],
  "defaultAudience": "hospital-director"
}
```

### 8.2 Content Engine

Content planners can declare audience sensitivity:

```javascript
{
  slideType: "value-pillars",
  audiences: ["hospital-director", "investor"],
  emphasis: "financial"
}
```

### 8.3 Layout Engine

Layout planners can declare audience-specific layouts:

```javascript
{
  slideType: "executive-summary",
  audiences: ["hospital-director"],
  layout: "high-level-overview"
}
```

### 8.4 Renderer Engine

The Renderer receives audience-adapted Render Plans from the Compiler (RFC-0005).

---

## 9. Activation Model

The Audience Engine is opt-in:

```bash
# Default — no audience adaptation
aos factory ppt --story medical-proposal

# With audience
aos factory ppt --story medical-proposal --audience hospital-director
aos factory ppt --story medical-proposal --audience pathologist
```

**Default behavior remains unchanged.** No audience flag = no adaptation.

---

## 10. Extension Rules

### 10.1 Adding a New Audience Role

1. Define the role in the Role Classifier.
2. No RFC required (additive change).

### 10.2 Modifying Audience Adaptation Logic

1. Define the adaptation rules.
2. Test with all existing roles.
3. No RFC required (Pack-level change).

### 10.3 Adding New Integration Points

1. Define the integration interface.
2. Require RFC-0006 amendment if it changes Core behavior.

---

## 11. Future RFCs

| RFC | Topic | Relationship |
|---|---|---|
| RFC-0001 | Platform Specification | Defines the platform this Engine serves |
| RFC-0002 | SDK Specification | Defines the SDK interface this Engine uses |
| RFC-0005 | Presentation Compiler | Audience Engine output feeds into the Compiler |

---

## 12. Implementation Status

**Not for Immediate Implementation**

RFC-0006 defines the Audience Engine — an opt-in capability for adapting presentation output based on audience metadata. The 9 standard audience roles (hospital-director, department-head, pathologist, it-admin, researcher, investor, government, vendor, public) are illustrative and should be refined based on actual use cases. Implementation should follow after the Compiler (RFC-0005) is stable, as the Audience Engine's Output Composer feeds into the Compiler's Render Plan. The activation model (`--audience` flag) ensures zero breaking changes to default behavior.

---

## Appendix A: Audience Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-01 | Initial Audience Engine specification. 9 standard roles, architecture, integration points, activation model. |

---

*This RFC defines the Audience Engine specification. It will be updated as the platform evolves. Last reviewed: 2026-07-01.*
