# Design: Day 3 — AST-based Component Inventory Analysis

## Technical Approach

Layer a new capability on top of Day 2's hexagonal architecture: a `ComponentInventory` domain entity in `core-domain`, two ports + one use case in `core-application`, three `ts-morph` adapters in `scanner`, and one new `analyze` command in `cli`. The use case takes already-resolved absolute paths, validates preconditions via `FileSystemPort`, invokes two `InventoryAnalyzerPort` adapters in parallel, assembles the `ComponentInventory`, and delegates persistence to `InventoryWriterPort`. This mirrors the exact orchestration shape of `ScanProjectUseCase` (validate → `Promise.all` → write).

## Architecture Decisions

### Decision: One shared `InventoryAnalyzerPort`, two adapters

**Choice**: A single port interface with a discriminated-union return type; `TsMorphAngularAnalyzer` and `TsMorphNestAnalyzer` are two separate implementations.
**Alternatives considered**: Two distinct port interfaces (`AngularAnalyzerPort`, `NestAnalyzerPort`).
**Rationale**: A shared shape lets the use case call both via `Promise.all` symmetrically. The use case constructs each adapter explicitly at the composition root, so the concrete return shape is known at each call site — no runtime discrimination needed. Fewer surface types to export from `core-application/src/index.ts`; consistent with the single `ProjectScannerPort` from Day 2.

### Decision: Fresh `ts-morph` `Project` per adapter invocation (stateless adapters)

**Choice**: Each `analyze()` call constructs a new `Project({ tsConfigFilePath })`.
**Alternatives considered**: Cache one `Project` per absolute path across calls; share one `Project` across frontend + backend.
**Rationale**: Stateless adapters mirror `PackageJsonDetector` — no hidden state across CLI invocations. Sharing across frontend + backend is impossible (different tsconfigs). Caching yields nothing for a single-shot CLI and adds an invalidation surface. A future watch mode can introduce caching without changing the port contract.

### Decision: Path normalization inside the adapter, relative to project root

**Choice**: Adapters normalize every `sourceFile.getFilePath()` by replacing `\` with `/` and computing `path.relative(projectRoot, abs).replace(/\\/g, '/')`. Project root = `process.cwd()` at CLI invocation, injected into the adapter.
**Alternatives considered**: Normalize in the writer; keep absolute paths in the entity.
**Rationale**: `ts-morph` returns POSIX paths on Linux/macOS but mixed backslash paths on Windows. Normalizing at the adapter boundary keeps the domain entity portable — no filesystem sigils leak into JSON. Relative-to-CWD satisfies the spec's "relative to project root" requirement and stays stable across dev machines. The writer stays dumb: serialize only.

### Decision: Route extraction limited to literal `path` values in route array literals

**Choice**: Walk `RouterModule.forRoot([...])` / `forChild([...])` call expressions and extract only string-literal `path` values from route object literals. Skip children, `redirectTo`, and any non-literal `path`.
**Alternatives considered**: Full nested route flattening; template-literal resolution.
**Rationale**: Spec is SHOULD (not MUST); dynamic routes are explicitly out of scope. Literal-only extraction is deterministic, matches the lab fixture, and keeps `angular.routes` extensible later without a schema break.

## Data Flow

    CLI `analyze` ──→ AnalyzeProjectUseCase.execute({ frontendPath, backendPath })
                              │
                              ├─→ FileSystemPort.exists  (manifest + tsconfigs)
                              │
                              ├─→ Promise.all([
                              │     TsMorphAngularAnalyzer.analyze(frontendAbs, feTsConfig),
                              │     TsMorphNestAnalyzer.analyze(backendAbs,  beTsConfig),
                              │   ])
                              │
                              └─→ ComponentInventoryWriter.write(inventory, backendAbs)
                                              │
                                              └─→ `<backendPath>/.qa/component-inventory.json`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `core-domain/src/lib/component-inventory.ts` | Create | `HttpCall`, `AngularComponent`, `AngularService`, `NestEndpoint`, `NestController`, `NestService`, `NestDto`, `ComponentInventory` |
| `core-domain/src/index.ts` | Modify | Export the new types |
| `core-application/src/lib/ports/inventory-analyzer.port.ts` | Create | `InventoryAnalyzerPort` |
| `core-application/src/lib/ports/inventory-writer.port.ts` | Create | `InventoryWriterPort` |
| `core-application/src/lib/use-cases/analyze-project.use-case.ts` | Create | `AnalyzeProjectUseCase` + `AnalysisError` |
| `core-application/src/index.ts` | Modify | Export ports, use case, error, input type |
| `scanner/src/lib/ts-morph-angular-analyzer.ts` | Create | Angular adapter |
| `scanner/src/lib/ts-morph-nest-analyzer.ts` | Create | NestJS adapter |
| `scanner/src/lib/component-inventory-writer.ts` | Create | Writes `.qa/component-inventory.json` |
| `scanner/src/index.ts` | Modify | Export new adapters |
| `cli/src/main.ts` | Modify | Register `analyze` command |
| `package.json` (root) | Modify | Add `ts-morph` runtime dependency |

## Interfaces / Contracts

```ts
export interface InventoryAnalyzerPort {
  analyze(
    absolutePath: string,
    tsConfigPath: string,
  ): Promise<
    | { components: AngularComponent[]; services: AngularService[]; routes: string[] }
    | { controllers: NestController[]; services: NestService[]; dtos: NestDto[] }
  >;
}

export interface InventoryWriterPort {
  write(inventory: ComponentInventory, targetDir: string): Promise<void>;
}

export class AnalysisError extends Error { name = 'AnalysisError'; }

export interface AnalyzeProjectInput {
  frontendPath: string;
  backendPath: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Angular adapter against `lab/frontend` fixture | Vitest — assert counts of components/services, literal HTTP calls captured, non-literal calls ignored, forward-slash paths |
| Unit | Nest adapter against `lab/backend` fixture | Vitest — assert 5 endpoints combined from `@Controller` + method decorators, empty `basePath` handled, DTO fields extracted |
| Unit | `AnalyzeProjectUseCase` orchestration | Fake `FileSystemPort` + stub analyzers/writer — verify `AnalysisError` thrown per validation branch |
| Integration | Full CLI run against `lab/` | `pnpm analyze --frontend lab/frontend --backend lab/backend`; assert JSON shape matches spec success criteria |

## Migration / Rollout

No migration required. New command, new artifact path (`.qa/component-inventory.json`), no changes to Day 2 outputs or the `project-scanning` capability.

## Open Questions

- [ ] None
