# Exploration: Day 5 — Playwright Test Generation

## Current State

The pipeline produces three artifacts in `.qa/` per analyzed project:
- `project-manifest.json` — framework detection (Day 2)
- `component-inventory.json` — AST analysis: Angular components/services + NestJS controllers/DTOs (Day 3)
- `route-map.json` — Angular HttpCalls ↔ NestJS endpoints with confidence: exact | partial | none (Day 4)

CLI commands so far: `scan`, `analyze`, `map`.

Domain types: `RouteMap`, `RouteMapEntry`, `MatchConfidence`, `ComponentInventory`, etc.

`playwright-adapter` lib is mentioned in `openspec/config.yaml` but does NOT exist yet.

## Affected Areas

- `core-domain/src/lib/` — new file `test-spec.ts` (TestSpec, TestSuite)
- `core-domain/src/index.ts` — re-export new types
- `core-application/src/lib/ports/` — two new ports (RouteMapReaderPort, TestSuiteWriterPort)
- `core-application/src/lib/use-cases/` — new use case (GenerateTestsUseCase)
- `core-application/src/index.ts` — re-export new items
- `scanner/src/lib/` — new adapter RouteMapReader (reads `.qa/route-map.json`)
- `scanner/src/index.ts` — export new adapter
- `playwright-adapter/` — **new Nx lib**, type:infrastructure
- `cli/src/main.ts` — new `generate` command
- `eslint.config.mjs` — add playwright-adapter to module boundary rules

## Approaches

### Approach A: Pass RouteMap directly to writer (no new domain type)
- Pros: fewer files, simpler
- Cons: couples test generation concern to route map format; blocks Day 6 AI enrichment
- Effort: Low

### Approach B: Introduce TestSpec / TestSuite domain types (recommended)
- Pros: clean separation — GenerateTestsUseCase transforms RouteMap → TestSuite; playwright-adapter writes TestSuite → .spec.ts; Day 6 AI layer can enrich TestSuite independently
- Cons: one extra domain type
- Effort: Low-Medium

## Recommendation

**Approach B.** The transformation `RouteMap → TestSuite` belongs in the use case, not in the adapter. This mirrors the Day 3/4 pattern where the use case owns the business logic and adapters are pure I/O.

### TestSpec shape

```ts
interface TestSpec {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;       // full path, e.g. "products/:id"
  expectedStatus: number; // derived from method: GET→200, POST→201, PUT/PATCH→200, DELETE→200
  confidence: MatchConfidence;
  skipped: boolean;       // true when confidence === 'none'
}

interface TestSuite {
  generatedAt: string;
  entries: TestSpec[];
}
```

### Generation rules (template-based, no AI in Day 5)

| Method  | Expected status | Notes                     |
|---------|-----------------|---------------------------|
| GET     | 200             |                           |
| POST    | 201             |                           |
| PUT     | 200             |                           |
| PATCH   | 200             |                           |
| DELETE  | 200             |                           |
| any (confidence: none) | — | test.skip + comment |

### Playwright spec template

```ts
import { test, expect } from '@playwright/test';

test.describe('ProductsController', () => {
  test('GET products — exact', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
  });

  test('POST products — exact', async ({ request }) => {
    const response = await request.post('/api/products', { data: {} });
    expect(response.status()).toBe(201);
  });

  test.skip('PUT /api/products — no matching endpoint (confidence: none)', async ({ request }) => {
    // Contract gap: no PUT endpoint found in backend
  });
});
```

### New CLI command

```
node dist/cli/main.js generate --backend <path> [--output <path>]
```

- `--backend` path contains `.qa/route-map.json`
- `--output` optional, defaults to `<backend>/.qa/tests/`
- Writes: `<output>/<controller-name>.spec.ts` per controller group + `.qa/test-suite.json`

### playwright-adapter Nx lib

- Tag: `type:infrastructure`
- Depends on: `core-domain` (TestSuite type), `core-application` (TestSuiteWriterPort)
- ESLint boundary: can import from `type:application` and `type:domain`
- No Playwright runtime dependency needed (generates `.spec.ts` files as strings; does NOT run tests)

## Risks

- Nx module boundaries: `playwright-adapter` needs to be added to `eslint.config.mjs` with correct tags — same pattern as `scanner` (learned from Day 3 boundary violation fix)
- `@nx/dependency-checks`: `playwright-adapter/package.json` must list `@ai-web-qa-tester/core-domain` and `@ai-web-qa-tester/core-application` explicitly — same gotcha as scanner
- `cli/package.json` still doesn't exist (known non-critical issue from Day 3) — `copy-workspace-modules` will fail but Node resolution still works

## Ready for Proposal

Yes. Scope is well-defined, all risks are known, follows established patterns from Days 2–4.
