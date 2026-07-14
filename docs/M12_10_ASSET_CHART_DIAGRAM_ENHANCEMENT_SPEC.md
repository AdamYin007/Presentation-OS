# M12.10 Asset, Chart, and Diagram Enhancement

## Overview

Adds editable PPTX visual support for charts, diagrams, and asset-rich slides.
This is a thin, offline, no-paid-dependency product slice that extends the
existing M12.6–M12.9 pipeline with five visual types:

- **Bar chart** — vertical/horizontal bars with axis labels
- **Line chart** — multi-series line plots with gridlines
- **KPI metric card** — large-number cards with trend indicators
- **Process/timeline diagram** — step-by-step visual flow
- **Comparison/table-like visual** — structured comparison rows

All visuals are implemented as editable PPTX primitives (shapes, text, lines)
via PptxGenJS. No screenshot-only output.

## Architecture

### SlideSpec Extensions

The SlideSpec contract gains new `visualType` values and a richer `visualSpec`
shape:

```
visualType: "bar-chart" | "line-chart" | "metric-cards" | "process" | "timeline"

visualSpec (bar-chart):
  type: "bar" | "horizontal-bar"
  series: [{ name: string, values: [{ label: string, value: number }] }]
  colors?: string[]          // optional palette
  yAxisLabel?: string
  xAxisLabel?: string

visualSpec (line-chart):
  series: [{ name: string, points: [{ x: string, y: number }] }]
  colors?: string[]
  showGrid?: boolean         // default true
  yAxisLabel?: string
  xAxisLabel?: string

visualSpec (metric-cards):
  metrics: [{ label: string, value: string | number, trend?: "up"|"down"|"flat", icon?: string }]
  columns?: number           // default 3

visualSpec (process):
  steps: [{ title: string, description?: string, icon?: string }]
  direction: "horizontal" | "vertical"

visualSpec (timeline):
  events: [{ year: string, title: string, description?: string }]
```

### Renderer Integration

The pptx-renderer gains new role handlers in `renderer.js`:

- `renderBarChartSlide()` — draws bars as rectangles with text labels
- `renderLineChartSlide()` — draws lines as polylines with grid
- `renderMetricCardsSlide()` — draws rounded rectangles with large numbers
- `renderProcessDiagramSlide()` — draws connected step boxes
- `renderTimelineSlide()` — draws a horizontal timeline with event markers

Each handler uses PptxGenJS native shapes (no image embedding).

### Generator Integration

The story planner (`packages/story-planner/src/planner.js`) gains a
`selectVisualType(intent, slide)` function that maps slide content to the
appropriate visualType based on keywords and data density.

## Quality Gates

- All chart/diagram slides must produce valid .pptx with editable elements
- No placeholder-only output — every visual must contain real data
- Existing M12.7 pipeline must remain unaffected
- Speaker notes preserved on chart/diagram slides
- Source references preserved

## Files Changed

- `docs/M12_10_ASSET_CHART_DIAGRAM_ENHANCEMENT_SPEC.md` (this file)
- `packages/pptx-renderer/src/renderer.js` (new visual handlers)
- `packages/story-planner/src/planner.js` (visualType selection)
- `tests/chart-diagram/chart-diagram.test.js` (new test suite)
- `fixtures/m12-10/bar-chart-example.json` (fixture)
- `fixtures/m12-10/line-chart-example.json` (fixture)
- `fixtures/m12-10/metric-cards-example.json` (fixture)
- `fixtures/m12-10/process-diagram-example.json` (fixture)
- `fixtures/m12-10/timeline-example.json` (fixture)
- `scripts/check-m12-10-asset-chart-diagram.cjs` (new checker)
- `package.json` (check:m12-10 script, check:all inclusion)
- `docs/ROADMAP.md` (M12.10 marked complete, Next → M12.11)

## Testing

- Unit tests for each visual handler
- Integration test: full pipeline markdown → .pptx with chart slides
- Visual validation: .pptx opens in LibreOffice, chart elements are editable shapes
- Regression: existing M12.6–M12.9 tests still pass

## Next Steps

M12.11: CLI and Skill Packaging — expose chart/diagram generation via CLI
subcommands and package as reusable Hermes skills.
