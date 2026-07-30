---
sidebar_position: 4
title: CLI Reference
---

# CLI Reference

All commands are available via `qa-tester` (global install) or `npx @npmoncada/ai-web-qa-tester`.

## Global flags

| Flag | Description |
|------|-------------|
| `--verbose` | Show full stack traces on errors |
| `--version` | Print the installed version |
| `--help` | Show help for a command |

---

## `pipeline`

Runs the full QA cycle in one command: scan → analyze → map → generate → run → report.

```bash
qa-tester pipeline \
  --backend <path> \
  --base-url <url> \
  [options]
```

### Required

| Flag | Description |
|------|-------------|
| `--backend <path>` | Path to the NestJS backend project |
| `--base-url <url>` | Base URL where the server listens (e.g. `http://localhost:3000`) |

### Optional

| Flag | Default | Description |
|------|---------|-------------|
| `--frontend <path>` | — | Path to the Angular frontend (enables scan + analyze) |
| `--enrich` | off | Enrich tests with AI (requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) |
| `--start-command <cmd>` | `npx nest build && node dist/main.js` | Command to start the backend |
| `--skip-backend` | off | Skip starting the backend (use when it's already running) |
| `--auth-token <token>` | — | Bearer token for `Authorization` header |
| `--auth-env <var>` | — | Read Bearer token from environment variable (e.g. `QA_AUTH_TOKEN`) |
| `--origin-header <url>` | — | Value sent as `origin_dev` header (multi-tenant backends) |
| `--clean-state <url>` | — | POST to this URL to reset backend state before tests |
| `--startup-timeout <ms>` | `120000` | Milliseconds to wait for backend to start |
| `--test-timeout <ms>` | `30000` | Milliseconds per test |
| `--constants-file <path>` | — | Path to an Angular constants file (skips ts-morph analysis) |
| `--report-title <title>` | — | Custom title shown in the HTML report header |
| `--report-logo <url>` | — | URL of a logo image to display in the HTML report header |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed |
| `2` | Backend did not start within `--startup-timeout` |
| `3` | Configuration error (missing files, invalid path) |

---

## `scan`

Detects project frameworks and writes `.qa/project-manifest.json`.

```bash
qa-tester scan \
  --frontend <path> \
  --backend <path>
```

---

## `analyze`

Analyzes Angular components and NestJS controllers using ts-morph. Writes `.qa/component-inventory.json`.

```bash
qa-tester analyze \
  --frontend <path> \
  --backend <path> \
  [--constants-file <path>]
```

| Flag | Description |
|------|-------------|
| `--constants-file <path>` | Use a pre-built constants file instead of ts-morph analysis |

---

## `map`

Maps Angular HTTP calls to NestJS endpoints and writes `.qa/route-map.json`.

```bash
qa-tester map --backend <path>
```

Requires `component-inventory.json` to exist. Run `analyze` first.

---

## `generate`

Generates Playwright `.spec.ts` files from the route map.

```bash
qa-tester generate \
  --backend <path> \
  [--output <path>] \
  [--enrich]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output <path>` | `<backend>/.qa/tests` | Output directory for spec files |
| `--enrich` | off | Enrich with AI (requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) |

---

## `run`

Runs the generated Playwright tests and writes `.qa/test-report.json`.

```bash
qa-tester run \
  --backend <path> \
  --base-url <url> \
  [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--start-command <cmd>` | `npx nest build && node dist/main.js` | Backend start command |
| `--skip-backend` | off | Skip backend startup |
| `--auth-token <token>` | — | Bearer token |
| `--auth-env <var>` | — | Read token from env var |
| `--origin-header <url>` | — | `origin_dev` header value |
| `--clean-state <url>` | — | Reset endpoint URL |
| `--startup-timeout <ms>` | `120000` | Backend startup timeout |
| `--test-timeout <ms>` | `30000` | Per-test timeout |

---

## `report`

Generates an HTML report from `test-report.json`.

```bash
qa-tester report \
  --backend <path> \
  [--output <path>] \
  [--report-title <title>] \
  [--report-logo <url>]
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI enrichment (`--enrich`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI enrichment |
| `QA_AUTH_TOKEN` | Bearer token (use with `--auth-env QA_AUTH_TOKEN`) |

AI provider auto-detection: `ANTHROPIC_API_KEY` is checked first, then `OPENAI_API_KEY`.

---

## Authentication via `.qa/auth.json`

Place this file in your backend project's `.qa/` directory:

```json title=".qa/auth.json"
{
  "type": "bearer",
  "token": "eyJhbGc..."
}
```

Or with automatic login:

```json title=".qa/auth.json"
{
  "type": "bearer",
  "login": {
    "url": "http://localhost:3000/auth/login",
    "body": { "username": "admin", "password": "secret" },
    "tokenPath": "access_token"
  }
}
```

The `tokenPath` is a dot-notation path to the JWT in the login response (e.g. `"data.token"`).
