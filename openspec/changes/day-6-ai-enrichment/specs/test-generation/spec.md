# Delta for Test Generation

## ADDED Requirements

### Requirement: Enriched TestSpec Fields

A `TestSpec` MAY carry optional enrichment fields populated by the AI layer:
- `requestBody?: Record<string, unknown>` — realistic sample payload for POST/PUT/PATCH
- `responseAssertions?: string[]` — Playwright assertion strings for the response body

When not enriched, these fields MUST be absent (not set to null or empty).

#### Scenario: Enriched POST spec has requestBody

- GIVEN a POST TestSpec enriched with `requestBody: { name: "Widget", price: 9.99 }`
- WHEN PlaywrightSpecWriter writes the spec file
- THEN the generated test passes `{ data: { name: "Widget", price: 9.99 } }` to `request.post()`

#### Scenario: Enriched GET spec has responseAssertions

- GIVEN a GET TestSpec enriched with `responseAssertions: ["expect(body).toHaveProperty('id')"]`
- WHEN PlaywrightSpecWriter writes the spec file
- THEN the generated test includes `const body = await response.json();` and the assertion line

#### Scenario: Unenriched spec uses template defaults

- GIVEN a TestSpec with no `requestBody` or `responseAssertions`
- WHEN PlaywrightSpecWriter writes the spec file
- THEN the generated test uses `{ data: {} }` as body and only the status code assertion

### Requirement: Enrichment Opt-In via CLI Flag

The `generate` command MUST support an optional `--enrich` flag. Without this flag, generation MUST behave identically to Day 5 (template-based only). With `--enrich`, the AI enricher MUST be injected into `GenerateTestsUseCase`.

#### Scenario: generate without --enrich is identical to Day 5

- GIVEN a valid route map and no `--enrich` flag
- WHEN `generate --backend <path>` is executed
- THEN the output is identical to Day 5 template-based generation with no AI calls made
