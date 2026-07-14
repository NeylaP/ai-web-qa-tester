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
});
