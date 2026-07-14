# Design: Day 2 — Lab Project + Framework Scanner

## Technical Approach

Hexagonal architecture: domain entities in `core-domain` (pure TS, zero I/O), use case + ports in `core-application`, adapters in new `scanner` lib, wiring in `cli`. Lab project lives at `lab/` as plain directories with `package.json` files — not Nx registered.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Path validation location | Use case via `FileSystemPort` | Domain entity (ProjectPath) | Domain must be pure; I/O belongs to adapters |
| Framework detection algorithm | Parse `package.json` for `@angular/core` / `@nestjs/core` | ts-morph AST scan | AST overkill for Day 2; package.json is authoritative for framework identity |
| Scanner library placement | New `scanner` lib (type:application, scope:core) | Inside `core-application` | `core-application` must stay I/O-free; scanner adapters touch the filesystem |
| Lab project | `lab/frontend/` + `lab/backend/` at repo root, NOT Nx registered | Nx apps | Mimics real external project; no boundary/tag pollution |
| Version normalization | Strip semver prefixes (`^`, `~`, `>=`) from version string | Keep raw string | Consumers expect clean semver (e.g., `20.0.0` not `^20.0.0`) |

## Data Flow

```
CLI: npx nx run cli -- scan --frontend lab/frontend --backend lab/backend
  │
  └─► ScanProjectUseCase.execute({ frontendPath, backendPath })
         │
         ├─► FileSystemPort.exists() + isDirectory()   ← NodeFileSystemAdapter
         │     If invalid → throw ScanError
         │
         ├─► ProjectScannerPort.detect(frontendPath)   ← PackageJsonDetector
         │     reads lab/frontend/package.json
         │     → FrameworkDetection { framework: 'angular', version: '20.0.0' }
         │
         ├─► ProjectScannerPort.detect(backendPath)    ← PackageJsonDetector
         │     reads lab/backend/package.json
         │     → FrameworkDetection { framework: 'nestjs', version: '10.0.0' }
         │
         └─► ManifestWriterPort.write(manifest)        ← DotQaManifestWriter
               creates lab/backend/.qa/project-manifest.json
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `core-domain/src/lib/core-domain.ts` | Delete | Replace placeholder |
| `core-domain/src/lib/framework-detection.ts` | Create | `FrameworkType` + `FrameworkDetection` types |
| `core-domain/src/lib/project-manifest.ts` | Create | `ProjectManifest` interface |
| `core-domain/src/index.ts` | Modify | Export new types |
| `core-application/src/lib/core-application.ts` | Delete | Replace placeholder |
| `core-application/src/lib/ports/file-system.port.ts` | Create | `FileSystemPort` interface |
| `core-application/src/lib/ports/project-scanner.port.ts` | Create | `ProjectScannerPort` interface |
| `core-application/src/lib/ports/manifest-writer.port.ts` | Create | `ManifestWriterPort` interface |
| `core-application/src/lib/use-cases/scan-project.use-case.ts` | Create | `ScanProjectUseCase` class |
| `core-application/src/index.ts` | Modify | Export use case + ports |
| `scanner/` | Create (new lib) | Nx lib via `nx g @nx/js:library scanner --bundler=tsc --unitTestRunner=vitest` |
| `scanner/src/lib/node-file-system.adapter.ts` | Create | `FileSystemPort` impl using `fs` |
| `scanner/src/lib/package-json-detector.ts` | Create | `ProjectScannerPort` impl |
| `scanner/src/lib/dot-qa-manifest-writer.ts` | Create | `ManifestWriterPort` impl |
| `scanner/src/index.ts` | Modify | Export adapters |
| `cli/src/main.ts` | Modify | Commander.js `scan` command |
| `lab/frontend/package.json` | Create | `@angular/core` dependency |
| `lab/frontend/angular.json` | Create | Minimal Angular workspace config |
| `lab/backend/package.json` | Create | `@nestjs/core` dependency |
| `lab/backend/nest-cli.json` | Create | Minimal NestJS CLI config |

## Interfaces / Contracts

```ts
// core-domain
export type FrameworkType = 'angular' | 'nestjs' | 'unknown';
export interface FrameworkDetection { framework: FrameworkType; version: string | null; }
export interface ProjectManifest {
  frontendPath: string; backendPath: string;
  frontend: FrameworkDetection; backend: FrameworkDetection;
  scannedAt: string; // ISO 8601
}

// core-application ports
export interface FileSystemPort { exists(p: string): boolean; isDirectory(p: string): boolean; }
export interface ProjectScannerPort { detect(absPath: string): Promise<FrameworkDetection>; }
export interface ManifestWriterPort { write(m: ProjectManifest, targetDir: string): Promise<void>; }
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `ScanProjectUseCase` | Mock all 3 ports; test validation errors + happy path |
| Unit | `PackageJsonDetector` | Create temp `package.json` fixture in test; assert detection |
| Unit | `DotQaManifestWriter` | Write to temp dir; assert JSON content |
| Integration | CLI `scan` command | `execa` against real `lab/` project; assert manifest exists |

## Migration / Rollout

No migration required. Rollback: delete `scanner/` lib, revert `core-domain` and `core-application` index files, remove CLI scan command.

## Open Questions

None — all decisions resolved.
