# Proposal: Day 3 — AST-based Component Inventory Analysis

## Intent

Day 2 detects framework + version but stops there. Day 3 must produce a structured inventory of Angular components/services/routes and NestJS controllers/services/DTOs from real source code. This inventory is the input contract for later phases (test generation, coverage mapping). Without it, downstream days have nothing structured to reason about.

## Scope

### In Scope
- Populate `lab/frontend/src/` with an Angular 20 CRUD app (Products) + minimal `tsconfig.json`
- Populate `lab/backend/src/` with a NestJS 11 CRUD app (Products) + minimal `tsconfig.json`
- Add `ts-morph` to root `package.json` `dependencies`
- New `ComponentInventory` domain entity
- New ports `InventoryAnalyzerPort` and `InventoryWriterPort` in `core-application`
- New `AnalyzeProjectUseCase`
- New adapters `TsMorphAngularAnalyzer`, `TsMorphNestAnalyzer`, `ComponentInventoryWriter` in `scanner`
- New CLI command `analyze --frontend <path> --backend <path>`
- Output artifact `.qa/component-inventory.json`

### Out of Scope
- Template (HTML) parsing — decorators + TS classes only
- Non-literal HTTP URL detection (variables, template literals)
- `@Controller({ path })` object-form (only string-arg form used in lab)
- Test generation, coverage mapping (future days)
- Modifying the Day 2 `scan` command or `project-scanning` spec

## Capabilities

### New Capabilities
- `component-inventory`: AST-based extraction of Angular components/services/routes and NestJS controllers/services/DTOs into a `ComponentInventory` structure, persisted as `.qa/component-inventory.json`

### Modified Capabilities
- None. The `project-scanning` capability is unchanged.

## Approach

Use `ts-morph` as the AST layer (decorator-first, matches Angular/NestJS idioms). Two adapters — Angular and NestJS — walk `ClassDeclaration` nodes, filter by decorator name, and extract literal arguments. A use case orchestrates both adapters and delegates JSON writing to a writer port. CLI command wires everything through the DI composition root.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lab/frontend/src/` | New | Angular CRUD source + tsconfig |
| `lab/backend/src/` | New | NestJS CRUD source + tsconfig |
| `core-domain/src/lib/component-inventory.ts` | New | Domain entity |
| `core-application/src/lib/ports/` | New | Two new ports |
| `core-application/src/lib/use-cases/` | New | `AnalyzeProjectUseCase` |
| `scanner/src/lib/` | New | Two ts-morph analyzers + writer |
| `cli/src/commands/analyze.command.ts` | New | CLI entry |
| Root `package.json` | Modified | Add `ts-morph` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ts-morph requires tsconfig in lab dirs | High | Create minimal tsconfigs in Phase 1 |
| Windows backslash paths leak into JSON | Medium | Normalize to `/` and store relative paths |
| Decorator arg forms vary (`@Controller()` vs string vs object) | Medium | Handle string + empty; document object-form as out of scope |
| Angular HTTP URL extraction brittle | Medium | Scope to literal-string args only |

## Rollback Plan

Delete `openspec/changes/day-3-ast-analysis/` and revert commits touching `lab/`, `core-domain`, `core-application`, `scanner`, `cli`, and root `package.json`. Day 2 `scan` command remains fully functional and unaffected.

## Dependencies

- `ts-morph` (new runtime dependency, added in Phase 1)
- Day 2 `project-scanning` spec (unchanged, but its manifest structure informs analyze output location)

## Success Criteria

- [ ] `pnpm analyze --frontend lab/frontend --backend lab/backend` completes without errors
- [ ] `lab/backend/.qa/component-inventory.json` contains all 5 lab endpoints (`GET /products`, `GET /products/:id`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`)
- [ ] Inventory lists `ProductsComponent`, `ProductDetailComponent`, `AppComponent`, and `ProductsService` with its 3 HTTP calls
- [ ] All file paths in JSON use forward slashes and are relative to project root
- [ ] Unit tests cover both analyzers with the lab source as fixture
