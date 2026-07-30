# Changelog

All notable changes to `@npmoncada/ai-web-qa-tester` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and uses [Conventional Commits](https://www.conventionalcommits.org/).

---

## [0.2.0] - 2026-07-27

### Features

* **auth**: Bearer token auth with automatic login flow via `.qa/auth.json` — `--auth-token`, `--auth-env`, and login URL support
* **auth**: `--clean-state <url>` flag POSTs to a reset endpoint before running tests
* **scanner**: P1.2 — template literal URL resolution, `inject()` function-based injection support, dynamic `HttpClient` property name detection
* **scanner**: multi-pass constant resolution chains `environment.ts` → constants files → service files
* **ai**: P2.1 — controller source code passed as AI context; `responseAssertions` now reflect actual response shape
* **ai**: P2.1 — error case tests generated for POST/PUT/PATCH (missing required fields → 422)
* **ai**: P2.2 — `enrichControllerSetup()` generates `beforeAll`/`afterAll` for resource lifecycle controllers with path param substitution
* **cli**: P2.3 — `--verbose` global flag shows full stack traces; `handleError()` with actionable hints per error type
* **report**: P2.4 — run history saved to `.qa/history/`; delta vs previous run shown in HTML report (new failures, fixed, new skips)
* **report**: P2.4 — dark mode via `prefers-color-scheme`, `--report-title` and `--report-logo` customization
* **cli**: P2.5 — `--startup-timeout <ms>` and `--test-timeout <ms>` flags for `run` and `pipeline`
* **cli**: P1.5 — esbuild bundle mode; `publish` Nx target; GitHub Actions workflow triggers on `v*` tags

### Bug Fixes

* **ci**: add `--legacy-peer-deps` to `npm ci` to resolve prettier@2 vs @nestjs/schematics@11 peer conflict
* **ci**: copy `cli/package.json` to `dist/cli/` before publish — `generatePackageJson: true` with `bundle: true` does not copy metadata
* **ci**: use `working-directory: dist/cli` + `npm publish` without path arg to avoid npm treating `dist/cli` as a GitHub shorthand
* **cli**: move `publish` target inside `targets` block in `cli/project.json` — invalid JSON caused Nx project graph failure

---

## [0.1.3] - 2026-07-18

### Features

* **publish**: publish CLI as `@npmoncada/ai-web-qa-tester` to npm public registry
* **cli**: dynamic version from `package.json` via `require()` — `qa-tester --version` now returns the correct semver
* **cli**: add shebang injection target in `cli/project.json` (`add-shebang`) for Nx-built output

### Bug Fixes

* **publish**: bin field must omit `./` prefix and `.js` extension to pass npm 10 validation
* **publish**: create `bin/qa-tester` wrapper script so npm can resolve the entry point correctly

---

## [0.1.2] - 2026-07-15

### Features

* **scanner**: Angular constants scanner for resolving URLs from environment files
* **auth**: Bearer token injection via `--auth-header` flag and `.qa/auth.json`
* **backend**: `NullNestAnalyzer` + `--skip-backend` flag for Laravel / PHP projects

---

## [0.1.1] - 2026-07-12

### Features

* **ai**: `AiEnricher` generates `requestBody` and `responseAssertions` for each endpoint
* **report**: self-contained HTML report generated from `test-report.json`
* **pipeline**: `qa-tester pipeline` command — scan → analyze → map → generate → run → report

---

## [0.1.0] - 2026-07-05

### Features

* Initial MVP: Angular ts-morph analyzer, NestJS ts-morph analyzer, route-map builder
* Playwright spec writer generates `.spec.ts` files per controller
* CLI commands: `scan`, `analyze`, `map`, `generate`, `run`, `report`
* OpenAI (`gpt-4o-mini`) as default AI provider
