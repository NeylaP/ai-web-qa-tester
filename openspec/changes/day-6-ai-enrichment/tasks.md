# Tasks: Day 6 — AI Test Enrichment

## Phase 1: ai-orchestrator Nx Lib Scaffold

- [ ] 1.1 Create `ai-orchestrator/project.json` — tags: `type:infrastructure`, `scope:core`; executors: `@nx/js:tsc` (build), `@nx/vite:test` (test)
- [ ] 1.2 Create `ai-orchestrator/package.json` — dependencies: core-domain, core-application, `@anthropic-ai/sdk`, `zod`, tslib
- [ ] 1.3 Create `ai-orchestrator/tsconfig.json` — extends `../tsconfig.base.json`, mirrors scanner pattern
- [ ] 1.4 Create `ai-orchestrator/tsconfig.lib.json` — mirrors `scanner/tsconfig.lib.json`
- [ ] 1.5 Create `ai-orchestrator/tsconfig.spec.json` — mirrors `scanner/tsconfig.spec.json`
- [ ] 1.6 Create `ai-orchestrator/vite.config.ts` — mirrors `playwright-adapter/vite.config.ts` (name: `ai-orchestrator`)
- [ ] 1.7 Create `ai-orchestrator/eslint.config.mjs` — mirrors `scanner/eslint.config.mjs`
- [ ] 1.8 Update `tsconfig.base.json` — add `@ai-web-qa-tester/ai-orchestrator` path alias

## Phase 2: Domain + Application Layer

- [ ] 2.1 Create `core-domain/src/lib/ai-provider.ts` — `AiProvider` interface with `complete(prompt: string): Promise<string>`
- [ ] 2.2 Modify `core-domain/src/lib/test-spec.ts` — add optional `requestBody?: Record<string, unknown>` and `responseAssertions?: string[]`
- [ ] 2.3 Update `core-domain/src/index.ts` — re-export `AiProvider`
- [ ] 2.4 Create `core-application/src/lib/ports/ai-enricher.port.ts` — `AiEnricherPort` with `enrich(spec: TestSpec): Promise<Partial<TestSpec>>`
- [ ] 2.5 Update `core-application/src/index.ts` — re-export `AiEnricherPort`

## Phase 3: Update GenerateTestsUseCase

- [ ] 3.1 Modify `core-application/src/lib/use-cases/generate-tests.use-case.ts` — add optional 4th constructor param `aiEnricher: AiEnricherPort | null`; after `toTestSpec()`, if `!skipped && aiEnricher`, call `enrich(spec)` and spread result into spec

## Phase 4: ai-orchestrator Adapters

- [ ] 4.1 Create `ai-orchestrator/src/lib/anthropic-provider.ts` — `AnthropicProvider implements AiProvider`; reads `ANTHROPIC_API_KEY` from env; calls Anthropic messages API
- [ ] 4.2 Create `ai-orchestrator/src/lib/ai-enricher.adapter.ts` — `AiEnricher implements AiEnricherPort`; builds prompt from spec (method, endpoint, controllerName); calls `AiProvider.complete()`; Zod-validates response; returns `{}` on any error
- [ ] 4.3 Create `ai-orchestrator/src/index.ts` — barrel export `AnthropicProvider`, `AiEnricher`

## Phase 5: Update PlaywrightSpecWriter

- [ ] 5.1 Modify `playwright-adapter/src/lib/playwright-spec-writer.ts` — use `spec.requestBody` when present (instead of `{ data: {} }`); add `const body = await response.json();` + `responseAssertions` lines when present

## Phase 6: CLI Wiring

- [ ] 6.1 Modify `cli/src/main.ts` — add `--enrich` flag to `generate` command; check `ANTHROPIC_API_KEY` env var when `--enrich` set (exit 1 if missing); import `AnthropicProvider`, `AiEnricher` from `@ai-web-qa-tester/ai-orchestrator`; inject into `GenerateTestsUseCase` when `--enrich` present

## Phase 7: Unit Tests

- [ ] 7.1 Create `ai-orchestrator/src/lib/ai-enricher.adapter.spec.ts`:
  - Valid AI JSON → enriched spec with requestBody + responseAssertions
  - Invalid JSON from AI → returns `{}` (original spec unchanged)
  - AI call throws → returns `{}` (original spec unchanged)
  - Skipped spec → AiProvider.complete() not called
- [ ] 7.2 Update `core-application/src/lib/use-cases/generate-tests.use-case.spec.ts` — add: with enricher → merged fields in output; null enricher → identical to Day 5
- [ ] 7.3 Update `playwright-adapter/src/lib/playwright-spec-writer.spec.ts` — add: requestBody present → in request call; responseAssertions present → assertion lines in test body
- [ ] 7.4 Run `npx nx run-many -t test --all` — all suites pass

## Phase 8: Verification

- [ ] 8.1 Run `npx nx run-many -t lint build --all` — no errors
- [ ] 8.2 Run `node dist/cli/main.js generate --backend lab/backend --enrich` with `ANTHROPIC_API_KEY` set — exits 0, POST spec has non-empty `requestBody`
- [ ] 8.3 Run `node dist/cli/main.js generate --backend lab/backend` (no `--enrich`) — output identical to Day 5
- [ ] 8.4 Run without `ANTHROPIC_API_KEY` set and `--enrich` — exits 1 with clear error message
