# M12.12 Multi-Domain Real-Document Pilot

## Overview

Validate the CLI + pipeline against real-world documents from at least 3 different domains (business, education, technical) with varying complexity levels.

## Architecture

The M12.12 pilot extends the existing markdown-to-PPTX pipeline by:
1. Adding 3 domain-specific real-world markdown fixtures
2. Running each through the `make-pptx.js` CLI with appropriate theme styles
3. Validating slide count, topic extraction, purpose detection, role diversity, and PPTX generation
4. Producing a structured validation report

## CLI Contract

```bash
node scripts/make-pptx.js <input.md> <output.pptx> --style <theme>
node scripts/make-pptx.js <input.md> --dry-run --json --style <theme>
```

## Quality Gates

- **Minimum 3 domains**: business, education, technical
- **Complexity range**: medium to high (60-160 lines of markdown)
- **Slide count**: 8-16 slides per domain
- **Topic extraction**: must produce meaningful topic (>5 chars)
- **Purpose detection**: must identify review/teach/inform/etc.
- **Role diversity**: minimum 3 distinct slide roles
- **Section dividers**: minimum 2 per deck
- **Closing slide**: required
- **PPTX validity**: must be valid ZIP/PPTX format

## Files

| File | Description |
|------|-------------|
| `fixtures/m12-12/business-real/q2-business-review.md` | Quarterly business review (60 lines, medium complexity) |
| `fixtures/m12-12/education-real/intro-to-ml.md` | ML introduction for students (88 lines, high complexity) |
| `fixtures/m12-12/technical-real/kubernetes-architecture.md` | K8s cluster architecture (159 lines, high complexity) |
| `scripts/check-m12-12-multi-domain-pilot.cjs` | Validation script |
| `examples/m12-12-business.pptx` | Business domain output |
| `examples/m12-12-education.pptx` | Education domain output |
| `examples/m12-12-technical.pptx` | Technical domain output |

## Testing

Run the full validation:
```bash
npm run check:m12-12-multi-domain-pilot
```

This validates:
1. All 3 fixture files exist and are non-empty
2. Each runs through `make-pptx.js --dry-run --json` successfully
3. Slide count is within expected ranges
4. Topic and purpose extraction produces meaningful results
5. Role diversity meets minimum thresholds
6. Actual PPTX files are generated and are valid

## Next Steps

M12.13: Usability and Reliability Release — polish UX, improve error messages, add more theme options.
