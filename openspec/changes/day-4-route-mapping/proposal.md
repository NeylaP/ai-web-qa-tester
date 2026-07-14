# Proposal: Day 4 — Route Mapping

## Intent

After Day 3, the `ComponentInventory` holds Angular `HttpCall`s and NestJS
`NestEndpoint`s as two disconnected lists. There is no link between an Angular
`GET /api/products` call and its NestJS `@Get()` handler. Day 5's test
generation needs that link — with a confidence signal so the generator can
distinguish safe cases from ambiguous ones and outright contract mismatches
(e.g. Angular `PUT` where NestJS only exposes `PATCH`).

## Scope

### In Scope
- `RouteMap` / `RouteMapEntry` domain types with `exact | partial | none` confidence
- `BuildRouteMapUseCase` — pure matching algorithm (normalize URL, exact match, `:param` regex fallback)
- `InventoryReaderPort` + adapter reading `.qa/component-inventory.json`
- `RouteMapWriterPort` + adapter writing `.qa/route-map.json`
- CLI `map --backend <path>` command wired via constructor injection

### Out of Scope
- Angular template-literal URLs (`` `${baseUrl}/products/${id}` ``) — only static strings for MVP
- Configurable global prefix — `api/` strip stays hardcoded until Day 5+ manifest work
- Levenshtein / fuzzy matching — high false-positive risk, deferred
- Consuming the RouteMap (that's Day 5)

## Capabilities

### New Capabilities
- `route-mapping`: Connects Angular HTTP calls to NestJS endpoints via URL normalization and template-regex matching, emitting a `RouteMap` with per-entry confidence (`exact` / `partial` / `none`) written to `.qa/route-map.json`.

### Modified Capabilities
- None. `project-scanning` and `component-inventory` are consumed read-only.

## Approach

Approach 2 from exploration: **exact string match + NestJS `:param` template regex**.
Matching is a pure function inside `BuildRouteMapUseCase` — no `RouteMapBuilderPort`,
since ports are I/O boundaries only. Normalization strips leading `/` and hardcoded
`api/` prefix. Best-match wins: `exact` beats `partial`; unmatched → `confidence: 'none'`,
`matchedEndpoint: null`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `core-domain/src/lib/route-map.ts` | New | `RouteMapEntry`, `RouteMap` types |
| `core-application/src/lib/ports/` | New | `InventoryReaderPort`, `RouteMapWriterPort` |
| `core-application/src/lib/use-cases/build-route-map.use-case.ts` | New | Matching algorithm |
| `scanner/src/lib/` | New | Reader + writer adapters (2 files) |
| `cli/src/main.ts` | Modified | Add `map` command |
| `core-domain`, `core-application`, `scanner` barrel files | Modified | Export new symbols |

Total: 7 new files + 3 edits — well under the 20-file PR threshold.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hardcoded `api/` prefix breaks if project changes NestJS `setGlobalPrefix` | Medium | Isolate in `normalize()`; Day 5+ reads from `.qa/project-manifest.json` |
| Template-literal Angular URLs (`${id}`) produce unmatched `none` | Low (lab uses static strings) | Documented; Day 5 matcher will treat `${...}` as wildcard |
| Method mismatches (Angular `PUT` vs NestJS `PATCH`) confuse Day 5 | Low | This is a *feature* — surfaces contract drift; Day 5 must handle `none` gracefully |

## Rollback Plan

Delete `openspec/changes/day-4-route-mapping/` and the 7 new files; revert the 3
barrel/CLI edits. Nothing at rest depends on `.qa/route-map.json` yet (Day 5
consumer does not exist), so removing the file has no downstream impact.

## Dependencies

- Day 2 `project-scanning` and Day 3 `component-inventory` capabilities must be present
- `.qa/component-inventory.json` must exist in the backend target (produced by `analyze`)

## Success Criteria

- [ ] `qa-tester map --backend <lab>` writes valid `.qa/route-map.json`
- [ ] Lab `GET /api/products` → `confidence: 'exact'` against `GET products`
- [ ] Lab `PUT /api/products` → `confidence: 'none'` (no PUT endpoint exposed)
- [ ] Parameterized route (`orders/:id`) matches Angular `/api/orders/1` as `partial`
- [ ] All new code compiles with strict TS; no framework imports in `core-domain` or `core-application`
