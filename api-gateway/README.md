# AWE API Gateway

REST API for AWE Presentation OS.

## Quick Start

```bash
node api-gateway/server.js
```

## Endpoints

- `GET /health` - Health check
- `POST /v1/generate` - Generate PPTX from Markdown

## Authentication

Use Bearer token:

```bash
curl -H "Authorization: Bearer demo-key-123" \
  http://localhost:3000/v1/generate \
  -d '{"markdown":"# Hello"}' \
  --output deck.pptx
```

## Test Keys

- `demo-key-123` (free tier, 10 req/min)
- `test-key-456` (pro tier, 100 req/min)

## Run Tests

```bash
node api-gateway/test-api.test.js
```
