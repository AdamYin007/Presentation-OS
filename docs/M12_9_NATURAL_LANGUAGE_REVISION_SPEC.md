# M12.9 Natural-Language Revision

## Purpose

Enable users to revise generated presentations through natural language instructions. Revisions target protocol layers (DeckPlan → SlideSpec) before binary PPTX rerendering, preserving unchanged slides.

## Architecture

```
Natural Language Instruction
  ↓ parseRevisionInstruction()
Structured Operations []
  ↓ applyRevisions(deckPlan, slideSpecs, ops)
Updated DeckPlan + SlideSpec[]
  ↓ (downstream: PPTX rerender via pipeline)
Revised .pptx
```

## Supported Operations

| Operation | Description |
|-----------|-------------|
| `replace-slide-layout` | Change layout/role of a specific slide |
| `modify-title` | Rename a slide title |
| `modify-body` | Add/remove/rewrite body bullets |
| `delete-slide` | Remove a slide from deck |
| `add-slide` | Insert a new slide at position |
| `reorder-slides` | Move slide from index A to B |
| `change-theme` | Update theme/style metadata |
| `compress-count` | Reduce slide count |
| `expand-count` | Increase slide count |
| `add-notes` | Generate speaker notes |
| `change-audience` | Update audience in DeckPlan |

## Stability Rule

Unchanged slides must be preserved as-is. Only targeted modifications are applied; re-indexing updates IDs only.

## Files

- `packages/presentation-revision/src/index.js` — module entry point
- `packages/presentation-revision/src/schema.js` — schema definitions
- `packages/presentation-revision/src/reviser.js` — core revision engine
- `tests/presentation-revision/presentation-revision.test.js` — unit tests
- `docs/M12_9_NATURAL_LANGUAGE_REVISION_SPEC.md` — this file
