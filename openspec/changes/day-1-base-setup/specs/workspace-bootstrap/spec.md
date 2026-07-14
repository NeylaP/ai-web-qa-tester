# Workspace Bootstrap Specification

## Purpose

Defines requirements for initializing the Nx v21 monorepo from an empty directory, producing exactly 5 compilable, testable, lintable projects with enforced architectural boundaries.

## Requirements

### Requirement: Reproducible Workspace Initialization

The workspace MUST be created using an exact pinned Nx v21 patch version. No `^`, `~`, or `latest` range operators SHALL be used for `nx` or any `@nx/*` package. The Node.js version and npm version used MUST be documented in `docs/decisions/ADR-0001.md`.

#### Scenario: Workspace created with pinned versions

- GIVEN an empty directory and internet access
- WHEN `npx create-nx-workspace@<exact-patch>` is executed with `--preset=ts --pm=npm`
- THEN a valid Nx workspace is created
- AND `package.json` shows exact version pinning for all `@nx/*` packages with no range operators
- AND `nx.json` reflects Nx v21 configuration

#### Scenario: Installed version matches documented version

- GIVEN the workspace is initialized
- WHEN `nx --version` is executed
- THEN the output matches the exact patch version documented in `docs/decisions/ADR-0001.md`

### Requirement: Exact Project Structure

The workspace MUST contain exactly 3 apps and 2 libs after Day 1 setup. No additional apps or libs SHALL be scaffolded on Day 1.

| Project | Type | Path |
|---------|------|------|
| api | NestJS app | `apps/api` |
| web | Angular app | `apps/web` |
| cli | Node/Commander app | `apps/cli` |
| core-domain | TS lib | `libs/core-domain` |
| core-application | TS lib | `libs/core-application` |

#### Scenario: All 5 projects compile without errors

- GIVEN the workspace is initialized with all 5 projects
- WHEN `npx nx run-many -t build --all` is executed
- THEN all 5 projects build successfully
- AND zero TypeScript errors are reported

#### Scenario: No unauthorized projects exist

- GIVEN the workspace is initialized
- WHEN the `apps/` and `libs/` directories are listed
- THEN only `api`, `web`, `cli`, `core-domain`, and `core-application` are present

### Requirement: Strict TypeScript Configuration

All 5 projects MUST use TypeScript strict mode. No `any` types SHALL be present in scaffolded code. Path aliases (`@ai-web-qa-tester/*`) MUST be configured in `tsconfig.base.json` and resolve correctly.

#### Scenario: TypeScript strict mode passes for all projects

- GIVEN the workspace is initialized
- WHEN TypeScript type checking is executed across all projects
- THEN zero type errors are reported
- AND no `any` types exist in generated scaffolding code

### Requirement: Module Boundary Enforcement

Nx module boundary lint rules MUST be configured with the following tags and constraints:

```
apps/api, apps/web, apps/cli    → type:app, scope:platform
libs/core-domain                → type:domain, scope:core
libs/core-application           → type:application, scope:core
```

Constraint rules:
- `core-domain` SHALL NOT import from `@nestjs/*`, `@angular/*`, Playwright, or any persistence/infrastructure package
- `core-application` MAY import from `core-domain`; SHALL NOT import from apps
- Apps MAY import from `core-domain` and `core-application`
- No library SHALL import from an application

#### Scenario: Forbidden import is caught by lint

- GIVEN a file in `libs/core-domain` attempts to import from `@nestjs/common`
- WHEN `npx nx lint core-domain` is executed
- THEN lint exits with a non-zero code
- AND the error message references the module boundary violation

#### Scenario: Permitted dependency passes lint

- GIVEN a file in `libs/core-application` imports from `@ai-web-qa-tester/core-domain`
- WHEN `npx nx lint core-application` is executed
- THEN lint passes with zero errors

### Requirement: No Circular Dependencies

The workspace MUST have zero circular dependencies between projects.

#### Scenario: Circular dependency check passes

- GIVEN the workspace is initialized with all 5 projects
- WHEN the Nx project graph is analyzed
- THEN no circular dependency edges are present
