# M12.22 Local Delivery Studio MVP

## Goal

M12.22 adds a local browser UI on top of the existing one-command commercial delivery pipeline. It lets a non-engineering user paste markdown, choose a style and brand profile, generate a PPTX, and inspect the same commercial QA artifacts already produced by `scripts/deliver-pptx.js`.

This is intentionally local-only. It does not add accounts, cloud upload, billing, or external services.

## User Invocation

CLI remains the automation-friendly entrypoint:

```bash
npm run deliver:pptx -- input.md ./deliverables/client-a --style business-consulting --brand-profile business-consulting
```

Local Studio is the human-facing MVP:

```bash
npm run studio:pptx
```

Then open:

```text
http://localhost:9200
```

Optional port override:

```bash
npm run studio:pptx -- --port 9300
```

## Studio API

`GET /`

Serves the local Delivery Studio UI.

`GET /api/profiles`

Returns available theme styles and built-in brand profiles.

`POST /api/deliver`

Request:

```json
{
  "markdown": "# Quarterly Business Review\n\n## Executive Summary\n- Revenue grew 18%",
  "style": "business-consulting",
  "brandProfile": "business-consulting",
  "customBrandProfilePath": null,
  "title": "QBR"
}
```

Response:

```json
{
  "status": "ok",
  "jobId": "20260719-144500-ab12cd",
  "jobDir": "/absolute/path/to/deliverables/studio/20260719-144500-ab12cd",
  "artifacts": {
    "output.pptx": "/absolute/path/to/output.pptx",
    "COMMERCIAL-VERDICT.md": "/absolute/path/to/COMMERCIAL-VERDICT.md",
    "machine-report.json": "/absolute/path/to/machine-report.json"
  },
  "summary": {
    "style": "business-consulting",
    "brandProfile": "business-consulting",
    "title": "QBR",
    "overallVerdict": "PASS"
  }
}
```

## Safety and Scope

- The Studio uses Node's built-in HTTP server.
- It calls the existing `scripts/deliver-pptx.js` through `child_process.spawn` with an argv array, not a shell command string.
- User markdown is written to a timestamped local job folder under `deliverables/studio/`.
- The existing commercial QA artifacts remain the source of truth:
  - `output.pptx`
  - `quality-manifest.json`
  - `QA-SUMMARY.md`
  - `VISUAL-DESIGN-SUMMARY.md`
  - `rendered-qa-report.json`
  - `PIXEL-ACCESSIBILITY-SUMMARY.md`
  - `LOGO-SAFE-AREA-SUMMARY.md`
  - `COMMERCIAL-VERDICT.md`
  - `machine-report.json`

## Commercial Value

This milestone turns Presentation OS from a developer-only CLI into a demonstrable local product surface:

- Faster sales/demo loop: paste source content and generate a deck in the browser.
- Lower onboarding friction: non-engineering users do not need to learn CLI flags.
- Shared quality bar: Studio and CLI use the same delivery engine and reports.
- Safer commercialization path: local-first avoids authentication, storage, and multi-tenant risk while product-market fit is tested.

## Validation

Focused checker:

```bash
npm run check:m12-22-local-delivery-studio
```

Full checks:

```bash
npm run check
npm run check:all
```
