# Design: Day 4 — Route Mapping

## Technical Approach

Introduce a `RouteMap` domain type and a `BuildRouteMapUseCase` that reads the existing `.qa/component-inventory.json` and produces `.qa/route-map.json`. Matching is a **pure function** inside the use case: normalize each Angular `HttpCall.urlPattern`, compare against NestJS endpoints filtered by HTTP method, prefer exact string equality, fall back to a `:param` template regex, otherwise emit `confidence: 'none'`. Follows the same hexagonal shape as Day 3 `AnalyzeProjectUseCase`: `FileSystemPort` for the existence precondition, one reader port for input, one writer port for output, and NO port for the matching algorithm itself.

## Architecture Decisions

| # | Decision | Alternatives Considered | Rationale |
|---|----------|-------------------------|-----------|
| 1 | Matching lives INSIDE `BuildRouteMapUseCase` (no `RouteMapBuilderPort`) | Extract a `RouteMapBuilderPort` adapter | Ports model I/O boundaries. Matching is pure business logic — extracting it would add ceremony without decoupling infrastructure. Testable in-process with plain fixtures. |
| 2 | Exact match wins over partial for the same endpoint (best-match strategy) | First-match; return all candidates | Day 5's generator needs a single deterministic pick. Exact = zero ambiguity; partial only fires when no exact exists. Preserves the strongest signal. |
| 3 | HTTP method is a hard filter (case-insensitive); different method → `none` (never `partial`) | Path-only match with method as separate signal | Spec `Requirement: No Match` mandates strict method contract. A `PUT` Angular call against a `PATCH` NestJS endpoint is a contract mismatch, not a partial success — surfacing it as `none` is the correct signal for Day 5. |
| 4 | `api/` prefix stripped by hardcoded `normalize()` | Read `setGlobalPrefix` from a manifest | Isolated one-liner inside the use case; swap for a `ProjectManifestPort.getGlobalPrefix()` in Day 5+ without touching the algorithm. Keeps Day 4 scope tight. |
| 5 | Two new ports (`InventoryReaderPort`, `RouteMapWriterPort`) — not reusing `InventoryWriterPort` shape via generics | Generic `JsonArtifactWriter<T>` | Explicit types beat clever generics; mirrors existing `InventoryWriterPort` for consistency. Nx boundaries stay obvious. |

## Data Flow

```
    CLI `map --backend <path>`
              │
              ▼
    BuildRouteMapUseCase.execute(backendPath)
              │
              ├── FileSystemPort.exists('.qa/component-inventory.json') ── throw if false
              │
              ├── InventoryReaderPort.read(backendPath) ─────────────► ComponentInventory
              │
              ├── PURE: for each service.httpCalls[] →
              │     normalize(url) → filterByMethod(endpoints) →
              │     tryExact() ?? tryTemplateRegex() ?? none
              │
              └── RouteMapWriterPort.write(routeMap, backendPath) ────► .qa/route-map.json
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `core-domain/src/lib/route-map.ts` | Create | `MatchConfidence`, `RouteMapEntry`, `RouteMap` types |
| `core-domain/src/index.ts` | Modify | Re-export new types |
| `core-application/src/lib/ports/inventory-reader.port.ts` | Create | `InventoryReaderPort` interface |
| `core-application/src/lib/ports/route-map-writer.port.ts` | Create | `RouteMapWriterPort` interface |
| `core-application/src/lib/use-cases/build-route-map.use-case.ts` | Create | `BuildRouteMapUseCase` + `RouteMapError` + `normalize()` + `templateToRegex()` |
| `core-application/src/index.ts` | Modify | Re-export ports, use case, error, input type |
| `scanner/src/lib/component-inventory-reader.adapter.ts` | Create | Reads & JSON-parses `.qa/component-inventory.json` |
| `scanner/src/lib/route-map-writer.adapter.ts` | Create | Mirrors `ComponentInventoryWriter` — writes `.qa/route-map.json` |
| `scanner/src/index.ts` | Modify | Export the two new adapters |
| `cli/src/main.ts` | Modify | Add `map` command wired to the use case |

Total: 7 new, 4 modified.

## Interfaces / Contracts

```ts
// core-domain/src/lib/route-map.ts
export type MatchConfidence = 'exact' | 'partial' | 'none';

export interface RouteMapEntry {
  angularService: string;
  httpCall: HttpCall;
  matchedEndpoint: { controller: string; endpoint: NestEndpoint } | null;
  confidence: MatchConfidence;
}

export interface RouteMap {
  mappedAt: string;
  entries: RouteMapEntry[];
}

// core-application ports
export interface InventoryReaderPort {
  read(targetDir: string): Promise<ComponentInventory>;
}
export interface RouteMapWriterPort {
  write(routeMap: RouteMap, targetDir: string): Promise<void>;
}
```

Matching helpers (pure, module-private):

```ts
function normalize(urlPattern: string): string {
  return urlPattern.replace(/^\//, '').replace(/^api\//, '');
}
function templateToRegex(nestPath: string): RegExp {
  return new RegExp(`^${nestPath.replace(/:[^/]+/g, '[^/]+')}$`);
}
```

Method comparison uses `.toUpperCase()` on both sides before equality (case-insensitive per spec).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — domain | Type shape only (compile-time) | No runtime tests; types are structural |
| Unit — use case | `normalize`, `templateToRegex`, exact-wins-over-partial, method mismatch → `none`, empty `httpCalls` → empty `entries`, missing inventory → `RouteMapError` | Vitest with in-memory stub `FileSystemPort` + `InventoryReaderPort` fixtures; spy `RouteMapWriterPort` |
| Unit — adapters | `ComponentInventoryReader` parses valid JSON; `RouteMapWriter` creates `.qa/` dir + file | Vitest with `tmp` dirs (mirror existing `ComponentInventoryWriter` tests) |
| Integration — CLI | `qa-tester map --backend <lab>` produces expected `.qa/route-map.json` against the fixture lab | Existing lab fixtures; assert JSON shape + confidences |

Covers all six spec scenarios (Exact, Partial, No Match, Full Coverage empty, Output File, Prerequisite Validation).

## Migration / Rollout

No migration required. Day 5 consumer does not exist yet; `.qa/route-map.json` is greenfield. Rollback = delete new files + revert three edits (per proposal).

## Open Questions

None. Algorithm, ports, and file layout are fully specified by the proposal and spec.
