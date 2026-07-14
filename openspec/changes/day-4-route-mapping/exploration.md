## Exploration: day-4-route-mapping

### Current State

After Day 3 the system can produce a `ComponentInventory` written to
`{backendPath}/.qa/component-inventory.json`.  That file holds:

- `angular.services[].httpCalls[]` — each with `{ method, urlPattern }`.
  Example from the lab: `GET /api/products`, `POST /api/products`, `PUT /api/products`.
- `nestjs.controllers[].endpoints[]` — each with `{ method, path }`.
  Example from the lab: `GET products`, `GET products/:id`, `POST products`,
  `PATCH products/:id`, `DELETE products/:id`.

There is no link between the two sides yet.  The `HttpCall.urlPattern` uses a
full URL path (`/api/products`) while `NestEndpoint.path` uses the controller-
relative path (`products`, `products/:id`).  Bridging this gap is Day 4's goal.

All existing code follows Clean/Hexagonal architecture:

| Boundary | Artifact |
|---|---|
| Domain types | `core-domain` — no deps on frameworks |
| Use-case logic + port interfaces | `core-application` |
| I/O adapters | `scanner` (Node.js / ts-morph) |
| CLI wiring | `cli` — Commander, constructor-injects adapters |

Existing port/adapter pairs that set the pattern:
- `InventoryWriterPort` ↔ `ComponentInventoryWriter` (writes `component-inventory.json`)
- `InventoryAnalyzerPort<T>` ↔ `TsMorphAngularAnalyzer` / `TsMorphNestAnalyzer`
- `FileSystemPort` ↔ `NodeFileSystemAdapter`

---

### Affected Areas

- `core-domain/src/lib/route-map.ts` — NEW: `RouteMapEntry`, `RouteMap` types
- `core-domain/src/index.ts` — EDIT: export new types
- `core-application/src/lib/ports/inventory-reader.port.ts` — NEW: `InventoryReaderPort`
- `core-application/src/lib/ports/route-map-writer.port.ts` — NEW: `RouteMapWriterPort`
- `core-application/src/lib/use-cases/build-route-map.use-case.ts` — NEW: `BuildRouteMapUseCase`
- `core-application/src/index.ts` — EDIT: export new ports and use case
- `scanner/src/lib/component-inventory-reader.adapter.ts` — NEW: reads `component-inventory.json`
- `scanner/src/lib/route-map-writer.adapter.ts` — NEW: writes `route-map.json`
- `scanner/src/index.ts` — EDIT: export new adapters
- `cli/src/main.ts` — EDIT: add `map` command

Total: **7 new files + 3 edits** — well under the 20-file PR threshold.

---

### URL Normalization

The fundamental mismatch between the two sides:

```
Angular HttpCall.urlPattern : '/api/products'      (full HTTP path)
NestEndpoint.path           : 'products'           (controller-relative)
NestEndpoint.path (param)   : 'products/:id'
```

Normalization function (pure, lives in the use case):

```
normalizeAngularUrl('/api/products')  →  'products'
normalizeAngularUrl('/api/orders/1')  →  'orders/1'

steps:
  1. strip leading '/'
  2. strip 'api/' prefix (hardcoded for MVP; configurable later)
```

---

### Approaches

#### 1. Exact-only string comparison
After normalizing the Angular URL, compare with `===` against each NestJS path.

- Pros: trivial to implement, zero false positives
- Cons: never matches parameterized routes (`products/:id`); angular usually calls
  `/api/products/123`, not the template literal — so this would mark all param routes
  as `none`, hiding real matches
- Effort: Low

#### 2. Exact + NestJS-template regex (recommended)
Normalize Angular URL, then:

1. Attempt `===` against each candidate NestJS path → `exact`
2. Convert NestJS `:param` segments to `[^/]+` regex, test normalized URL → `partial`
3. Fallback prefix check (e.g. `products` is prefix of `products/:id`) → `partial`
4. No match on any method-matching endpoint → `confidence: 'none'`, `matchedEndpoint: null`

Selection rule: take the best match — `exact` beats `partial`; within `partial` take
the first. Only one `RouteMapEntry` per `HttpCall` (the winner).

Concrete exercise on lab data:

| Angular call | Normalized | NestJS endpoint | Method ✓ | Path result | Confidence |
|---|---|---|---|---|---|
| `GET /api/products` | `products` | `GET products` | ✓ | `===` | **exact** |
| `GET /api/products` | `products` | `GET products/:id` | ✓ | prefix | partial (not chosen — exact wins) |
| `POST /api/products` | `products` | `POST products` | ✓ | `===` | **exact** |
| `PUT /api/products` | `products` | *(no PUT endpoint)* | ✗ | — | **none** |

The `PUT` → `none` is a real finding: Angular uses `PUT` while NestJS only exposes `PATCH`.
This surfaces an API contract mismatch — exactly what a QA tool should catch.

- Pros: catches parameterized routes; correctly ranks exact over partial; surfaces mismatches
- Cons: small amount of regex handling; `api/` prefix hardcoded (acceptable for MVP)
- Effort: Low–Medium

#### 3. Levenshtein / fuzzy distance
Score every (normalized Angular URL, NestJS path) pair by edit distance; pick the closest.

- Pros: resilient to minor naming variations
- Cons: high false-positive risk (`orders` and `order` score close); adds a dependency or
  non-trivial implementation; wrong tool for structured path comparison
- Effort: High

---

### New Types (core-domain)

```ts
// core-domain/src/lib/route-map.ts

export interface RouteMapEntry {
  angularService: string;           // e.g. 'ProductsService'
  httpCall: HttpCall;               // { method: 'GET', urlPattern: '/api/products' }
  matchedEndpoint: {
    controller: string;             // e.g. 'ProductsController'
    endpoint: NestEndpoint;         // { method: 'GET', path: 'products' }
  } | null;
  confidence: 'exact' | 'partial' | 'none';
}

export interface RouteMap {
  mappedAt: string;                 // ISO 8601
  entries: RouteMapEntry[];
}
```

---

### New Ports (core-application)

```ts
// inventory-reader.port.ts
export interface InventoryReaderPort {
  read(targetDir: string): Promise<ComponentInventory>;
}

// route-map-writer.port.ts
export interface RouteMapWriterPort {
  write(routeMap: RouteMap, targetDir: string): Promise<void>;
}
```

No `RouteMapBuilderPort` — the matching algorithm is pure business logic (no I/O).
Ports are I/O boundaries only; using a port for a pure function would contradict the
architecture principle established in Days 1–3.

---

### BuildRouteMapUseCase sketch

```ts
export class BuildRouteMapUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly reader: InventoryReaderPort,
    private readonly writer: RouteMapWriterPort,
  ) {}

  async execute(input: { backendPath: string }): Promise<RouteMap> {
    const backendAbs = path.resolve(input.backendPath);
    const inventoryPath = path.join(backendAbs, '.qa', 'component-inventory.json');

    if (!this.fs.exists(inventoryPath)) {
      throw new BuildRouteMapError(`component-inventory.json not found — run 'analyze' first`);
    }

    const inventory = await this.reader.read(backendAbs);
    const entries = this.buildEntries(inventory);
    const routeMap: RouteMap = { mappedAt: new Date().toISOString(), entries };

    await this.writer.write(routeMap, backendAbs);
    return routeMap;
  }

  private buildEntries(inventory: ComponentInventory): RouteMapEntry[] { ... }
  private normalize(urlPattern: string): string { ... }
  private match(normalized: string, endpoints: NestEndpoint[]): ... { ... }
}
```

---

### CLI `map` command sketch

```
qa-tester map --backend <path>
```

Only `--backend` is required (the inventory is there; Angular path is not needed for
matching since the inventory already holds all HTTP calls).

---

### Recommendation

**Approach 2 (Exact + NestJS-template regex).**

Reasons:
1. Correct treatment of I/O vs. pure logic boundaries — matching stays inside the use case.
2. The three-tier confidence (`exact` / `partial` / `none`) directly maps to Day 5's test
   generation needs: `exact` = high-confidence test, `partial` = needs review, `none` = gap.
3. Minimal new surface area — 2 new ports, 1 new use case, 2 new adapters.
4. The `api/` strip is one line; making it configurable (from `openspec/config.yaml` or
   `.qa/project-manifest.json`) is a natural Day 5+ extension without touching the domain.

---

### Risks

- **Angular template literals**: If `TsMorphAngularAnalyzer` extracts HTTP URLs from
  template strings (e.g. `` `${baseUrl}/products/${id}` ``), `urlPattern` may contain
  `${...}` placeholders rather than `:param` notation.  The current lab inventory only
  has static strings, so this does not block Day 4, but the matching algorithm should
  treat any unrecognized `${...}` segment as a wildcard for partial matching in Day 5.

- **NestJS global prefix**: The actual HTTP route is `/api/products` because `main.ts`
  calls `app.setGlobalPrefix('api')`.  The scanner captures only `@Controller('products')`
  → `basePath: 'products'`.  The `api/` strip in normalization compensates, but if the
  prefix changes (or is absent), mappings break.  The global prefix should eventually be
  read from `.qa/project-manifest.json` rather than hardcoded.

- **Method mismatch surfacing** (`PUT` → no endpoint): This is a feature, not a bug.
  Day 5's test generation must handle `confidence: 'none'` entries gracefully (skip or
  warn), not crash.

---

### Ready for Proposal

Yes.  The scope is well-bounded, the new files follow established patterns exactly, and
the matching algorithm is simple enough to implement and test in one session.  Move to
`sdd-propose` → `sdd-spec` → `sdd-design` → `sdd-tasks` → `sdd-apply`.
