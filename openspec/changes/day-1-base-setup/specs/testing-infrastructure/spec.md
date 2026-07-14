# Testing Infrastructure Specification

## Purpose

Defines requirements for unit and integration test infrastructure across the monorepo. Angular test runner selection is gated on a mandatory compatibility spike that must pass before the final workspace is created.

## Requirements

### Requirement: Mandatory Compatibility Spike

A disposable compatibility spike MUST be executed before creating the final workspace. The spike MUST validate that the selected Angular test runner produces a real passing test on Windows without undocumented manual configuration.

#### Scenario: Spike validates Angular + Vitest on Windows

- GIVEN a disposable Nx v21 workspace with `@analogjs/vitest-angular` installed
- WHEN `npx nx test web` and `npx nx test web --coverage` are executed on Windows
- THEN both commands exit with code 0
- AND at least one test uses `TestBed.createComponent()` (not a trivial `1 + 1` assertion)

#### Scenario: Spike failure triggers fallback

- GIVEN the Vitest + Angular spike cannot produce a passing `TestBed` test on Windows within Day 1 scope
- WHEN the fallback decision is made
- THEN Angular MUST use Jest as its test runner
- AND all other projects MUST continue using Vitest
- AND `docs/decisions/ADR-0001.md` MUST document the exact failure reason and fallback rationale
- AND no additional Day 1 time SHALL be invested forcing the Vitest + Angular integration

### Requirement: Generator Options Must Be Verified Before Use

Before running any generator, the actual available options for the pinned Nx v21 version MUST be inspected. No generator option SHALL be assumed from documentation without verification.

#### Scenario: Generator options inspected before scaffolding Angular app

- GIVEN Nx v21 is installed
- WHEN `npx nx g @nx/angular:application --help` is executed
- THEN the output is reviewed to confirm the exact flag name for the unit test runner option
- AND the confirmed flag name is used in the scaffold command

### Requirement: Vitest for NestJS, CLI, and Core Libs

`apps/api`, `apps/cli`, `libs/core-domain`, and `libs/core-application` MUST use Vitest as their test runner. This applies regardless of the Angular test strategy outcome.

#### Scenario: Vitest tests pass for non-Angular projects

- GIVEN Vitest is configured for api, cli, core-domain, and core-application
- WHEN `npx nx run-many -t test` is executed for those 4 projects
- THEN all tests exit with code 0
- AND results are reported in Vitest format

### Requirement: Real Angular Component Test with TestBed

The Angular test suite MUST contain at least one test that renders a real Angular component using `TestBed.createComponent()`. A test that only performs arithmetic or string assertions does NOT satisfy this requirement.

#### Scenario: TestBed component test passes

- GIVEN `apps/web` has a scaffolded root component
- WHEN the test suite is executed via the selected runner
- THEN a test using `TestBed.createComponent()` passes
- AND the test asserts the component renders without errors (e.g., component instance is truthy, or fixture element is present)

### Requirement: Coverage Available

Coverage reporting MUST be available for all 5 projects.

#### Scenario: Coverage report generated for a core lib

- GIVEN `libs/core-domain` has at least one passing test
- WHEN `npx nx test core-domain --coverage` is executed
- THEN a coverage report is generated in the project's output directory
- AND the command exits with code 0

### Requirement: ADR Documents Testing Strategy

`docs/decisions/ADR-0001.md` MUST be created and MUST include:
- Exact Nx v21 patch version selected and rationale
- Node.js and npm versions validated
- Angular test runner chosen (Vitest or Jest fallback)
- Spike outcome: pass (with evidence) or fail (with exact error and fallback decision)

#### Scenario: ADR is present and complete

- GIVEN Day 1 setup is complete
- WHEN `docs/decisions/ADR-0001.md` is read
- THEN it contains all four required sections: Nx version, Node/npm versions, Angular test strategy, spike outcome
