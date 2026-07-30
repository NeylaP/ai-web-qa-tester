---
sidebar_position: 5
title: CI / GitHub Actions
---

# CI / GitHub Actions

## Minimal workflow

```yaml title=".github/workflows/qa.yml"
name: QA Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install qa-tester
        run: npm install -g @npmoncada/ai-web-qa-tester

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Install backend dependencies
        run: npm ci
        working-directory: path/to/backend

      - name: Run QA pipeline
        run: |
          qa-tester pipeline \
            --backend path/to/backend \
            --base-url http://localhost:3000 \
            --start-command "npx nest start"

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: qa-report
          path: path/to/backend/.qa/test-report.html
```

## With authentication

```yaml
      - name: Run QA pipeline
        run: |
          qa-tester pipeline \
            --backend path/to/backend \
            --base-url http://localhost:3000 \
            --auth-env QA_AUTH_TOKEN \
            --start-command "npx nest start"
        env:
          QA_AUTH_TOKEN: ${{ secrets.QA_AUTH_TOKEN }}
```

Add `QA_AUTH_TOKEN` to your repository secrets: **Settings → Secrets and variables → Actions → New repository secret**.

## With AI enrichment

```yaml
      - name: Run QA pipeline
        run: |
          qa-tester pipeline \
            --backend path/to/backend \
            --base-url http://localhost:3000 \
            --enrich
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Full example with Angular frontend

```yaml
      - name: Run QA pipeline
        run: |
          qa-tester pipeline \
            --frontend path/to/frontend \
            --backend path/to/backend \
            --base-url http://localhost:3000 \
            --auth-env QA_AUTH_TOKEN \
            --enrich \
            --report-title "My API — CI Report" \
            --startup-timeout 60000
        env:
          QA_AUTH_TOKEN: ${{ secrets.QA_AUTH_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Exit codes

The `pipeline` command exits with:
- `0` — all tests passed
- `1` — one or more tests failed (GitHub marks the job as failed)

This automatically blocks pull request merges if tests fail.
