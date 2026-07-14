import { z } from 'zod';
import type { TestSpec, AiProvider } from '@ai-web-qa-tester/core-domain';
import type { AiEnricherPort } from '@ai-web-qa-tester/core-application';

const EnrichmentSchema = z.object({
  requestBody: z.record(z.string(), z.unknown()).optional(),
  responseAssertions: z.array(z.string()).max(5).optional(),
});

function buildPrompt(spec: TestSpec): string {
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(spec.method);
  return [
    'You are a QA test generator. Generate enrichment data for this API endpoint test:',
    '',
    `Method: ${spec.method}`,
    `URL: ${spec.endpoint}`,
    `Expected Status: ${spec.expectedStatus}`,
    `Controller: ${spec.controllerName}`,
    '',
    'Return ONLY valid JSON with this exact structure (no explanation, no markdown):',
    '{',
    needsBody
      ? '  "requestBody": { /* realistic sample request body fields */ },'
      : '  /* no requestBody for GET/DELETE */',
    '  "responseAssertions": [ /* 1-3 strings using format: expect(body).toHaveProperty(\'fieldName\') */ ]',
    '}',
  ].join('\n');
}

export class AiEnricher implements AiEnricherPort {
  constructor(private readonly provider: AiProvider) {}

  async enrich(spec: TestSpec): Promise<Partial<TestSpec>> {
    try {
      const raw = await this.provider.complete(buildPrompt(spec));
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const result = EnrichmentSchema.safeParse(parsed);
      if (!result.success) return {};
      return result.data;
    } catch {
      return {};
    }
  }
}
