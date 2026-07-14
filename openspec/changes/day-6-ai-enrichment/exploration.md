# Exploration: Day 6 — AI Test Enrichment

## Current State

Day 5 generates Playwright `.spec.ts` files with template-based assertions only:
- `expect(response.status()).toBe(200)` — status code only
- No request body for POST/PUT/PATCH
- No response body assertions
- No error/edge-case test cases

Data available for enrichment:
- `TestSpec`: method, endpoint, confidence, controllerName
- `ComponentInventory`: NestJS DTOs with fields (`CreateProductDto: name, price`)
- `RouteMap`: full Angular↔NestJS mapping context

Neither `zod` nor `@anthropic-ai/sdk` are installed. `ai-orchestrator` lib does NOT exist.

## Affected Areas

- `core-domain/src/lib/test-spec.ts` — add optional `requestBody`, `responseAssertions` fields
- `core-domain/src/lib/ai-provider.ts` — new: `AiProvider` interface
- `core-domain/src/index.ts` — re-export new types
- `core-application/src/lib/ports/ai-enricher.port.ts` — new: `AiEnricherPort`
- `core-application/src/lib/use-cases/generate-tests.use-case.ts` — accept optional `AiEnricherPort`
- `core-application/src/index.ts` — re-export new items
- `ai-orchestrator/` — **new Nx lib** (type:infrastructure): `AnthropicProvider`, `AiEnricher`
- `playwright-adapter/src/lib/playwright-spec-writer.ts` — use `requestBody` + `responseAssertions` when present
- `cli/src/main.ts` — add `--enrich` flag to `generate` command

## Approaches

### Approach A: Enrich inside GenerateTestsUseCase (Strategy pattern)

`GenerateTestsUseCase` receives an optional `AiEnricherPort`. If provided and spec is not skipped, it enriches each `TestSpec` asynchronously before writing. Falls back to template spec on AI error.

- Pros: single use case, no new orchestration needed, clean dependency injection
- Cons: use case becomes async-heavier; harder to parallelize per-spec in the future
- Effort: Medium

### Approach B: Separate EnrichTestsUseCase (pipeline step)

A new use case takes `TestSuite` → returns enriched `TestSuite`. CLI chains: `generate` then `enrich`.

- Pros: fully independent, easier to test, can be skipped cleanly
- Cons: adds a CLI step, doubles files, overkill for Day 6 MVP
- Effort: High

## Recommendation

**Approach A.** Strategy pattern. `AiEnricherPort` is injected into `GenerateTestsUseCase`. When `--enrich` flag is absent, CLI passes `null` → current Day 5 behavior preserved. When `--enrich` is active, CLI injects `AiEnricher`. Zero breaking changes.

### AiEnricherPort contract

```ts
interface AiEnricherPort {
  enrich(spec: TestSpec, dtos: NestDto[]): Promise<Partial<TestSpec>>;
}
```

### EnrichedTestSpec additions (optional fields on existing TestSpec)

```ts
requestBody?: Record<string, unknown>;   // sample payload for POST/PUT/PATCH
responseAssertions?: string[];           // e.g. ["expect(body).toHaveProperty('id')"]
```

### Zod schema for AI output validation

```ts
const EnrichmentSchema = z.object({
  requestBody: z.record(z.unknown()).optional(),
  responseAssertions: z.array(z.string()).max(5).optional(),
});
```

### Sample AI prompt (for POST /api/products)

```
API endpoint: POST /api/products — expected status 201
Related DTO: CreateProductDto — fields: name (string), price (number)

Return ONLY valid JSON:
{ "requestBody": {...}, "responseAssertions": ["expect(body).toHaveProperty('id')"] }
```

### PlaywrightSpecWriter update

- If `spec.requestBody` present → inject into request call instead of `{ data: {} }`
- If `spec.responseAssertions` present → add `const body = await response.json();` + each assertion line

## Risks

- `ANTHROPIC_API_KEY` env var must be set at runtime — CLI should emit a clear error if missing
- AI output may not parse as valid JSON → Zod catches it, fallback to unenriched spec
- Slow: each AI call adds ~1-3s per spec → Day 6 is sequential (no parallelism), acceptable for MVP
- `@nx/dependency-checks`: ai-orchestrator/package.json must list core-domain, core-application, zod, @anthropic-ai/sdk

## Ready for Proposal

Yes. Scope is well-defined and bounded. Two new npm packages needed: `zod`, `@anthropic-ai/sdk`.
