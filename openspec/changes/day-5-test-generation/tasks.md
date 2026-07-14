# Tasks: Day 5 — Playwright Test Generation

## Phase 1: playwright-adapter Nx Lib Scaffold

- [x] 1.1 Create `playwright-adapter/project.json` — tags: `type:infrastructure`, `scope:core`; executors: `@nx/js:tsc` (build), `@nx/vite:test` (test)
- [x] 1.2 Create `playwright-adapter/package.json` — dependencies: `@ai-web-qa-tester/core-domain`, `@ai-web-qa-tester/core-application`, `tslib`
- [x] 1.3 Create `playwright-adapter/tsconfig.json` — mirrors `scanner/tsconfig.json` (extends `../tsconfig.base.json`)
- [x] 1.4 Create `playwright-adapter/tsconfig.lib.json` — mirrors `scanner/tsconfig.lib.json`
- [x] 1.5 Create `playwright-adapter/tsconfig.spec.json` — mirrors `scanner/tsconfig.spec.json`
- [x] 1.6 Create `playwright-adapter/vite.config.ts` — mirrors `scanner/vite.config.ts` (name: `playwright-adapter`)
- [x] 1.7 Create `playwright-adapter/eslint.config.mjs` — mirrors `scanner/eslint.config.mjs`
- [x] 1.8 Update `tsconfig.base.json` — add `@ai-web-qa-tester/playwright-adapter` path alias pointing to `playwright-adapter/src/index.ts`

## Phase 2: Domain Types

- [x] 2.1 Create `core-domain/src/lib/test-spec.ts` — export `TestSpec`, `TestSuite`
- [x] 2.2 Update `core-domain/src/index.ts` — re-export `TestSpec`, `TestSuite`

## Phase 3: Application Layer

- [x] 3.1 Create `core-application/src/lib/ports/route-map-reader.port.ts` — `RouteMapReaderPort` with `read(targetDir: string): Promise<RouteMap>`
- [x] 3.2 Create `core-application/src/lib/ports/test-suite-writer.port.ts` — `TestSuiteWriterPort` with `write(suite: TestSuite, backendPath: string, outputDir: string): Promise<void>`
- [x] 3.3 Create `core-application/src/lib/use-cases/generate-tests.use-case.ts` — `GenerateTestsUseCase`, `GenerateTestsError`, `GenerateTestsInput`; derive status (POST→201, others→200); `confidence:none` → `skipped:true`
- [x] 3.4 Update `core-application/src/index.ts` — re-export ports, use case, error, input type

## Phase 4: Infrastructure Adapters

- [x] 4.1 Create `scanner/src/lib/route-map-reader.adapter.ts` — `RouteMapReader implements RouteMapReaderPort`, reads `.qa/route-map.json`
- [x] 4.2 Update `scanner/src/index.ts` — export `RouteMapReader`
- [x] 4.3 Create `playwright-adapter/src/lib/playwright-spec-writer.ts` — `PlaywrightSpecWriter implements TestSuiteWriterPort`; groups specs by controller name (fallback: angularService); writes `.qa/tests/{Controller}.spec.ts` + `.qa/test-suite.json`
- [x] 4.4 Create `playwright-adapter/src/index.ts` — barrel export `PlaywrightSpecWriter`

## Phase 5: CLI Wiring

- [x] 5.1 Update `cli/src/main.ts` — add `generate --backend <path> [--output <path>]` command; wire `GenerateTestsUseCase` + `NodeFileSystemAdapter` + `RouteMapReader` + `PlaywrightSpecWriter`

## Phase 6: Unit Tests

- [x] 6.1 Create `core-application/src/lib/use-cases/generate-tests.use-case.spec.ts`:
  - Exact GET → active test, expectedStatus 200
  - Exact POST → active test, expectedStatus 201
  - None confidence → skipped: true
  - Empty entries → entries: [], no throw
  - Missing route-map.json → throws GenerateTestsError with file path
- [x] 6.2 Create `scanner/src/lib/route-map-reader.adapter.spec.ts` — reads valid JSON from tmp dir
- [x] 6.3 Create `playwright-adapter/src/lib/playwright-spec-writer.spec.ts`:
  - Grouped by controller → single .spec.ts file with test.describe
  - test.skip for skipped specs with contract-gap comment
  - test-suite.json written to .qa/
- [x] 6.4 Run `npx nx run-many -t test --all` — all suites pass

## Phase 7: Verification

- [x] 7.1 Run `npx nx run-many -t lint build --all` — no errors
- [x] 7.2 Run `node dist/cli/main.js generate --backend lab/backend` — exits 0
- [x] 7.3 Assert `lab/backend/.qa/tests/ProductsController.spec.ts` — GET/POST are active tests; PUT entry is `test.skip`
