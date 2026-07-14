# Tasks: Day 4 — Route Mapping

## Phase 1: Domain Types

- [x] 1.1 Create `core-domain/src/lib/route-map.ts` — export `MatchConfidence`, `RouteMapEntry`, `RouteMap`
- [x] 1.2 Update `core-domain/src/index.ts` — re-export the three new types

## Phase 2: Application Ports + Use Case

- [x] 2.1 Create `core-application/src/lib/ports/inventory-reader.port.ts` — `InventoryReaderPort` with `read(targetDir: string): Promise<ComponentInventory>`
- [x] 2.2 Create `core-application/src/lib/ports/route-map-writer.port.ts` — `RouteMapWriterPort` with `write(routeMap: RouteMap, targetDir: string): Promise<void>`
- [x] 2.3 Create `core-application/src/lib/use-cases/build-route-map.use-case.ts` — `BuildRouteMapUseCase`, `RouteMapError`, module-private `normalize()` and `templateToRegex()`
- [x] 2.4 Update `core-application/src/index.ts` — re-export ports, use case, error, and input types

## Phase 3: Scanner Adapters

- [x] 3.1 Create `scanner/src/lib/component-inventory-reader.adapter.ts` — reads and JSON-parses `.qa/component-inventory.json`
- [x] 3.2 Create `scanner/src/lib/route-map-writer.adapter.ts` — creates `.qa/` dir if absent, writes `.qa/route-map.json` (mirror `ComponentInventoryWriter` pattern)
- [x] 3.3 Update `scanner/src/index.ts` — export both new adapters

## Phase 4: CLI Wiring

- [x] 4.1 Update `cli/src/main.ts` — add `map --backend <path>` command, wire to `BuildRouteMapUseCase` via constructor injection

## Phase 5: Unit Tests

- [x] 5.1 Create `core-application/src/lib/use-cases/build-route-map.use-case.spec.ts`:
  - Exact: `GET /api/products` → `GET products` → `confidence: 'exact'`
  - Partial: `GET /api/products/123` → `GET products/:id` → `confidence: 'partial'`
  - No match: `PUT /api/products` with only `PATCH` endpoint → `confidence: 'none'`, `matchedEndpoint: null`
  - Empty: `httpCalls: []` → `entries: []`, no throw
  - Missing inventory: throws `RouteMapError` containing expected file path
- [x] 5.2 Create `scanner/src/lib/component-inventory-reader.adapter.spec.ts` — reads valid JSON from a `tmp` dir
- [x] 5.3 Create `scanner/src/lib/route-map-writer.adapter.spec.ts` — writes `.qa/route-map.json` to a `tmp` dir, verifies content
- [x] 5.4 Run `npx nx run-many -t test --all` — all suites pass

## Phase 6: Verification

- [x] 6.1 Run `npx nx run-many -t lint build --all` — no errors, strict TS compiles clean
- [x] 6.2 Run `node dist/cli/main.js map --backend lab/backend` — exits 0
- [x] 6.3 Assert `lab/backend/.qa/route-map.json` — `GET products` entry has `confidence: 'exact'`; `PUT /api/products` entry has `confidence: 'none'`
