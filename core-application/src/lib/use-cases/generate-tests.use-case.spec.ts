import { describe, it, expect, vi } from 'vitest';
import { GenerateTestsUseCase, GenerateTestsError } from './generate-tests.use-case';
import type { FileSystemPort } from '../ports/file-system.port';
import type { RouteMapReaderPort } from '../ports/route-map-reader.port';
import type { TestSuiteWriterPort } from '../ports/test-suite-writer.port';
import type { RouteMap, RouteMapEntry } from '@ai-web-qa-tester/core-domain';

function makeFs(exists = true): FileSystemPort {
  return { exists: vi.fn().mockReturnValue(exists), isDirectory: vi.fn().mockReturnValue(true) };
}
function makeReader(entries: RouteMapEntry[] = []): RouteMapReaderPort {
  const routeMap: RouteMap = { mappedAt: '2026-01-01T00:00:00.000Z', entries };
  return { read: vi.fn().mockResolvedValue(routeMap) };
}
function makeWriter(): TestSuiteWriterPort {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

const exactGet: RouteMapEntry = {
  angularService: 'ProductsService',
  httpCall: { method: 'GET', urlPattern: '/api/products' },
  matchedEndpoint: { controller: 'ProductsController', endpoint: { method: 'GET', path: 'products' } },
  confidence: 'exact',
};
const exactPost: RouteMapEntry = {
  angularService: 'ProductsService',
  httpCall: { method: 'POST', urlPattern: '/api/products' },
  matchedEndpoint: { controller: 'ProductsController', endpoint: { method: 'POST', path: 'products' } },
  confidence: 'exact',
};
const noneEntry: RouteMapEntry = {
  angularService: 'ProductsService',
  httpCall: { method: 'PUT', urlPattern: '/api/products' },
  matchedEndpoint: null,
  confidence: 'none',
};

describe('GenerateTestsUseCase', () => {
  it('GET exact → active test, expectedStatus 200', async () => {
    const suite = await new GenerateTestsUseCase(makeFs(), makeReader([exactGet]), makeWriter()).execute({ backendPath: '.' });
    expect(suite.entries[0].skipped).toBe(false);
    expect(suite.entries[0].expectedStatus).toBe(200);
    expect(suite.entries[0].confidence).toBe('exact');
  });

  it('POST exact → active test, expectedStatus 201', async () => {
    const suite = await new GenerateTestsUseCase(makeFs(), makeReader([exactPost]), makeWriter()).execute({ backendPath: '.' });
    expect(suite.entries[0].skipped).toBe(false);
    expect(suite.entries[0].expectedStatus).toBe(201);
  });

  it('confidence: none → skipped: true', async () => {
    const suite = await new GenerateTestsUseCase(makeFs(), makeReader([noneEntry]), makeWriter()).execute({ backendPath: '.' });
    expect(suite.entries[0].skipped).toBe(true);
  });

  it('empty entries → entries: [], no throw', async () => {
    const suite = await new GenerateTestsUseCase(makeFs(), makeReader([]), makeWriter()).execute({ backendPath: '.' });
    expect(suite.entries).toHaveLength(0);
  });

  it('missing route-map.json → throws GenerateTestsError with file path', async () => {
    const useCase = new GenerateTestsUseCase(makeFs(false), makeReader(), makeWriter());
    await expect(useCase.execute({ backendPath: '/some/backend' })).rejects.toThrow(GenerateTestsError);
    await expect(useCase.execute({ backendPath: '/some/backend' })).rejects.toThrow('route-map.json');
  });

  it('with aiEnricher → enriched fields merged into output', async () => {
    const enriched = { requestBody: { name: 'Widget' }, responseAssertions: ["expect(body).toHaveProperty('id')"] };
    const aiEnricher = { enrich: vi.fn().mockResolvedValue(enriched) };
    const useCase = new GenerateTestsUseCase(makeFs(), makeReader([exactGet]), makeWriter(), aiEnricher);
    const suite = await useCase.execute({ backendPath: '.' });
    expect(suite.entries[0].requestBody).toEqual({ name: 'Widget' });
    expect(suite.entries[0].responseAssertions).toHaveLength(1);
    expect(aiEnricher.enrich).toHaveBeenCalledOnce();
  });

  it('skipped spec with aiEnricher → enrich() not called', async () => {
    const aiEnricher = { enrich: vi.fn() };
    const useCase = new GenerateTestsUseCase(makeFs(), makeReader([noneEntry]), makeWriter(), aiEnricher);
    await useCase.execute({ backendPath: '.' });
    expect(aiEnricher.enrich).not.toHaveBeenCalled();
  });

  it('aiEnricher returns errorCases → flattened as separate entries before happy path', async () => {
    const enriched = {
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
    };
    const aiEnricher = { enrich: vi.fn().mockResolvedValue(enriched) };
    const useCase = new GenerateTestsUseCase(makeFs(), makeReader([exactPost]), makeWriter(), aiEnricher);
    const suite = await useCase.execute({ backendPath: '.' });
    expect(suite.entries).toHaveLength(2);
    const [errorCase, happyPath] = suite.entries;
    expect(errorCase.expectedStatus).toBe(422);
    expect(errorCase.requestBody).toEqual({});
    expect(errorCase.skipped).toBe(false);
    expect(happyPath.expectedStatus).toBe(201);
    expect(happyPath.requestBody).toEqual({ name: 'Widget', price: 9.99 });
  });
});
