# Proposal: Day 6 — AI Test Enrichment

## Intent

The tests generated in Day 5 only assert HTTP status codes. Day 6 adds an optional AI enrichment pass that, given the route map and DTO context, generates realistic request bodies and response assertions — producing tests that actually validate contracts, not just liveness.

## Scope

### In Scope
- New `AiProvider` interface in `core-domain` (provider-agnostic LLM abstraction)
- New `AiEnricherPort` in `core-application` (test-enrichment contract)
- New Nx lib `ai-orchestrator` (type:infrastructure): `AnthropicProvider` + `AiEnricher` with Zod validation
- Extend `TestSpec` with optional `requestBody?` and `responseAssertions?` fields
- Update `GenerateTestsUseCase` to accept optional `AiEnricherPort` (Strategy pattern)
- Update `PlaywrightSpecWriter` to emit enriched test body when fields are present
- CLI: `--enrich` flag on `generate` command (requires `ANTHROPIC_API_KEY` env var)
- Graceful fallback: if AI fails or flag absent → Day 5 template behavior preserved

### Out of Scope
- Parallel AI calls (sequential only for MVP)
- AI-generated additional test cases (validation/error scenarios) — Day 7
- Non-Anthropic providers (OpenAI, etc.) — future
- Caching AI results — future

## Capabilities

### New Capabilities
- `ai-enrichment`: enrich TestSpecs with AI-generated request bodies and response assertions; provider-agnostic via AiProvider interface; Zod-validated output; graceful fallback on failure

### Modified Capabilities
- `test-generation`: TestSpec gains optional `requestBody?` and `responseAssertions?` fields; PlaywrightSpecWriter uses them when present; behavior unchanged when fields absent

## Approach

Strategy pattern. `AiEnricherPort` is an optional constructor argument in `GenerateTestsUseCase`. When `null`, the use case behaves exactly as Day 5. When injected, it enriches each non-skipped `TestSpec` by calling AI with a prompt that includes the HTTP method, endpoint, DTO fields, and expected status. AI response is validated with Zod — on failure the original spec is kept unchanged.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `core-domain/src/lib/test-spec.ts` | Modified | add `requestBody?`, `responseAssertions?` |
| `core-domain/src/lib/ai-provider.ts` | New | `AiProvider` interface |
| `core-domain/src/index.ts` | Modified | re-export `AiProvider` |
| `core-application/src/lib/ports/ai-enricher.port.ts` | New | `AiEnricherPort` |
| `core-application/src/lib/use-cases/generate-tests.use-case.ts` | Modified | optional `AiEnricherPort` |
| `core-application/src/index.ts` | Modified | re-export new port |
| `ai-orchestrator/` | New Nx lib | `AnthropicProvider`, `AiEnricher` (Zod) |
| `playwright-adapter/src/lib/playwright-spec-writer.ts` | Modified | use enriched fields |
| `cli/src/main.ts` | Modified | `--enrich` flag |
| `tsconfig.base.json` | Modified | path alias for ai-orchestrator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AI returns invalid JSON | Med | Zod parse; on failure keep original spec |
| `ANTHROPIC_API_KEY` missing | Med | CLI checks env var before injecting; clear error message |
| `@nx/dependency-checks` missing deps | Med | List all deps in ai-orchestrator/package.json |

## Rollback Plan

All new code. Delete `ai-orchestrator/`, revert `generate-tests.use-case.ts`, `test-spec.ts`, `playwright-spec-writer.ts`, `cli/src/main.ts`. Day 5 behavior fully restored — no data migration needed.

## Dependencies

- `zod` — installed ✅
- `@anthropic-ai/sdk` — installed ✅
- `ANTHROPIC_API_KEY` env var at runtime

## Success Criteria

- [ ] `node dist/cli/main.js generate --backend lab/backend --enrich` exits 0
- [ ] Generated POST spec contains a realistic `requestBody` (not `{}`)
- [ ] Generated GET spec contains at least one `responseAssertions` line
- [ ] Without `--enrich`, output is identical to Day 5
- [ ] All 7+ projects pass lint + build + test
