# Test Generation Specification

## Purpose

Defines requirements for generating Playwright `.spec.ts` test files from a `route-map.json`. Generation is template-based and confidence-aware: exact/partial routes produce active tests; unmatched routes (confidence: none) produce skipped tests with a contract-gap comment.

## Requirements

### Requirement: Route Map Input

The system MUST read `<backendPath>/.qa/route-map.json` to obtain the `RouteMap`. If the file does not exist or is not valid JSON, the system MUST throw a `GenerateTestsError` with a message containing the expected file path.

#### Scenario: Missing route-map.json

- GIVEN a backend path whose `.qa/` directory has no `route-map.json`
- WHEN `generate` is executed
- THEN the system throws `GenerateTestsError` containing the expected file path

### Requirement: TestSpec Derivation

The system MUST transform each `RouteMapEntry` into a `TestSpec` following these rules:

| confidence   | skipped | expectedStatus (by method)                        |
|--------------|---------|---------------------------------------------------|
| exact/partial | false  | GET→200, POST→201, PUT→200, PATCH→200, DELETE→200 |
| none          | true   | — (skipped, no assertion)                         |

The `title` MUST follow the pattern: `{method} {endpoint} — {confidence}`.

#### Scenario: Exact match active test

- GIVEN a RouteMapEntry with method GET, urlPattern `/api/products`, confidence `exact`
- WHEN GenerateTestsUseCase executes
- THEN a TestSpec is produced with `skipped: false`, `expectedStatus: 200`, `endpoint: 'products'`

#### Scenario: POST creates 201

- GIVEN a RouteMapEntry with method POST, urlPattern `/api/products`, confidence `exact`
- WHEN GenerateTestsUseCase executes
- THEN a TestSpec is produced with `skipped: false`, `expectedStatus: 201`

#### Scenario: No-match entry becomes skipped

- GIVEN a RouteMapEntry with method PUT, urlPattern `/api/products`, confidence `none`
- WHEN GenerateTestsUseCase executes
- THEN a TestSpec is produced with `skipped: true`

#### Scenario: Empty route map

- GIVEN a RouteMap with zero entries
- WHEN GenerateTestsUseCase executes
- THEN a TestSuite is produced with `entries: []` and no error is thrown

### Requirement: Spec File Output

The system MUST write one Playwright `.spec.ts` file per controller group under `<outputDir>/`. When `--output` is not provided, `outputDir` MUST default to `<backendPath>/.qa/tests/`. Each file MUST contain a `test.describe('{controllerName}')` block.

#### Scenario: Grouped by controller

- GIVEN a TestSuite with two specs both matched to `ProductsController`
- WHEN PlaywrightSpecWriter writes output
- THEN a single file `ProductsController.spec.ts` is written containing both tests inside one `test.describe`

#### Scenario: Skipped test format

- GIVEN a TestSpec with `skipped: true`
- WHEN PlaywrightSpecWriter writes output
- THEN the spec uses `test.skip('{title}', ...)` with a comment `// Contract gap: no matching endpoint found`

### Requirement: JSON Artifact

The system MUST write `<backendPath>/.qa/test-suite.json` containing the serialized `TestSuite` (generatedAt timestamp + entries array).

#### Scenario: JSON written alongside spec files

- GIVEN a successful test generation run
- WHEN the command completes
- THEN `<backendPath>/.qa/test-suite.json` exists and contains a valid `TestSuite` object
