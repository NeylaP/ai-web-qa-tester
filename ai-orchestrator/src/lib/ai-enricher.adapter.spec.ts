import { describe, it, expect, vi } from 'vitest';
import { AiEnricher } from './ai-enricher.adapter';
import type { AiProvider, TestSpec } from '@ai-web-qa-tester/core-domain';

function makeProvider(response: string | Error): AiProvider {
  if (response instanceof Error) {
    return { complete: vi.fn().mockRejectedValue(response) };
  }
  return { complete: vi.fn().mockResolvedValue(response) };
}

const baseSpec: TestSpec = {
  title: 'POST /api/products - exact',
  method: 'POST',
  endpoint: '/api/products',
  expectedStatus: 201,
  confidence: 'exact',
  skipped: false,
  controllerName: 'ProductsController',
};

describe('AiEnricher', () => {
  it('valid AI JSON → enriched spec with requestBody and responseAssertions', async () => {
    const json = JSON.stringify({
      requestBody: { name: 'Widget', price: 9.99 },
      responseAssertions: ["expect(body).toHaveProperty('id')"],
    });
    const enricher = new AiEnricher(makeProvider(json));
    const result = await enricher.enrich(baseSpec);
    expect(result.requestBody).toEqual({ name: 'Widget', price: 9.99 });
    expect(result.responseAssertions).toHaveLength(1);
  });

  it('invalid JSON from AI → returns {} (original spec unchanged)', async () => {
    const enricher = new AiEnricher(makeProvider('not valid json at all'));
    const result = await enricher.enrich(baseSpec);
    expect(result).toEqual({});
  });

  it('AI call throws → returns {} (no error thrown)', async () => {
    const enricher = new AiEnricher(makeProvider(new Error('network error')));
    const result = await enricher.enrich(baseSpec);
    expect(result).toEqual({});
  });

  it('partial valid JSON (only requestBody) → returns only requestBody', async () => {
    const json = JSON.stringify({ requestBody: { name: 'Test' } });
    const enricher = new AiEnricher(makeProvider(json));
    const result = await enricher.enrich(baseSpec);
    expect(result.requestBody).toEqual({ name: 'Test' });
    expect(result.responseAssertions).toBeUndefined();
  });

  it('POST with errorCases in AI response → errorCases returned', async () => {
    const json = JSON.stringify({
      requestBody: { name: 'Widget', price: 9.99 },
      responseAssertions: ["expect(body).toHaveProperty('id')"],
      errorCases: [
        {
          title: 'POST /api/products with missing required fields returns 422',
          requestBody: {},
          expectedStatus: 422,
          responseAssertions: ["expect(body).toHaveProperty('message')"],
        },
      ],
    });
    const enricher = new AiEnricher(makeProvider(json));
    const result = await enricher.enrich(baseSpec);
    expect(result.errorCases).toHaveLength(1);
    expect(result.errorCases![0].expectedStatus).toBe(422);
    expect(result.errorCases![0].requestBody).toEqual({});
  });

  it('errorCases with invalid shape → errorCases silently dropped, requestBody preserved', async () => {
    const json = JSON.stringify({
      requestBody: { name: 'Test' },
      errorCases: [{ invalid: 'no title or requestBody or expectedStatus' }],
    });
    const enricher = new AiEnricher(makeProvider(json));
    const result = await enricher.enrich(baseSpec);
    expect(result.errorCases).toBeUndefined();
    expect(result.requestBody).toEqual({ name: 'Test' });
  });
});
