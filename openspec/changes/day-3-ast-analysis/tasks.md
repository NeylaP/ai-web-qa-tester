# Tasks: Day 3 — AST-based Component Inventory Analysis

## Phase 1: Lab Source Population + Dependency

- [ ] 1.1 Run `npm install ts-morph` at repo root; verify it appears in root `package.json` `dependencies`
- [ ] 1.2 Create `lab/frontend/src/app.component.ts` — `AppComponent`, selector `app-root`
- [ ] 1.3 Create `lab/frontend/src/app.routes.ts` — route array `''` → `ProductsComponent`, `':id'` → `ProductDetailComponent`
- [ ] 1.4 Create `lab/frontend/src/products/products.component.ts` — `ProductsComponent`, selector `app-products`
- [ ] 1.5 Create `lab/frontend/src/products/product-detail.component.ts` — `ProductDetailComponent`, selector `app-product-detail`
- [ ] 1.6 Create `lab/frontend/src/products/products.service.ts` — `ProductsService` with `getAll()` (GET /api/products), `create()` (POST /api/products), `delete(id)` (DELETE /api/products/:id)
- [ ] 1.7 Create `lab/frontend/tsconfig.json` — minimal config, `include: ["src/**/*.ts"]`
- [ ] 1.8 Create `lab/backend/src/products/products.controller.ts` — `@Controller('products')` with `@Get()`, `@Get(':id')`, `@Post()`, `@Patch(':id')`, `@Delete(':id')`
- [ ] 1.9 Create `lab/backend/src/products/products.service.ts` — `@Injectable()` `ProductsService`
- [ ] 1.10 Create `lab/backend/src/products/dto/create-product.dto.ts` — `CreateProductDto` with `name: string`, `price: number`
- [ ] 1.11 Create `lab/backend/src/products/dto/update-product.dto.ts` — `UpdateProductDto` with `name?: string`, `price?: number`
- [ ] 1.12 Create `lab/backend/tsconfig.json` — minimal config, `include: ["src/**/*.ts"]`

## Phase 2: Domain Entity

- [ ] 2.1 Create `core-domain/src/lib/component-inventory.ts` — define `HttpCall`, `AngularComponent`, `AngularService`, `NestEndpoint`, `NestController`, `NestService`, `NestDto`, `ComponentInventory` interfaces
- [ ] 2.2 Update `core-domain/src/index.ts` — export all new types from 2.1

## Phase 3: Application Ports + Use Case

- [ ] 3.1 Create `core-application/src/lib/ports/inventory-analyzer.port.ts` — `InventoryAnalyzerPort` interface with `analyze(absolutePath, tsConfigPath)` returning Angular or NestJS shape
- [ ] 3.2 Create `core-application/src/lib/ports/inventory-writer.port.ts` — `InventoryWriterPort` interface with `write(inventory, targetDir)`
- [ ] 3.3 Create `core-application/src/lib/use-cases/analyze-project.use-case.ts` — `AnalyzeProjectUseCase` + `AnalysisError`; validates manifest + tsconfigs via `FileSystemPort`, calls `Promise.all` on both analyzers, delegates to writer
- [ ] 3.4 Update `core-application/src/index.ts` — export ports, `AnalyzeProjectUseCase`, `AnalysisError`, `AnalyzeProjectInput`

## Phase 4: Scanner Adapters

- [ ] 4.1 Create `scanner/src/lib/ts-morph-angular-analyzer.ts` — `TsMorphAngularAnalyzer implements InventoryAnalyzerPort`; extracts `@Component`, `@Injectable` HTTP calls (literal strings only), route `path` literals; normalizes paths to forward-slash relative to CWD
- [ ] 4.2 Create `scanner/src/lib/ts-morph-nest-analyzer.ts` — `TsMorphNestAnalyzer implements InventoryAnalyzerPort`; extracts `@Controller` + method decorators (5 HTTP verbs), `@Injectable`, `*.dto.ts` public property fields; normalizes paths
- [ ] 4.3 Create `scanner/src/lib/component-inventory-writer.ts` — `ComponentInventoryWriter implements InventoryWriterPort`; writes `<targetDir>/.qa/component-inventory.json` with `analyzedAt` ISO 8601 timestamp
- [ ] 4.4 Update `scanner/src/index.ts` — export `TsMorphAngularAnalyzer`, `TsMorphNestAnalyzer`, `ComponentInventoryWriter`

## Phase 5: CLI Wiring

- [ ] 5.1 Update `cli/src/main.ts` — register `analyze --frontend <path> --backend <path>` command; compose `FileSystemPort`, both analyzers, `ComponentInventoryWriter`, and `AnalyzeProjectUseCase`

## Phase 6: Unit Tests

- [ ] 6.1 Write `core-application/src/lib/use-cases/analyze-project.use-case.spec.ts` — fake `FileSystemPort` + stub analyzers/writer; cover missing-manifest, missing-frontend-tsconfig, missing-backend-tsconfig, and success branches
- [ ] 6.2 Write `scanner/src/lib/ts-morph-angular-analyzer.spec.ts` — using `lab/frontend` fixture: assert 3 components, 1 service with 3 HTTP calls, 2 routes, forward-slash paths
- [ ] 6.3 Write `scanner/src/lib/ts-morph-nest-analyzer.spec.ts` — using `lab/backend` fixture: assert 5 endpoints across 1 controller, 1 service, 2 DTOs with correct `fields`
- [ ] 6.4 Write `scanner/src/lib/component-inventory-writer.spec.ts` — write to OS temp dir; assert file created, `analyzedAt` is valid ISO 8601, all `filePath` values use forward slashes
- [ ] 6.5 Run `npx nx run-many -t test lint --all` — all projects pass with zero errors

## Phase 7: E2E Smoke Test

- [ ] 7.1 Run `node dist/cli/main.js analyze --frontend lab/frontend --backend lab/backend` — exits 0, no errors
- [ ] 7.2 Read `lab/backend/.qa/component-inventory.json` — assert 5 NestJS endpoints, 3 Angular components, `ProductsService` with 3 `httpCalls`, and all `filePath` values use forward slashes
