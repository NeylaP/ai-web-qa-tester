# Exploration: day-3-ast-analysis

## Current State

Day 2 produced a working `scan` CLI command that:
- Validates frontend/backend paths via `FileSystemPort`
- Detects framework + version by reading `package.json` via `PackageJsonDetector`
- Writes `lab/backend/.qa/project-manifest.json`

The confirmed `project-manifest.json` at `lab/backend/.qa/` shows Angular 20 + NestJS 11 correctly detected.

### What does NOT exist yet

| Gap | Impact on Day 3 |
|-----|----------------|
| `lab/frontend/src/` is empty (no `.ts` files) | Analyzer has nothing to scan — prerequisite |
| `lab/backend/src/` is empty (no `.ts` files) | Same |
| No `ComponentInventory` domain entity | New domain type needed |
| No `InventoryAnalyzerPort` | New port needed in `core-application` |
| No `AnalyzeProjectUseCase` | New use case needed |
| `ts-morph` not in root `package.json` | Must be added before any AST work |

Day 3 therefore has **two mandatory phases before writing any analyzer**:
1. Populate `lab/` with a realistic Angular + NestJS CRUD source tree
2. Build the AST analysis pipeline on top of it

---

## Affected Areas

### New files to create
- `lab/frontend/src/` — Angular CRUD app source (components, service, routing, tsconfig)
- `lab/backend/src/` — NestJS CRUD app source (controller, service, DTOs, tsconfig)
- `core-domain/src/lib/component-inventory.ts` — new domain entity
- `core-application/src/lib/ports/inventory-analyzer.port.ts` — new port
- `core-application/src/lib/ports/inventory-writer.port.ts` — new port
- `core-application/src/lib/use-cases/analyze-project.use-case.ts` — new use case
- `scanner/src/lib/ts-morph-angular-analyzer.ts` — Angular AST adapter
- `scanner/src/lib/ts-morph-nest-analyzer.ts` — NestJS AST adapter
- `scanner/src/lib/component-inventory-writer.ts` — writes `component-inventory.json`
- `cli/src/commands/analyze.command.ts` — new CLI command

### Files to modify
- `core-domain/src/index.ts` — export `ComponentInventory`
- `core-application/src/index.ts` — export new ports + use case
- `scanner/src/index.ts` — export new adapters
- Root `package.json` — add `ts-morph` as dependency

---

## Proposed `ComponentInventory` Shape

```typescript
// core-domain/src/lib/component-inventory.ts

export interface AngularComponent {
  name: string;       // class name, e.g. "ProductsComponent"
  selector: string;   // from @Component({ selector })
  filePath: string;   // relative to frontendPath
}

export interface AngularService {
  name: string;       // class name
  filePath: string;
  httpCalls: HttpCall[];
}

export interface HttpCall {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  urlPattern: string; // literal string arg from this.http.get('/api/...')
}

export interface NestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // combined: controller base + method path
}

export interface NestController {
  name: string;
  basePath: string;   // from @Controller('path')
  filePath: string;
  endpoints: NestEndpoint[];
}

export interface NestService {
  name: string;
  filePath: string;
}

export interface NestDto {
  name: string;
  filePath: string;
  fields: string[];   // public property names
}

export interface ComponentInventory {
  analyzedAt: string;
  angular: {
    components: AngularComponent[];
    services: AngularService[];
    routes: string[];  // path strings from RouterModule.forRoot/forChild config
  };
  nestjs: {
    controllers: NestController[];
    services: NestService[];
    dtos: NestDto[];
  };
}
```

---

## Approaches

### 1. ts-morph (recommended)

A thin, well-maintained wrapper over the TypeScript Compiler API that exposes a high-level, class-oriented API with first-class decorator support.

**How it works**: create a `ts-morph Project` pointing at a `tsconfig.json`, add source files, then traverse `ClassDeclaration` nodes and call `getDecorators()`, `getProperties()`, `getConstructors()`, etc.

```typescript
const project = new Project({ tsConfigFilePath: path.join(dir, 'tsconfig.json') });
const sourceFiles = project.getSourceFiles('**/*.ts');
for (const sf of sourceFiles) {
  for (const cls of sf.getClasses()) {
    const componentDec = cls.getDecorator('Component');
    if (componentDec) { /* extract selector arg */ }
  }
}
```

- **Pros**: high-level decorator API, argument extraction built-in, handles multi-line decorators, resolves imports, same TS version as the project
- **Cons**: adds ~5 MB dependency, needs a `tsconfig.json` in the lab dirs (must be created as part of Phase 1)
- **Effort**: Medium

### 2. TypeScript Compiler API directly (`typescript` package)

Use `ts.createProgram()` and walk the raw AST with `ts.forEachChild`.

- **Pros**: zero new dependency (`typescript` is already a devDep in root `package.json`)
- **Cons**: decorator nodes require manual `ts.SyntaxKind` checks, argument extraction is ~3× more code, no helper methods, maintenance burden is high for the value gained
- **Effort**: High

### 3. Regex / string scanning

Pattern-match `.ts` file contents with regular expressions: `/\@Component\({[^}]*selector:\s*['"]([^'"]+)['"]/`.

- **Pros**: zero dependencies, fastest execution
- **Cons**: breaks on multi-line decorator args, can't handle computed values, no import resolution, HTTP URL extraction is unreliable, fundamentally brittle as source evolves
- **Effort**: Low (short-term), Very High (maintenance)

---

## Recommendation

**Use ts-morph (Approach 1).**

Angular 20 and NestJS 11 are both decorator-first frameworks. The entire analysis task — finding `@Component`, `@Controller`, `@Get('/path')`, `@Injectable`, class field names — maps directly to ts-morph's decorator and class traversal API. The TypeScript Compiler API directly would produce the same result with 3× the boilerplate and no meaningful advantage. Regex is not appropriate for structured extraction that must survive real-world code patterns.

`ts-morph` should be added as a **runtime dependency** of the root workspace (`dependencies`, not `devDependencies`) because the scanner lib runs at CLI invocation time, not at build time.

The lab tsconfig files needed by ts-morph should be minimal (`"strict": false`, no `paths`, just `include: ["src/**/*.ts"]`) so the `Project` can initialize quickly without resolving all Angular/NestJS node_modules types.

---

## Lab Source Plan (Phase 1 prerequisite)

A minimal but realistic CRUD scenario: **Products**.

### `lab/frontend/src/`
| File | Purpose |
|------|---------|
| `app.component.ts` | Root component, `AppComponent` with selector `app-root` |
| `app.routes.ts` | Route config: `''` → `ProductsComponent`, `':id'` → `ProductDetailComponent` |
| `products/products.component.ts` | List view, `ProductsComponent` |
| `products/product-detail.component.ts` | Detail view, `ProductDetailComponent` |
| `products/products.service.ts` | `ProductsService` injecting `HttpClient`, calls `GET /api/products`, `POST /api/products`, `DELETE /api/products/:id` |
| `main.ts` | Bootstrap entry (not analyzed) |
| `tsconfig.json` | Minimal tsconfig for ts-morph |

### `lab/backend/src/`
| File | Purpose |
|------|---------|
| `products/products.controller.ts` | `@Controller('products')` with `@Get()`, `@Get(':id')`, `@Post()`, `@Patch(':id')`, `@Delete(':id')` |
| `products/products.service.ts` | `@Injectable()` `ProductsService` |
| `products/dto/create-product.dto.ts` | `CreateProductDto` with `name: string`, `price: number` |
| `products/dto/update-product.dto.ts` | `UpdateProductDto` (partial of create) |
| `app.module.ts` | Root module (not analyzed for endpoints) |
| `main.ts` | Bootstrap entry (not analyzed) |
| `tsconfig.json` | Minimal tsconfig for ts-morph |

---

## Risks

1. **Lab src is empty** — this is a hard blocker. The analyzer cannot be validated without real source files. Phase 1 (lab population) must complete before Phase 2 (analyzer) can be tested.

2. **tsconfig required by ts-morph** — `new Project({ tsConfigFilePath })` throws if tsconfig is absent. The lab dirs have no tsconfig. Must create minimal ones in Phase 1.

3. **Decorator argument extraction edge cases** — `@Controller()` (no arg, base path defaults to `''`) vs `@Controller('products')` vs `@Controller({ path: 'products' })`. The analyzer must handle all three forms; the lab will only use the string-arg form to keep Phase 1 simple.

4. **HTTP URL detection in Angular** — detecting `this.http.get('/api/products')` requires following the call chain on the `HttpClient` injection. ts-morph can do this via `getCallExpressions()` but it's the most complex part. Scoped to literal string arguments only (no template literals, no variables) for Day 3.

5. **Windows path separators** — ts-morph `getFilePath()` returns absolute paths with backslashes on Windows. Must normalize to forward slashes before writing to `component-inventory.json`, and store paths relative to the project root, not absolute.

6. **`@nestjs/mapped-types` for `PartialType`** — `UpdateProductDto extends PartialType(CreateProductDto)` requires `@nestjs/mapped-types`. To avoid this dependency in the lab, `UpdateProductDto` will simply redeclare fields as optional. Keeps Phase 1 self-contained.

---

## Ready for Proposal

**Yes.** The scope is well-defined, the two-phase structure is clear, the domain shape is stable, and the approach decision is unambiguous. The proposal should capture:
- Phase 1 (lab population) as a prerequisite task group
- Phase 2 (AST pipeline) as the main deliverable
- `ts-morph` as the chosen approach with the rationale above
- The `ComponentInventory` shape as a starting contract (may grow in later days)
