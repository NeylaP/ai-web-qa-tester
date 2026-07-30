---
sidebar_position: 4
title: HTML Report
---

# HTML Report

The `report` command generates a self-contained HTML file from `test-report.json`. No external CDN dependencies — works offline.

## Generate

```bash
qa-tester report \
  --backend ./api \
  [--output ./my-report.html] \
  [--report-title "Jobs API QA"] \
  [--report-logo https://example.com/logo.png]
```

## What's in the report

- **Summary bar** — total / passed / failed / skipped with progress bar
- **Per-test results** — status badge, endpoint, response time, expandable error details
- **Delta section** — comparison vs. the previous run (new failures, fixed tests, new skips)
- **Dark mode** — respects `prefers-color-scheme`
- **Custom branding** — title and logo from `--report-title` / `--report-logo`

## Run history

Every time you run `qa-tester run` or `qa-tester pipeline`, the current report is saved to:

```
<backend>/.qa/history/test-report-<timestamp>.json
```

The next run reads the most recent file in that directory and shows the delta automatically.

## Delta section example

```
🔴 New failures (2)
  GET /api/jobs/:param — was passing, now failing
  POST /api/applicants — was passing, now failing

✅ Fixed (1)
  DELETE /api/jobs/:param — was failing, now passing

⚠️ New skips (0)
```

## CI artifact upload

In GitHub Actions, upload the report as an artifact:

```yaml
- name: Upload QA report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: qa-report
    path: path/to/backend/.qa/test-report.html
```

The report is then available in the GitHub Actions run summary.
