---
sidebar_position: 3
title: Quickstart
---

# Quickstart — 5 minutes

This guide runs the full QA pipeline against a NestJS backend. No Angular project required for this quickstart.

## Step 1 — Install

```bash
npm install -g @npmoncada/ai-web-qa-tester
npx playwright install chromium
```

## Step 2 — Generate tests from existing route map

If you already have a NestJS project and want to skip the Angular analysis, run:

```bash
qa-tester pipeline \
  --backend path/to/your-nestjs-project \
  --base-url http://localhost:3000 \
  --skip-backend
```

:::tip
Use `--skip-backend` if your server is already running. Drop it to let the tool start it automatically.
:::

## Step 3 — Full pipeline with Angular frontend

```bash
qa-tester pipeline \
  --frontend path/to/angular-project \
  --backend path/to/nestjs-project \
  --base-url http://localhost:3000
```

This runs all 6 steps and produces a report at `.qa/test-report.html`.

## Step 4 — With AI enrichment

Set your API key and add `--enrich`:

```bash
export OPENAI_API_KEY=sk-...
qa-tester pipeline \
  --frontend path/to/angular-project \
  --backend path/to/nestjs-project \
  --base-url http://localhost:3000 \
  --enrich
```

The AI adds realistic request bodies and response assertions based on your controller source code.

## Step 5 — View the report

Open `.qa/test-report.html` in your browser. The report shows:
- Pass/fail status per endpoint
- Response time per test
- Delta vs. the previous run
- Error details for failures

---

## What just happened?

```
[1/6] Scanning project...     done
[2/6] Analyzing source code... done
[3/6] Building route map...   done
[4/6] Generating test specs... done
[5/6] Running tests...        done
[6/6] Generating HTML report... done

────────────────────────────────────────────────
Pipeline complete
Tests: 42 passed  3 failed  5 skipped  (50 total)
Report: path/to/backend/.qa/test-report.html
```

---

## Next steps

- [Authentication guide](guides/authentication) — add Bearer JWT to your tests
- [CLI Reference](cli-reference) — all flags and options
- [Full Tutorial](guides/full-tutorial) — end-to-end with a real project
