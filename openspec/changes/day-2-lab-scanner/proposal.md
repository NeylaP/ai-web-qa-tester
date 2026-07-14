# Proposal: Day 2 — Lab Project + Framework Scanner

## Intent

Establish the first real domain code and deliver the scanner: given frontend and backend paths, detect Angular/NestJS, validate paths exist, and emit `project-manifest.json`. This is the foundation every subsequent analyzer builds on.

## Scope

### In Scope
- `lab/` — standalone Angular + NestJS CRUD users sample (own package.json, not Nx-registered)
- Domain entities in `core-domain`: `ProjectPath`, `FrameworkType`, `FrameworkDetection`, `ProjectManifest`
- Use case in `core-application`: `ScanProjectUseCase`
- New `scanner` lib: `FrameworkDetector` (reads package.json) + `ManifestWriter` (writes `.qa/project-manifest.json`)
- CLI command `scan` that accepts `--frontend` and `--backend` flags and invokes `ScanProjectUseCase`
- Vitest unit tests for all new domain code and the scanner lib

### Out of Scope
- AST analysis (Days 3–4)
- Dependency graph (Day 5)
- Database persistence (Day 9)
- Angular/NestJS deep analysis

## Capabilities

### New Capabilities
- `project-scanning`: Given two filesystem paths, detect Angular and NestJS frameworks and produce a structured `ProjectManifest`

### Modified Capabilities
- None

## Approach

**Detection strategy** (no AST needed for Day 2): read `package.json` dependencies for `@angular/core` / `@nestjs/core`, check for `angular.json` / `nest-cli.json`. Path validation via `fs.existsSync`. Manifest written to `.qa/project-manifest.json` relative to the backend path.

**Architecture**:
- `core-domain` owns the value objects (pure TS, no I/O)
- `core-application` owns the use case (orchestrates, no direct I/O)
- `scanner` lib owns the adapters (file system, manifest writing) — tagged `type:application, scope:core`
- `cli` wires it together as a CLI command

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `core-domain/src/` | Modified | Replace placeholder with real entities |
| `core-application/src/` | Modified | Replace placeholder with ScanProjectUseCase |
| `scanner/` | New | Framework detector + manifest writer library |
| `cli/src/` | Modified | Add `scan` command |
| `lab/` | New | Sample Angular + NestJS project |
| `package.json` | Modified | Add `ts-morph`, `fast-glob`, `commander` (if not present) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ts-morph path resolution on Windows | High | Normalize all paths with `path.resolve()` + convert `\` → `/` at adapter boundary |
| Lab package.json missing expected shape | Low | Scanner handles missing keys gracefully, reports `unknown` |

## Rollback Plan

Delete `scanner/`, revert `core-domain` and `core-application` to placeholders, remove CLI command. No external state affected.

## Success Criteria

- [ ] `npx nx run cli -- scan --frontend lab/frontend --backend lab/backend` exits 0
- [ ] `.qa/project-manifest.json` created with `framework: 'angular'` and `framework: 'nestjs'`
- [ ] All new unit tests pass: `npx nx run-many -t test --all`
- [ ] `npx nx run-many -t lint --all` zero errors
