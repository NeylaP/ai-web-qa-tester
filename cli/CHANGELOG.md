# Changelog

All notable changes to `@npmoncada/ai-web-qa-tester` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and uses [Conventional Commits](https://www.conventionalcommits.org/).

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
