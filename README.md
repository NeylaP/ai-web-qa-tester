# ai-web-qa-tester

[![QA Pipeline](https://github.com/NeylaP/ai-web-qa-tester/actions/workflows/qa.yml/badge.svg)](https://github.com/NeylaP/ai-web-qa-tester/actions/workflows/qa.yml)

AI-powered QA automation tool for Angular + NestJS projects. Scans your source code, maps Angular HTTP calls to NestJS endpoints, generates Playwright test specs (optionally enriched by an LLM), runs them against a live server, and produces an HTML report — all from a single command.

---

## Features

- **Auto-discovery** — detects Angular components and NestJS controllers using ts-morph static analysis
- **Route mapping** — correlates Angular HTTP calls with their NestJS endpoint counterparts
- **Test generation** — produces Playwright `.spec.ts` files from the route map
- **AI enrichment** — optionally calls OpenAI or Anthropic to add realistic request bodies and response assertions
- **Auto-start** — builds and starts the NestJS backend automatically before running tests
- **HTML report** — self-contained visual report with pass/fail badges, progress bar, and expandable errors
- **Pipeline command** — runs the full cycle in one command, CI-ready

---

## Architecture

The project follows **Hexagonal (Clean) Architecture** inside an Nx monorepo:

```
┌─────────────────────────────────────────────────────────────────┐
│                      cli  (qa-tester binary)                     │
│          orchestrates use cases, wires adapters together         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼─────────────────────────┐
        ▼                  ▼                         ▼
┌──────────────┐  ┌───────────────────┐  ┌──────────────────────┐
│   scanner    │  │playwright-adapter │  │   ai-orchestrator    │
│ ts-morph,    │  │ spec writer,      │  │ AnthropicProvider,   │
│ Node fs/proc │  │ test runner,      │  │ OpenAiProvider,      │
│              │  │ HTML generator    │  │ AiEnricher (Zod)     │
└──────┬───────┘  └────────┬──────────┘  └──────────┬───────────┘
       │                   │                         │
       └───────────────────┼─────────────────────────┘
                           │  implement ports defined in
                           ▼
        ┌──────────────────────────────────────────────┐
        │              core-application                 │
        │   use cases · ports (interfaces only)         │
        │   no Node.js / framework dependencies         │
        └──────────────────┬───────────────────────────┘
                           │  uses entities from
                           ▼
        ┌──────────────────────────────────────────────┐
        │                core-domain                    │
        │  TestSpec · TestReport · RouteMap · etc.      │
        └──────────────────────────────────────────────┘
```

### Libraries

| Library | Type | Responsibility |
|---|---|---|
| `core-domain` | domain | Entity interfaces and types |
| `core-application` | application | Use cases and port interfaces |
| `scanner` | infrastructure | ts-morph analyzers, Node.js file/process adapters |
| `playwright-adapter` | infrastructure | Spec writer, test runner, HTML report generator |
| `ai-orchestrator` | infrastructure | Anthropic and OpenAI providers, AI enricher |
| `cli` | app | Commander.js CLI binary |

---

## Prerequisites

- Node.js 20+
- npm 10+
- A NestJS backend project
- (Optional) An Angular frontend project for route mapping
- (Optional) `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for AI enrichment

---

## Installation

```bash
git clone https://github.com/NeylaP/ai-web-qa-tester.git
cd ai-web-qa-tester
npm install --legacy-peer-deps
npx nx run cli:build:production
```

---

## Usage

All commands are available via `node dist/cli/main.js` or alias `qa-tester` once installed globally.

### Full pipeline (recommended)

```bash
node dist/cli/main.js pipeline \
  --backend path/to/backend \
  --base-url http://localhost:3000 \
  [--frontend path/to/frontend] \
  [--enrich]
```

Runs all steps in sequence and exits with code `1` if any test fails.

---

### Individual commands

#### `scan`
Detects project frameworks and writes `.qa/project-manifest.json`.

```bash
node dist/cli/main.js scan \
  --frontend path/to/frontend \
  --backend path/to/backend
```

#### `analyze`
Analyzes Angular components and NestJS controllers using ts-morph.
Writes `.qa/component-inventory.json`.

```bash
node dist/cli/main.js analyze \
  --frontend path/to/frontend \
  --backend path/to/backend
```

#### `map`
Maps Angular HTTP calls to NestJS endpoints.
Writes `.qa/route-map.json`.

```bash
node dist/cli/main.js map --backend path/to/backend
```

#### `generate`
Generates Playwright `.spec.ts` files from the route map.
Optionally enriches specs with AI-generated request bodies and assertions.

```bash
# Without AI enrichment
node dist/cli/main.js generate --backend path/to/backend

# With AI enrichment (auto-detects provider from env vars)
node dist/cli/main.js generate --backend path/to/backend --enrich
```

#### `run`
Builds and starts the NestJS backend, runs the generated Playwright tests, stops the backend, and writes `.qa/test-report.json`.

```bash
node dist/cli/main.js run \
  --backend path/to/backend \
  --base-url http://localhost:3000 \
  [--start-command "npx nest build && node dist/main.js"]
```

#### `report`
Generates a self-contained HTML report from `.qa/test-report.json`.

```bash
node dist/cli/main.js report \
  --backend path/to/backend \
  [--output path/to/custom-report.html]
```

---

## AI Enrichment

When `--enrich` is used, the tool sends each endpoint's metadata to an LLM and adds:

- **`requestBody`** — realistic sample payload for POST/PUT/PATCH endpoints
- **`responseAssertions`** — up to 3 `expect(body).toHaveProperty(...)` assertions

Provider auto-detection order:
1. `ANTHROPIC_API_KEY` → uses `claude-haiku-4-5` (fastest)
2. `OPENAI_API_KEY` → uses `gpt-4o-mini`

All AI errors are silent — if enrichment fails, the test is generated without enrichment.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for AI enrichment |
| `OPENAI_API_KEY` | OpenAI API key for AI enrichment |

---

## CI / GitHub Actions

A workflow is included at `.github/workflows/qa.yml`. It runs on every push and pull request to `main`/`master`.

**Setup:**
1. Go to your GitHub repo → Settings → Secrets → Actions
2. Add `OPENAI_API_KEY` (optional — skip for basic HTTP status testing)
3. Push — the pipeline will run automatically

**To enable AI enrichment in CI**, update the workflow step:

```yaml
- name: Run QA pipeline
  run: |
    node dist/cli/main.js pipeline \
      --backend lab/backend \
      --base-url http://localhost:3000 \
      --enrich
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

The job exits with code `1` if any test fails, causing GitHub to mark the run as failed.
The HTML report is uploaded as a build artifact on every run (pass or fail).

---

## Project Structure

```
ai-web-qa-tester/
├── core-domain/          # Entity interfaces (TestSpec, TestReport, RouteMap…)
├── core-application/     # Use cases + port interfaces
├── scanner/              # ts-morph analyzers + Node.js adapters
├── playwright-adapter/   # Spec writer, test runner, HTML report
├── ai-orchestrator/      # Anthropic + OpenAI providers
├── cli/                  # qa-tester CLI binary
├── lab/
│   └── backend/          # Sample NestJS project used for testing
│       ├── src/
│       │   └── products/ # Products controller + service + DTOs
│       └── .qa/          # Generated artifacts (route-map, specs, report)
└── .github/
    └── workflows/
        └── qa.yml        # GitHub Actions QA pipeline
```

---

## Output Files

All generated files are written to `<backend>/.qa/`:

| File | Generated by | Description |
|---|---|---|
| `project-manifest.json` | `scan` | Framework detection results |
| `component-inventory.json` | `analyze` | Angular + NestJS component catalog |
| `route-map.json` | `map` | Matched route pairs |
| `test-suite.json` | `generate` | Structured test spec list |
| `tests/*.spec.ts` | `generate` | Playwright test files |
| `test-report.json` | `run` | Machine-readable test results |
| `test-report.html` | `report` | Visual HTML report |
