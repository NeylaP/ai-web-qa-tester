# Design: Day 6 — AI Test Enrichment

## Technical Approach

Strategy pattern. `GenerateTestsUseCase` accepts an optional 4th argument `AiEnricherPort | null`. When null (no `--enrich` flag), the use case behaves identically to Day 5. When injected, it calls `enrich(spec, dtos)` for each non-skipped spec, merging the returned partial fields into the TestSpec. A new Nx lib `ai-orchestrator` (type:infrastructure) implements the port using `@anthropic-ai/sdk` and validates AI output with Zod.

## Architecture Decisions

### Decision: AiProvider in core-domain vs core-application

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `AiProvider` in `core-domain` | domain layer stays pure — no SDK refs | ✓ Chosen |
| `AiProvider` in `core-application` | mixed concerns with business logic | ✗ Rejected |

**Rationale**: `AiProvider` is a generic LLM abstraction with no domain concepts. Domain layer is the right place for pure interfaces without NestJS/Angular/SDK coupling.

### Decision: AiEnricherPort in core-application (not domain)

`AiEnricherPort` signature is `enrich(spec: TestSpec, dtos: NestDto[]): Promise<Partial<TestSpec>>`. It knows domain types (`TestSpec`, `NestDto`), so it belongs in `core-application`, not `core-domain`.

### Decision: Optional 4th constructor param vs separate use case

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Optional `AiEnricherPort` in `GenerateTestsUseCase` | no new orchestration, zero breaking changes | ✓ Chosen |
| Separate `EnrichTestsUseCase` | cleaner isolation but adds CLI chaining complexity | ✗ Rejected |

**Rationale**: Day 5 behavior must remain unchanged when flag is absent. Optional injection achieves this with minimal code change.

### Decision: Silent fallback on AI failure

AI errors (network, parse, Zod validation) MUST NOT surface to the user. `AiEnricher.enrich()` catches all errors and returns `{}` (empty partial). The use case merges `{}` into the spec, leaving it unchanged.

## Data Flow

```
CLI: generate --backend <path> --enrich
  │
  ├─► check ANTHROPIC_API_KEY env var → error if missing
  │
  └─► GenerateTestsUseCase.execute({ backendPath, outputPath }, aiEnricher)
        ├─► RouteMapReaderPort.read()  → RouteMap
        ├─► FOR EACH entry:
        │     toTestSpec(entry) → TestSpec (base)
        │     IF !skipped AND aiEnricher:
        │       AiEnricherPort.enrich(spec, inventory.nestjs.dtos)
        │         → AnthropicProvider.complete(prompt)
        │         → parse JSON → Zod.parse() → Partial<TestSpec>
        │         → on fail: return {}
        │       merge partial into TestSpec
        ├─► TestSuiteWriterPort.write(suite, backendPath, outputDir)
        │     PlaywrightSpecWriter: use requestBody/responseAssertions if present
        └─► return TestSuite
```

Note: `GenerateTestsUseCase` also needs `ComponentInventory` to get DTO context for the AI prompt. A new `InventoryReaderPort.read()` call is added (already exists in scanner as `ComponentInventoryReader`).

## Interfaces / Contracts

```ts
// core-domain/src/lib/ai-provider.ts
interface AiProvider { complete(prompt: string): Promise<string>; }

// core-application/src/lib/ports/ai-enricher.port.ts
interface AiEnricherPort {
  enrich(spec: TestSpec, dtos: NestDto[]): Promise<Partial<TestSpec>>;
}

// Zod schema inside AiEnricher (ai-orchestrator)
const EnrichmentSchema = z.object({
  requestBody: z.record(z.unknown()).optional(),
  responseAssertions: z.array(z.string()).max(5).optional(),
});
```

`GenerateTestsUseCase` constructor: `(fs, reader, writer, inventory, aiEnricher?: AiEnricherPort | null)`
Adding `inventory: InventoryReaderPort` as 4th param (shifts `aiEnricher` to 5th).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `core-domain/src/lib/ai-provider.ts` | Create | AiProvider interface |
| `core-domain/src/lib/test-spec.ts` | Modify | add requestBody?, responseAssertions? |
| `core-domain/src/index.ts` | Modify | re-export AiProvider |
| `core-application/src/lib/ports/ai-enricher.port.ts` | Create | AiEnricherPort |
| `core-application/src/lib/use-cases/generate-tests.use-case.ts` | Modify | optional AiEnricherPort + InventoryReaderPort |
| `core-application/src/index.ts` | Modify | re-export AiEnricherPort |
| `ai-orchestrator/` | Create (Nx lib) | project.json, package.json, tsconfigs, vite.config, eslint |
| `ai-orchestrator/src/lib/anthropic-provider.ts` | Create | AnthropicProvider implements AiProvider |
| `ai-orchestrator/src/lib/ai-enricher.adapter.ts` | Create | AiEnricher implements AiEnricherPort |
| `ai-orchestrator/src/index.ts` | Create | barrel export |
| `playwright-adapter/src/lib/playwright-spec-writer.ts` | Modify | use requestBody, responseAssertions |
| `cli/src/main.ts` | Modify | --enrich flag, ANTHROPIC_API_KEY check |
| `tsconfig.base.json` | Modify | ai-orchestrator path alias |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AiEnricher` — valid response, invalid JSON, network error, skipped spec bypass | Vitest, mock AiProvider |
| Unit | `GenerateTestsUseCase` — with/without enricher, enriched fields in output | Vitest, mock all ports |
| Unit | `PlaywrightSpecWriter` — requestBody in request call, responseAssertions lines | Vitest, tmp dir |

## Migration / Rollout

No migration required. `--enrich` is opt-in. Existing CLI usage unchanged.

## Open Questions

- None
