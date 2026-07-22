import { z } from 'zod';
import type { TestSpec, AiProvider } from '@ai-web-qa-tester/core-domain';
import type { AiEnricherPort, AiEnrichment } from '@ai-web-qa-tester/core-application';

const needsBody = (method: string): boolean => ['POST', 'PUT', 'PATCH'].includes(method);

const ErrorCaseSchema = z.object({
  title: z.string(),
  requestBody: z.record(z.string(), z.unknown()),
  expectedStatus: z.number(),
  responseAssertions: z.array(z.string()).max(3).optional(),
});

const EnrichmentSchema = z.object({
  requestBody: z.record(z.string(), z.unknown()).optional(),
  responseAssertions: z.array(z.string()).max(5).optional(),
  errorCases: z.array(ErrorCaseSchema).max(2).optional().catch(() => undefined),
});

function buildPrompt(spec: TestSpec, controllerSource?: string): string {
  const withBody = needsBody(spec.method);
  const lines = [
    'You are a QA test generator for REST APIs. Generate enrichment data for this endpoint.',
    '',
    `Method: ${spec.method}`,
    `URL: ${spec.endpoint}`,
    `Controller: ${spec.controllerName}`,
  ];

  if (controllerSource) {
    lines.push('', `Controller source (first 2000 chars):\n${controllerSource.slice(0, 2000)}`);
  }

  lines.push(
    '',
    'Rules:',
    '- Infer realistic field names from the URL path, HTTP method, and controller name.',
    '- responseAssertions must use ONLY these exact formats:',
    "    \"expect(body).toHaveProperty('fieldName')\"",
    "    \"expect(typeof body.fieldName).toBe('string')\"  or 'number' or 'boolean'",
    "    \"expect(body.fieldName).toBeTruthy()\"",
    '',
    'Return ONLY valid JSON (no markdown, no explanation):',
    '{',
    withBody ? '  "requestBody": { /* realistic valid fields for a 2xx response */ },' : '',
    '  "responseAssertions": [ /* 2-4 assertions about the response body */ ]',
  );

  if (withBody) {
    lines.push(
      '  "errorCases": [',
      '    {',
      `      "title": "${spec.method} ${spec.endpoint} with missing required fields returns 422",`,
      '      "requestBody": {},',
      '      "expectedStatus": 422,',
      "      \"responseAssertions\": [\"expect(body).toHaveProperty('message')\"]",
      '    }',
      '  ]',
    );
  }

  lines.push('}');
  return lines.filter((l) => l !== '').join('\n');
}

export class AiEnricher implements AiEnricherPort {
  constructor(private readonly provider: AiProvider) {}

  async enrich(spec: TestSpec, controllerSource?: string): Promise<AiEnrichment> {
    try {
      const raw = await this.provider.complete(buildPrompt(spec, controllerSource));
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
