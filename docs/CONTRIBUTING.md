# AWE Presentation OS — Contributing

## One PR = One Goal

Each pull request must have a single, clearly defined objective:

- ✅ `feat(adapter): add cover adapter` — one slide type
- ✅ `fix(planner): correct workflow zone calculation` — one bug fix
- ✅ `docs(architecture): update diagram` — one documentation change
- ❌ `feat: add cover adapter, fix planner, update docs` — too many goals

## Rules

### 1. Default Behavior Must Remain 100% Compatible

- `--layout-engine` flag controls all new behavior
- Without the flag, everything works exactly as before
- Legacy renderers in `run.js` are never removed, only superseded by adapters
- If an adapter doesn't handle a slide, it returns `false` and legacy takes over

### 2. Minimize run.js Growth

- New slide types should prefer adapters over adding new functions to `run.js`
- `run.js` is the legacy renderer — it grows organically but we actively reduce it
- Each adapter added should justify removing or deprecating a corresponding legacy function

### 3. No Breaking Changes to Public Interfaces

- `comp.card()`, `comp.timeline()`, `comp.makeTitle()`, `comp.makeFooter()` — signatures never change
- `dispatchAdapter(params)` — always receives `{slide, comp, pptx, story, layoutPlan}`
- `compileLayoutPlan(slide)` — always returns a validated Layout Plan object

## Development Workflow

### Before You Start

1. Read `docs/ARCHITECTURE.md` for system overview
2. Read `docs/ROADMAP.md` for current status and priorities
3. Check existing adapters in `src/layout-adapters/` for patterns

### Implementing a New Adapter

1. Add planner function to `src/layout-engine/planners/{type}.js`
2. Register in `src/layout-engine/planner.js` planners object
3. Create `src/layout-adapters/{type}.js`
4. Register in `src/layout-adapters/index.js` ADAPTERS object
5. Test both modes

### Testing

```bash
# Default mode — legacy renderer
awe-dev run factory ppt-factory --story <name> --out <output-dir>

# Layout Engine mode — adapter path
awe-dev run factory ppt-factory --story <name> --layout-engine --out <output-dir>

# Verify both produce valid PPTX
ls -lh <output-dir>/*.pptx
```

### Required Tests

- [ ] Default mode produces identical output (file size + content check)
- [ ] `--layout-engine` mode renders the slide correctly
- [ ] Other slide types still work (no regression)
- [ ] Layout plan validates (no schema errors)

## Commit Message Convention

```
type(scope): description

feat(adapter): add cover adapter
fix(planner): correct workflow zone calculation
docs(architecture): add system diagram
chore(deps): update pptxgenjs version
test(adapters): verify cover adapter output
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`

## Reporting

Use this template for PR descriptions:

```markdown
## Role
Implementation Engineer

## Task
Brief description of what this PR implements.

## Files Changed
| File | Change | Notes |
|---|---|---|
| path/to/file | added/modified | 1-line explanation |

## Tests
- [ ] Default mode works
- [ ] Layout Engine mode works
- [ ] No regression on other types

## Compatibility
Impact on default/legacy behavior.

## Risk
Known risks and mitigation.
```
