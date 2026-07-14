# AI Enrichment Specification

## Purpose

Defines requirements for enriching template-based `TestSpec` entries with AI-generated request bodies and response assertions, using a provider-agnostic `AiProvider` interface with Zod-validated output and graceful fallback on failure.

## Requirements

### Requirement: Provider-Agnostic AI Interface

The system MUST expose an `AiProvider` interface with a single `complete(prompt: string): Promise<string>` method. Concrete providers (e.g., Anthropic) MUST implement this interface. No consumer of `AiProvider` MUST depend on provider-specific types.

#### Scenario: Anthropic provider completes a prompt

- GIVEN a configured `AnthropicProvider` with a valid `ANTHROPIC_API_KEY`
- WHEN `complete(prompt)` is called
- THEN it returns the model's text response as a string

### Requirement: Enrichment Output Validation

The AI response MUST be parsed as JSON and validated against a Zod schema. If parsing or validation fails, the system MUST return the original unenriched `TestSpec` unchanged. The system MUST NOT throw; failure MUST be silent with the fallback applied.

#### Scenario: Valid AI response enriches the spec

- GIVEN a TestSpec for POST /api/products and AI returns `{"requestBody":{"name":"Widget","price":9.99},"responseAssertions":["expect(body).toHaveProperty('id')"]}`
- WHEN `AiEnricher.enrich()` is called
- THEN the TestSpec gains `requestBody` and `responseAssertions` fields

#### Scenario: Invalid AI response falls back silently

- GIVEN a TestSpec and AI returns malformed JSON (e.g., `"not json"`)
- WHEN `AiEnricher.enrich()` is called
- THEN the original TestSpec is returned unchanged with no error thrown

#### Scenario: AI network error falls back silently

- GIVEN a TestSpec and the AI call throws a network error
- WHEN `AiEnricher.enrich()` is called
- THEN the original TestSpec is returned unchanged with no error thrown

### Requirement: Skipped Specs Not Enriched

The system MUST NOT call the AI for `TestSpec` entries with `skipped: true`. Enrichment MUST only apply to active (non-skipped) specs.

#### Scenario: Skipped spec bypasses AI

- GIVEN a TestSpec with `skipped: true`
- WHEN enrichment is requested
- THEN no AI call is made and the spec is returned as-is

### Requirement: API Key Validation

The system MUST check that `ANTHROPIC_API_KEY` env var is set before injecting the AI enricher. If missing, the CLI MUST exit with a clear error message before any AI call is attempted.

#### Scenario: Missing API key

- GIVEN `--enrich` flag is provided but `ANTHROPIC_API_KEY` is not set
- WHEN the `generate --enrich` command is executed
- THEN the CLI exits with a non-zero code and a message containing `ANTHROPIC_API_KEY`
