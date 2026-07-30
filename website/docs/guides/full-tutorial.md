---
sidebar_position: 1
title: Full Tutorial
---

# Full Tutorial — Angular + NestJS

This guide walks through the complete workflow using a real Angular + NestJS project.

## Prerequisites

- Angular project (e.g. `my-angular-app/`)
- NestJS project (e.g. `my-nestjs-api/`)
- Both are in your local filesystem

## Step 1 — Install

```bash
npm install -g @npmoncada/ai-web-qa-tester
npx playwright install chromium
```

## Step 2 — Scan the project

```bash
qa-tester scan \
  --frontend ./my-angular-app \
  --backend ./my-nestjs-api
```

Output: `my-nestjs-api/.qa/project-manifest.json`

## Step 3 — Analyze source code

```bash
qa-tester analyze \
  --frontend ./my-angular-app \
  --backend ./my-nestjs-api
```

Output: `my-nestjs-api/.qa/component-inventory.json`

This step uses ts-morph to find:
- All Angular services with HTTP calls (including `inject(HttpClient)` and template literals)
- All NestJS controllers with their endpoints

## Step 4 — Build the route map

```bash
qa-tester map --backend ./my-nestjs-api
```

Output: `my-nestjs-api/.qa/route-map.json`

Example entry:

```json
{
  "angularService": "JobsService",
  "httpCall": { "method": "GET", "urlPattern": "https://api.example.com/api/private/jobs/:param" },
  "matchedEndpoint": {
    "controller": "JobsController",
    "endpoint": { "method": "GET", "path": "/api/private/jobs/:id" }
  },
  "confidence": "exact"
}
```

## Step 5 — Generate test specs

```bash
# Without AI
qa-tester generate --backend ./my-nestjs-api

# With AI enrichment
export OPENAI_API_KEY=sk-...
qa-tester generate --backend ./my-nestjs-api --enrich
```

Output: `.spec.ts` files in `my-nestjs-api/.qa/tests/`

## Step 6 — Run the tests

```bash
qa-tester run \
  --backend ./my-nestjs-api \
  --base-url http://localhost:3000 \
  --auth-token "Bearer eyJhbGc..."
```

Or using auto-start:

```bash
qa-tester run \
  --backend ./my-nestjs-api \
  --base-url http://localhost:3000 \
  --start-command "npx nest start"
```

## Step 7 — View the report

```bash
qa-tester report --backend ./my-nestjs-api
open ./my-nestjs-api/.qa/test-report.html
```

## Step 8 — Pipeline (all in one)

```bash
export OPENAI_API_KEY=sk-...
qa-tester pipeline \
  --frontend ./my-angular-app \
  --backend ./my-nestjs-api \
  --base-url http://localhost:3000 \
  --auth-env OPENAI_API_KEY \
  --enrich
```

The pipeline exits with code `1` if any test fails — perfect for CI.
