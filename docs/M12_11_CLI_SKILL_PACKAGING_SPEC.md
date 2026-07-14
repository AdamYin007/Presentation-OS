# M12.11 CLI and Skill Packaging

## Overview

M12.11 delivers a thin, domain-agnostic CLI entrypoint for the existing
end-to-end markdown-to-pptx pipeline, and defines how this CLI surface
becomes a reusable Hermes skill without cloud or paid dependencies.

This is a product slice that makes the M12.1–M12.10 pipeline directly
usable from the terminal. It adds no new parser, planner, or renderer
logic — it composes the existing `runPipeline()` API with argument
validation, help text, and structured JSON output.

## Architecture

### CLI Entry Point

```
scripts/make-pptx.js
  ├── parseArgs(argv)      — simple positional + flag parser
  ├── main()               — orchestrates: validate → runPipeline → write
  │     ├── fs.existsSync(input)
  │     ├── fs.readFileSync(input)
  │     ├── runPipeline(markdown, { style })
  │     └── fs.writeFileSync(output, buffer)
  └── scripts/make-pptx-help.txt  — static help text
```

### Pipeline Contract (unchanged)

The CLI delegates entirely to `@awe/presentation-pipeline`:

```
runPipeline(markdownInput, { style }) → {
  sourceDocument,
  format,
  intent,
  deckPlan,
  slideSpecs[],
  layoutPlan,
  pptxBuffer (Buffer),
  slideCount (number)
}
```

No modifications to this contract. The CLI reads the return value and
writes the buffer to disk.

## CLI Contract

```
node scripts/make-pptx.js <input.md> <output.pptx> [options]

Options:
  --style <name>    Theme: minimal-modern | business-consulting | academic-clean
  --dry-run         Run pipeline, print summary, skip file write
  --json            Print structured JSON summary to stdout
  --help, -h        Show usage text
```

Exit codes:
- `0` — success
- `1` — any validation error, missing file, bad style, unknown option, pipeline failure

## Skill Packaging

### What Makes This a Reusable Skill

The CLI is packaged as a skill surface because it:

1. **Has a stable command signature** — positional args + named flags
2. **Is domain-agnostic** — works with any markdown input, any theme style
3. **Has zero cloud/paid dependencies** — only Node.js builtins + pptxgenjs (via pipeline)
4. **Provides structured output** — `--json` mode enables programmatic consumption
5. **Includes deterministic tests** — `tests/m12-11-cli-skill-packaging/m12-11.test.js`

### Hermes Skill Integration

A Hermes skill wrapping this CLI would:

1. Load the `make-pptx.js` script as the skill's entrypoint
2. Accept a user-provided markdown path and optional style flag
3. Run `node scripts/make-pptx.js <input> <output> --json`
4. Parse the JSON summary and present results to the user
5. Deliver the output PPTX file as an artifact

No skill code changes are needed in the pipeline packages. The CLI is the
integration boundary.

### Skill Metadata (for future SKILL.md)

```yaml
name: make-pptx
version: 1.0.0
description: Generate editable PowerPoint decks from markdown
entry: scripts/make-pptx.js
dependencies:
  - nodejs (18+)
  - pptxgenjs (via @awe/presentation-pipeline)
capabilities:
  - markdown-to-pptx
  - dry-run with JSON summary
  - three theme styles
constraints:
  - no cloud APIs
  - no paid services
  - deterministic output
```

## Quality Gates

- CLI must exit 1 on any validation error (missing file, empty input, bad style)
- CLI must exit 0 on successful pipeline run
- `--json` output must be valid parseable JSON with slideCount, topic, slideSpecs
- `--dry-run` must not write any files
- No cloud/paid API calls anywhere in the CLI or its pipeline chain
- All three theme styles (minimal-modern, business-consulting, academic-clean) must produce valid PPTX
- Output PPTX must start with PK signature (0x504b0304)

## Files

| File | Purpose |
|------|---------|
| `scripts/make-pptx.js` | CLI entrypoint |
| `scripts/make-pptx-help.txt` | Static help text |
| `scripts/check-m12-11-cli-skill-packaging.cjs` | Checker script |
| `tests/m12-11-cli-skill-packaging/m12-11.test.js` | Unit/integration tests |
| `fixtures/m12-11/sample-input.md` | Sample markdown fixture |
| `docs/M12_11_CLI_SKILL_PACKAGING_SPEC.md` | This spec document |
| `package.json` | Updated with check:m12-11 script |
| `docs/ROADMAP.md` | M12.11 marked complete |

## Testing

Run the checker:
```
node scripts/check-m12-11-cli-skill-packaging.cjs
```

Or via npm:
```
npm run check:m12-11-cli-skill-packaging
```

The checker validates:
1. All required files exist
2. CLI argument handling (no-args, --help, missing file, empty file, bad style, unknown option)
3. Pipeline integration (dry-run + json, full run, all three styles)
4. Spec document completeness
5. No cloud/paid dependencies
6. package.json integration

## Next Steps

M12.12: Multi-Domain Real-Document Pilot — validate the CLI + pipeline
against real-world documents from at least 3 different domains
(business, education, technical) with varying complexity levels.
