# Design: Day 5 — Playwright Test Generation

## Technical Approach

`GenerateTestsUseCase` reads `route-map.json` via `RouteMapReaderPort`, transforms each entry to a `TestSpec`, then delegates file writing to `TestSuiteWriterPort`. A new Nx lib `playwright-adapter` (mirroring `scanner` structure) implements the writer port. `scanner` gets a new `RouteMapReader` adapter. The CLI gains a `generate` command.

## Architecture Decisions

### Decision: Intermediate TestSpec / TestSuite types

| Option | Choice |
|--------|--------|
| Pass `RouteMap` directly to writer | ✗ Rejected |
| Introduce `TestSpec` / `TestSuite` in `core-domain` | ✓ Chosen |

**Rationale**: Use case owns the transformation logic (status code derivation, skipping). Writer is pure I/O. Day 6 AI layer enriches `TestSuite` independently without touching the writer.

### Decision: playwright-adapter as a new Nx lib (not added to scanner)

| Option | Choice |
|--------|--------|
| Add spec writer to `scanner` | ✗ Rejected — mixes read/write concerns |
| New `playwright-adapter` lib (type:infrastructure) | ✓ Chosen |

**Rationale**: `scanner` owns reading project artifacts. `playwright-adapter` owns generating test code. Same boundary tag, different responsibility. Clean for Day 6 when AI adapter gets its own lib.

### Decision: RouteMapReader goes into scanner

`scanner` already has `ComponentInventoryReader` and `RouteMapWriter`. Reading `.qa/route-map.json` is the same I/O pattern — keeps all `.qa/` file I/O in `scanner`.

## Data Flow

```
CLI: generate --backend <path> [--output <path>]
  │
  ▼
GenerateTestsUseCase.execute({ backendPath, outputPath })
  ├─► FileSystemPort.exists(route-map.json)  → throws GenerateTestsError if missing
  ├─► RouteMapReaderPort.read(backendPath)   → RouteMap
  ├─► transform entries → TestSuite          → pure function in use case
  └─► TestSuiteWriterPort.write(suite, backendPath, outputDir)
        ├─► writes .qa/test-suite.json
        └─► writes .qa/tests/{Controller}.spec.ts per controller group
```

## Interfaces / Contracts

```ts
// core-domain/src/lib/test-spec.ts
interface TestSpec {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  expectedStatus: number;
  confidence: MatchConfidence;
  skipped: boolean;
}
interface TestSuite { generatedAt: string; entries: TestSpec[]; }

// core-application ports
interface RouteMapReaderPort { read(targetDir: string): Promise<RouteMap>; }
interface TestSuiteWriterPort {
  write(suite: TestSuite, backendPath: string, outputDir: string): Promise<void>;
}

// use case input
interface GenerateTestsInput { backendPath: string; outputPath?: string; }
```

Status derivation: `POST → 201`, all others → `200`. `confidence: none → skipped: true`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `core-domain/src/lib/test-spec.ts` | Create | TestSpec, TestSuite |
| `core-domain/src/index.ts` | Modify | re-export new types |
| `core-application/src/lib/ports/route-map-reader.port.ts` | Create | RouteMapReaderPort |
| `core-application/src/lib/ports/test-suite-writer.port.ts` | Create | TestSuiteWriterPort |
| `core-application/src/lib/use-cases/generate-tests.use-case.ts` | Create | GenerateTestsUseCase, GenerateTestsError, GenerateTestsInput |
| `core-application/src/index.ts` | Modify | re-export new items |
| `scanner/src/lib/route-map-reader.adapter.ts` | Create | RouteMapReader implements RouteMapReaderPort |
| `scanner/src/index.ts` | Modify | export RouteMapReader |
| `playwright-adapter/` | Create (Nx lib) | project.json, package.json, tsconfigs, vite.config.ts, eslint.config.mjs |
| `playwright-adapter/src/lib/playwright-spec-writer.ts` | Create | PlaywrightSpecWriter implements TestSuiteWriterPort |
| `playwright-adapter/src/index.ts` | Create | barrel export |
| `cli/src/main.ts` | Modify | add `generate` command |
| `tsconfig.base.json` | Modify | add playwright-adapter path alias |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `GenerateTestsUseCase` — exact/partial/none/empty/missing-file | Vitest, mock ports |
| Unit | `PlaywrightSpecWriter` — file grouping, test.skip, status codes | Vitest, tmp dir |
| Unit | `RouteMapReader` — reads valid JSON, throws on missing | Vitest, tmp dir |

## Migration / Rollout

No migration required. All new files. Existing `scan`, `analyze`, `map` commands unchanged.

## Open Questions

- None
