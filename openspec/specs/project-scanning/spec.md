# Project Scanning Specification

## Purpose

Defines how the system accepts two filesystem paths (frontend, backend), validates them, detects the frameworks in use, and produces a structured `ProjectManifest`.

## Requirements

### Requirement: Path Validation

The system MUST validate that both the frontend path and the backend path exist as directories on the filesystem before any scanning occurs.

The system MUST NOT proceed with scanning if either path does not exist or is not a directory.

#### Scenario: Both paths exist and are directories

- GIVEN a frontend path pointing to an existing directory
- AND a backend path pointing to an existing directory
- WHEN `ScanProjectUseCase` is invoked
- THEN scanning proceeds without error

#### Scenario: Frontend path does not exist

- GIVEN a frontend path that does not exist on the filesystem
- WHEN `ScanProjectUseCase` is invoked
- THEN the use case returns an error with message containing "frontend path not found"
- AND no manifest is written

#### Scenario: Backend path is a file, not a directory

- GIVEN a backend path that points to a file (not a directory)
- WHEN `ScanProjectUseCase` is invoked
- THEN the use case returns an error with message containing "backend path is not a directory"
- AND no manifest is written

---

### Requirement: Framework Detection

The system MUST detect Angular by checking for `@angular/core` in the `dependencies` or `devDependencies` of the frontend `package.json`.

The system MUST detect NestJS by checking for `@nestjs/core` in the `dependencies` or `devDependencies` of the backend `package.json`.

When `package.json` is absent or the expected dependency is not found, the system MUST report `framework: 'unknown'` for that path.

#### Scenario: Angular detected

- GIVEN a frontend path whose `package.json` contains `@angular/core` in dependencies
- WHEN the framework detector runs on the frontend path
- THEN `FrameworkDetection.framework` equals `'angular'`

#### Scenario: NestJS detected

- GIVEN a backend path whose `package.json` contains `@nestjs/core` in dependencies
- WHEN the framework detector runs on the backend path
- THEN `FrameworkDetection.framework` equals `'nestjs'`

#### Scenario: No package.json found

- GIVEN a path with no `package.json` file
- WHEN the framework detector runs
- THEN `FrameworkDetection.framework` equals `'unknown'`
- AND `FrameworkDetection.version` is `null`

---

### Requirement: Version Extraction

The system SHOULD extract the framework version from the `package.json` dependency value.

#### Scenario: Version present in package.json

- GIVEN a `package.json` with `"@angular/core": "^20.0.0"` in dependencies
- WHEN the framework detector runs
- THEN `FrameworkDetection.version` equals `'20.0.0'` (semver prefix stripped)

---

### Requirement: Manifest Generation

The system MUST write a `project-manifest.json` file to `.qa/` relative to the backend path upon successful scanning.

The manifest MUST include: `frontendPath`, `backendPath`, `frontend` (FrameworkDetection), `backend` (FrameworkDetection), `scannedAt` (ISO 8601 timestamp).

#### Scenario: Successful scan produces manifest

- GIVEN valid frontend and backend paths
- WHEN `ScanProjectUseCase` completes successfully
- THEN `.qa/project-manifest.json` exists at the backend path
- AND the manifest contains `frontend.framework` and `backend.framework`
- AND `scannedAt` is a valid ISO 8601 string

#### Scenario: Manifest overwrites previous scan

- GIVEN a `.qa/project-manifest.json` already exists from a previous scan
- WHEN `ScanProjectUseCase` runs again
- THEN the existing manifest is overwritten with the new result
