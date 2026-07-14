# Proposal: Day 5 — Playwright Test Generation

## Intent

Given a `route-map.json`, generate Playwright `.spec.ts` test files that verify each mapped Angular↔NestJS route. Routes with `confidence: none` (contract gaps) are emitted as `test.skip` with a warning comment.

## Scope

### In Scope
- New domain types: `TestSpec`, `TestSuite`
- New application ports: `RouteMapReaderPort`, `TestSuiteWriterPort`
- New use case: `GenerateTestsUseCase` — transforms `RouteMap → TestSuite`
- New Nx lib `playwright-adapter` (type:infrastructure) — writes `.spec.ts` files from `TestSuite`
- New scanner adapter: `RouteMapReader` — reads `.qa/route-map.json`
- New CLI command: `generate --backend <path> [--output <path>]`
- Output: `<output>/<controller>.spec.ts` per controller group + `.qa/test-suite.json`

### Out of Scope
- Running the generated tests (generation only)
- AI-enriched assertions (Day 6)
- Request body generation from DTOs (Day 6)
- Authentication / headers (future)

## Capabilities

### New Capabilities
- `test-generation`: generate Playwright spec files from a route map; template-based, confidence-aware

### Modified Capabilities
None

## Approach

Template-based (no AI). `GenerateTestsUseCase` maps each `RouteMapEntry` to a `TestSpec`:
- `confidence: exact | partial` → active test, `expectedStatus` derived from HTTP method
- `confidence: none` → `skipped: true` → `test.skip` with contract-gap comment

`PlaywrightSpecWriter` groups specs by controller name and emits one `.spec.ts` per group inside a `test.describe` block.

| Method       | expectedStatus |
|--------------|---------------|
| GET          | 200            |
| POST         | 201            |
| PUT / PATCH  | 200            |
| DELETE       | 200            |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `core-domain/src/lib/test-spec.ts` | New | TestSpec, TestSuite |
| `core-domain/src/index.ts` | Modified | re-export new types |
| `core-application/src/lib/ports/` | New (×2) | RouteMapReaderPort, TestSuiteWriterPort |
| `core-application/src/lib/use-cases/` | New | GenerateTestsUseCase, GenerateTestsError |
| `core-application/src/index.ts` | Modified | re-export new items |
| `scanner/src/lib/route-map-reader.adapter.ts` | New | reads `.qa/route-map.json` |
| `scanner/src/index.ts` | Modified | export RouteMapReader |
| `playwright-adapter/` | New Nx lib | PlaywrightSpecWriter |
| `cli/src/main.ts` | Modified | add `generate` command |
| `eslint.config.mjs` | Modified | add playwright-adapter boundaries |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Module boundary violation (playwright-adapter tags) | Med | Follow scanner pattern exactly — tag type:infrastructure |
| `@nx/dependency-checks` missing internal deps | Med | Add core-domain + core-application to playwright-adapter/package.json |
| Grouping by controller when entry has `matchedEndpoint: null` | Low | Fall back to angularService name for group |

## Rollback Plan

All new files. Delete `playwright-adapter/`, revert `cli/src/main.ts`, `core-domain/src/index.ts`, `core-application/src/index.ts`, `scanner/src/index.ts`, `eslint.config.mjs`. No existing behavior changes.

## Success Criteria

- [ ] `node dist/cli/main.js generate --backend lab/backend` exits 0
- [ ] `lab/backend/.qa/tests/ProductsController.spec.ts` exists with `test.describe('ProductsController')`
- [ ] GET and POST entries → active tests with correct `toBe(200)` / `toBe(201)`
- [ ] PUT entry (confidence: none) → `test.skip`
- [ ] All 6 projects pass lint + build + test
