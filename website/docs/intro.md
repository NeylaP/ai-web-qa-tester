---
sidebar_position: 1
title: Introduction
---

# ai-web-qa-tester

**AI-powered QA automation for Angular + NestJS projects.**

Scan your source code, map Angular HTTP calls to NestJS endpoints, generate Playwright test specs, run them against a live server, and produce an HTML report — all from a single command.

```bash
npx @npmoncada/ai-web-qa-tester pipeline \
  --backend path/to/backend \
  --base-url http://localhost:3000 \
  --frontend path/to/frontend \
  --enrich
```

---

## What it does

1. **Scans** your Angular frontend with ts-morph to find all HTTP calls (including template literals and `inject()` patterns)
2. **Maps** those calls to NestJS endpoints with confidence scoring
3. **Generates** Playwright `.spec.ts` files per controller
4. **Enriches** (optionally) each test with AI-generated request bodies and response assertions
5. **Runs** the tests against a live backend (auto-starts it if needed)
6. **Reports** results as a self-contained HTML file with delta vs. previous run

---

## Key features

| Feature | Description |
|---------|-------------|
| Auto-discovery | ts-morph static analysis — no runtime required |
| Route mapping | Exact + partial matching with confidence scores |
| AI enrichment | OpenAI or Anthropic for realistic request bodies and assertions |
| Authentication | Bearer JWT via flag, env var, or `.qa/auth.json` with auto-login |
| HTML reports | Dark mode, run history, delta vs previous run, custom branding |
| CI-ready | One command, exits with code 1 on test failures |

---

## Next steps

- [Installation](installation) — install and run your first pipeline in 5 minutes
- [CLI Reference](cli-reference) — all commands and flags
- [Full Tutorial](guides/full-tutorial) — end-to-end guide with a real Angular + NestJS project
