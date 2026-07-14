# Tasks: Day 2 — Lab Project + Framework Scanner

## Phase 1: Scaffolding & Lab Setup

- [ ] 1.1 Run `npx nx g @nx/js:library scanner --bundler=tsc --unitTestRunner=vitest --no-interactive` from project root
- [ ] 1.2 Add tags `["type:application", "scope:core"]` to `scanner/project.json`; add explicit `test` target (`executor: "@nx/vite:test"`)
- [ ] 1.3 Add `"@ai-web-qa-tester/scanner": ["scanner/src/index.ts"]` to `tsconfig.base.json` paths
- [ ] 1.4 Create `lab/frontend/package.json` — minimal JSON with `"dependencies": { "@angular/core": "^20.0.0" }`
- [ ] 1.5 Create `lab/frontend/angular.json` — minimal Angular workspace config (just `"version": 1, "projects": {}`)
- [ ] 1.6 Create `lab/backend/package.json` — minimal JSON with `"dependencies": { "@nestjs/core": "^11.0.0" }`
- [ ] 1.7 Create `lab/backend/nest-cli.json` — minimal `{ "collection": "@nestjs/schematics" }`

## Phase 2: Domain Entities & Ports

- [ ] 2.1 Delete `core-domain/src/lib/core-domain.ts`; create `core-domain/src/lib/framework-detection.ts` with `FrameworkType` union + `FrameworkDetection` interface
- [ ] 2.2 Create `core-domain/src/lib/project-manifest.ts` with `ProjectManifest` interface (frontendPath, backendPath, frontend, backend, scannedAt)
- [ ] 2.3 Update `core-domain/src/index.ts` — export `FrameworkType`, `FrameworkDetection`, `ProjectManifest`
- [ ] 2.4 Delete `core-application/src/lib/core-application.ts`; create `core-application/src/lib/ports/file-system.port.ts`, `ports/project-scanner.port.ts`, `ports/manifest-writer.port.ts`
- [ ] 2.5 Create `core-application/src/lib/use-cases/scan-project.use-case.ts` — validate paths via `FileSystemPort`, detect via `ProjectScannerPort`, write via `ManifestWriterPort`; throw `ScanError` on invalid paths
- [ ] 2.6 Update `core-application/src/index.ts` — export use case + all 3 port interfaces

## Phase 3: Scanner Adapters

- [ ] 3.1 Create `scanner/src/lib/node-file-system.adapter.ts` — implements `FileSystemPort` using `node:fs` and `node:path`; normalize separators to forward-slash
- [ ] 3.2 Create `scanner/src/lib/package-json-detector.ts` — implements `ProjectScannerPort`; reads `package.json`, checks `@angular/core`/`@nestjs/core` in deps+devDeps, strips semver prefix from version
- [ ] 3.3 Create `scanner/src/lib/dot-qa-manifest-writer.ts` — implements `ManifestWriterPort`; creates `.qa/` with `mkdirSync({ recursive: true })`, writes `project-manifest.json`
- [ ] 3.4 Update `scanner/src/index.ts` — export all 3 adapters

## Phase 4: CLI Wiring

- [ ] 4.1 Rewrite `cli/src/main.ts` — add Commander `scan` command with `--frontend <path>` and `--backend <path>` options; instantiate adapters; call `ScanProjectUseCase.execute()`; print manifest path on success

## Phase 5: Unit Tests

- [ ] 5.1 Write `core-application` tests for `ScanProjectUseCase` — mock all 3 ports; cover: happy path, frontend not found (ScanError), backend not a directory (ScanError)
- [ ] 5.2 Write `scanner` tests for `PackageJsonDetector` — use temp dir fixtures; cover: angular detected, nestjs detected, missing package.json → unknown
- [ ] 5.3 Write `scanner` tests for `DotQaManifestWriter` — write to OS temp dir; assert JSON shape and `.qa/` directory creation
- [ ] 5.4 Run `npx nx run-many -t test --all` — all 5 projects + scanner must exit 0

## Phase 6: Verification

- [ ] 6.1 Run `npx nx run-many -t lint test build --all` — zero errors, zero warnings
- [ ] 6.2 Run `npx nx run cli -- scan --frontend lab/frontend --backend lab/backend` — exits 0; assert `lab/backend/.qa/project-manifest.json` exists with `frontend.framework: 'angular'` and `backend.framework: 'nestjs'`
