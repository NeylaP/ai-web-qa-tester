---
sidebar_position: 5
title: FAQ & Troubleshooting
---

# FAQ & Troubleshooting

## General

### Does it work with projects that don't use Angular?

The `--frontend` flag is optional. If you skip it, the tool skips the scan and analyze steps and uses existing `.qa/tests/` spec files or generates them from a pre-existing `route-map.json`. You can hand-write the route map for any stack.

### Does it work with backends other than NestJS?

Partially. The NestJS analyzer uses ts-morph to find TypeScript controllers. For other stacks (Laravel, Spring, etc.), you can:
1. Skip backend analysis with `--constants-file` or by providing a `component-inventory.json` manually
2. Write your own `route-map.json` (see the schema in `.qa/route-map.json`)

### Do the generated tests run in CI?

Yes. The pipeline command is CI-ready — it exits with code `1` if any test fails. See the [GitHub Actions guide](guides/ci-github-actions).

---

## Angular Analyzer

### My HTTP calls aren't being detected

The analyzer looks for:
- Constructor injection: `constructor(private http: HttpClient)`
- Function-based injection: `private http = inject(HttpClient)`
- Direct calls on the injected instance: `this.http.get(...)`, `this.http.post(...)`

If your service uses a different pattern (e.g. a wrapper service), open an issue with a code sample.

### Template literal URLs aren't resolving

The analyzer resolves constant chains across files (e.g. `ROUTES_PRIVATE.JOBS` → `environment.url_api`). Make sure:
1. The constants are `export const` or `export enum` at the module level
2. The values eventually resolve to a string literal (not a function call)

### `inject()` calls aren't detected

Ensure you're using Angular 14+ function-based injection: `private http = inject(HttpClient)`. Class property declarations with `= inject(...)` in the class body are supported.

---

## Test Failures

### All tests return 401

Your API requires authentication. Add a token:

```bash
qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN
```

See the [Authentication guide](guides/authentication).

### Backend doesn't start within the timeout

Increase the startup timeout:

```bash
qa-tester pipeline ... --startup-timeout 300000
```

Or start the backend manually and use `--skip-backend`.

### Tests time out

Increase the per-test timeout:

```bash
qa-tester pipeline ... --test-timeout 60000
```

---

## AI Enrichment

### `--enrich` has no effect

Check that at least one of these is set:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

AI enrichment fails silently — if the key is missing or invalid, tests are generated without enrichment.

### Assertions are wrong

The AI infers field names from the URL, HTTP method, and controller source. If assertions are incorrect:
1. Check that `controllerFile` is populated in `route-map.json` (requires NestJS analysis)
2. The AI only sees the first 2000 characters of the controller source — split large controllers

---

## Report

### The HTML report is empty

Run `qa-tester run` or `qa-tester pipeline` first to generate `test-report.json`. The `report` command only converts existing JSON to HTML.

### Delta shows everything as "new failure"

Delta comparison requires at least two runs. The first run has no previous data to compare against — that's expected.

---

## npm / Installation

### `qa-tester: command not found`

```bash
npm install -g @npmoncada/ai-web-qa-tester
```

Or use npx without global install:

```bash
npx @npmoncada/ai-web-qa-tester pipeline ...
```

### Peer dependency warnings

Install Playwright if you don't have it:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```
