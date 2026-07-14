# Exploration: Day 2 — Lab Project + Framework Scanner

## Current State

The monorepo has 5 Nx projects, all with placeholder code:
- `core-domain/src/lib/core-domain.ts` — exports `coreDomain(): string` (placeholder)
- `core-application/src/lib/core-application.ts` — exports `coreApplication(): string` (placeholder)
- `api/`, `web/`, `cli/` — scaffolded, empty

No domain entities exist. No external analyzers installed. ts-morph, fast-glob not yet in package.json.

## Affected Areas

- `core-domain/src/` — will receive first real domain entities (ProjectPath, FrameworkDetection, ProjectManifest)
- `core-application/src/` — will receive first real use case (ScanProjectUseCase)
- `package.json` — new deps: `ts-morph`, `fast-glob`
- `lab/` (new, root level) — standalone Angular + NestJS sample project (NOT an Nx project)
- `scanner/` (new lib) — framework detection library, NestJS/Angular detector + manifest writer

## Approaches

### Lab Project Placement

1. **Inside Nx as registered apps** (`apps/lab-frontend`, `apps/lab-backend`)
   - Pros: Managed by Nx, same toolchain
   - Cons: Pollutes the workspace with sample code; module boundary tags would need special treatment
   - Effort: Medium

2. **Standalone in `lab/` at repo root** (not registered with Nx)
   - Pros: Realistic — mirrors what a real client project looks like. No boundary conflicts. Easy to delete later.
   - Cons: Separate package.json, not affected by Nx targets
   - Effort: Low

3. **External directory outside the monorepo**
   - Pros: Most realistic test for path resolution
   - Cons: Not version-controlled alongside the product; harder to set up in CI
   - Effort: High

**Recommendation**: Option 2 — `lab/` at root. Gives a real Angular + NestJS structure without polluting Nx.

### Scanner Library Placement

1. **New `scanner` library** (root level, same as other libs)
   - Tags: `type:application, scope:core`
   - Depends on `core-domain` (imports ProjectManifest, etc.)
   - Pros: Clean separation, reusable by both `api` and `cli`
   - Effort: Low

2. **Inside `core-application`**
   - Pros: Less files
   - Cons: Mixes use cases with infrastructure (ts-morph file system access) — violates hexagonal architecture
   - Effort: Low

**Recommendation**: Option 1 — separate `scanner` lib. The use case lives in `core-application`, the file-system adapter lives in `scanner`.

### Detection Strategy

Angular detection:
1. Check `package.json` → `@angular/core` in dependencies
2. Check for `angular.json` at root
3. Extract version from package.json

NestJS detection:
1. Check `package.json` → `@nestjs/core` in dependencies
2. Check for `nest-cli.json` or `main.ts` with `NestFactory`
3. Extract version from package.json

Path resolution (Windows risk):
- Always normalize with `path.resolve()` before passing to ts-morph
- Use `path.sep` aware comparisons
- ts-morph `Project` accepts forward-slash paths; normalize at adapter boundary

## Recommendation

**Domain entities** (in `core-domain`):
- `ProjectPath` — value object, validates path exists + is a directory
- `FrameworkType` — union type: `'angular' | 'nestjs' | 'unknown'`
- `FrameworkDetection` — value object: `{ framework, version, configFiles }`
- `ProjectManifest` — entity: `{ id, frontendPath, backendPath, frontend, backend, scannedAt }`

**Use case** (in `core-application`):
- `ScanProjectUseCase` — takes `{ frontendPath, backendPath }`, validates paths, delegates to scanner adapter, returns `ProjectManifest`

**Scanner lib** (new):
- `FrameworkDetector` — reads package.json + detects framework + version
- `ManifestWriter` — writes `project-manifest.json` to `.qa/` in the scanned project's root

**Lab project** (`lab/`):
- `lab/frontend/` — minimal Angular 17+ app with `UsersComponent`, `UserService`, routing
- `lab/backend/` — minimal NestJS app with `UsersController`, `UsersService`, `CreateUserDto`
- Each has its own `package.json` (NOT installed — just present for scanner to read)

## Risks

- ts-morph path resolution on Windows — normalize at adapter boundary with `path.resolve()` + forward-slash conversion
- Lab project Angular/NestJS version mismatch with workspace — lab has its own package.json, version doesn't need to match
- `fast-glob` on Windows with backslash patterns — always use forward slashes in glob patterns

## Ready for Proposal

Yes. Scope is clear. Recommend proceeding to proposal with the structure above.
