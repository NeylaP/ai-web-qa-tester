# Component Inventory Specification

## Purpose

AST-based analysis of Angular frontend and NestJS backend source trees. Extracts components, services, routes, controllers, and DTOs into a `ComponentInventory` entity, persisted as `.qa/component-inventory.json`.

## Extracted Fields

| Source | Decorator / Pattern | Extracted Fields |
|--------|---------------------|-----------------|
| Angular | `@Component` | `name`, `selector`, `filePath` |
| Angular | `@Injectable` | `name`, `filePath`, `httpCalls[]` (method + url) |
| Angular | routing arrays | `routes[]` (path string literals) |
| NestJS | `@Controller` | `name`, `basePath`, `filePath`, `endpoints[]` (method + path) |
| NestJS | `@Get/@Post/@Put/@Patch/@Delete` | Combined with controller `basePath` |
| NestJS | `@Injectable` | `name`, `filePath` |
| NestJS | `*.dto.ts` files | `name`, `filePath`, `fields[]` (public property names) |

## Requirements

### Requirement: Pre-Analysis Validation

The system MUST verify that `project-manifest.json` exists in `<backendPath>/.qa/` and that `tsconfig.json` exists in both the frontend and backend paths before any analysis begins. If any file is absent, the system MUST throw an `AnalysisError` identifying the missing path.

#### Scenario: Missing project manifest

- GIVEN no `project-manifest.json` exists at `<backendPath>/.qa/`
- WHEN `AnalyzeProjectUseCase` is invoked
- THEN an `AnalysisError` is thrown containing the backend path

#### Scenario: Missing tsconfig

- GIVEN no `tsconfig.json` exists in the frontend or backend path
- WHEN `AnalyzeProjectUseCase` is invoked
- THEN an `AnalysisError` is thrown containing the affected path

---

### Requirement: Angular Component Extraction

The system MUST discover all `@Component`-decorated classes in the frontend source tree and extract `name`, `selector`, and `filePath` into `angular.components`.

#### Scenario: Components found

- GIVEN Angular source containing `@Component`-decorated classes
- WHEN the Angular analyzer runs
- THEN each entry in `angular.components` contains `name`, `selector`, and `filePath`

#### Scenario: No components found

- GIVEN no `@Component`-decorated classes in the frontend source tree
- WHEN the Angular analyzer runs
- THEN `angular.components` is an empty array

---

### Requirement: Angular Service Extraction

The system MUST discover all `@Injectable`-decorated classes in the frontend source tree and extract `name`, `filePath`, and `httpCalls` from `this.http.*` method calls. Each HTTP call MUST capture `method` and `url` when the URL is a string literal. Non-literal URL arguments (variables, template literals) MUST be ignored.

#### Scenario: Service with HTTP calls

- GIVEN an `@Injectable` class calling `this.http.get('/api/products')`
- WHEN the Angular analyzer runs
- THEN the service entry contains `httpCalls: [{ method: 'get', url: '/api/products' }]`

#### Scenario: Non-literal URL ignored

- GIVEN an `@Injectable` class calling `this.http.get(this.baseUrl + '/products')`
- WHEN the Angular analyzer runs
- THEN that call does not appear in `httpCalls`

---

### Requirement: Angular Route Extraction

The system SHOULD extract string literal `path` values from Angular routing array declarations into `angular.routes`.

#### Scenario: Routes found

- GIVEN a routing file with `{ path: 'products', ... }` in a route array
- WHEN the Angular analyzer runs
- THEN `angular.routes` contains `'products'`

---

### Requirement: NestJS Controller Extraction

The system MUST discover all `@Controller`-decorated classes and extract `name`, `basePath` (string argument or `''` when absent), `filePath`, and `endpoints`. Each endpoint MUST be derived from `@Get`, `@Post`, `@Put`, `@Patch`, or `@Delete` method decorators, combining `basePath` with the method-level path argument.

#### Scenario: Controller with endpoints

- GIVEN `@Controller('products')` with a `@Get(':id')` method
- WHEN the NestJS analyzer runs
- THEN the entry has `basePath: 'products'` and endpoint `{ method: 'GET', path: 'products/:id' }`

#### Scenario: Empty base path

- GIVEN `@Controller()` with no path argument
- WHEN the NestJS analyzer runs
- THEN `basePath` equals `''`

---

### Requirement: NestJS Service Extraction

The system MUST discover all `@Injectable`-decorated classes in the backend source tree and extract `name` and `filePath` into `nestjs.services`.

#### Scenario: Services found

- GIVEN backend source files containing `@Injectable`-decorated classes
- WHEN the NestJS analyzer runs
- THEN each entry in `nestjs.services` contains `name` and `filePath`

---

### Requirement: NestJS DTO Extraction

The system MUST discover all `*.dto.ts` files in the backend source tree and extract `name`, `filePath`, and `fields` (names of all public properties) into `nestjs.dtos`.

#### Scenario: DTO found

- GIVEN `create-product.dto.ts` with public properties `name` and `price`
- WHEN the NestJS analyzer runs
- THEN the entry contains `name: 'CreateProductDto'`, its `filePath`, and `fields: ['name', 'price']`

---

### Requirement: Inventory Persistence

The system MUST write the `ComponentInventory` as JSON to `.qa/component-inventory.json` relative to the backend path. The output MUST include `analyzedAt` as an ISO 8601 timestamp. All `filePath` values MUST use forward slashes and be relative to the project root.

#### Scenario: Successful output

- GIVEN valid frontend and backend paths with all required files present
- WHEN `AnalyzeProjectUseCase` completes
- THEN `.qa/component-inventory.json` exists, `analyzedAt` is a valid ISO 8601 string, and all `filePath` values use forward slashes

#### Scenario: Overwrites existing inventory

- GIVEN `.qa/component-inventory.json` already exists from a previous run
- WHEN `AnalyzeProjectUseCase` runs again
- THEN the existing file is overwritten with the new result
