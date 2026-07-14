import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { BuildRouteMapUseCase, RouteMapError } from './build-route-map.use-case';
import type { FileSystemPort } from '../ports/file-system.port';
import type { InventoryReaderPort } from '../ports/inventory-reader.port';
import type { RouteMapWriterPort } from '../ports/route-map-writer.port';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';

const backendAbs = path.resolve('test-backend');
const inventoryPath = path.join(backendAbs, '.qa', 'component-inventory.json');

const stubInventory: ComponentInventory = {
  analyzedAt: '2026-07-12T00:00:00.000Z',
  angular: {
    components: [],
    services: [
      {
        name: 'ProductsService',
        filePath: 'src/products/products.service.ts',
        httpCalls: [
          { method: 'GET', urlPattern: '/api/products' },
          { method: 'GET', urlPattern: '/api/products/123' },
          { method: 'PUT', urlPattern: '/api/products' },
        ],
      },
    ],
    routes: [],
  },
  nestjs: {
    controllers: [
      {
        name: 'ProductsController',
        basePath: 'products',
        filePath: 'src/products/products.controller.ts',
        endpoints: [
          { method: 'GET', path: 'products' },
          { method: 'GET', path: 'products/:id' },
          { method: 'POST', path: 'products' },
          { method: 'PATCH', path: 'products/:id' },
          { method: 'DELETE', path: 'products/:id' },
        ],
      },
    ],
    services: [],
    dtos: [],
  },
};

function makeMocks(inventoryExists = true) {
  const mockFs: FileSystemPort = {
    exists: vi.fn((p: string) => p === inventoryPath && inventoryExists),
    isDirectory: vi.fn(() => true),
  };
  const mockReader: InventoryReaderPort = { read: vi.fn(async () => stubInventory) };
  const mockWriter: RouteMapWriterPort = { write: vi.fn(async () => undefined) };
  return { mockFs, mockReader, mockWriter };
}

describe('BuildRouteMapUseCase', () => {
  it('produces exact confidence for GET /api/products → GET products', async () => {
    const { mockFs, mockReader, mockWriter } = makeMocks();
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    const result = await useCase.execute({ backendPath: 'test-backend' });

    const entry = result.entries.find(
      (e) => e.httpCall.method === 'GET' && e.httpCall.urlPattern === '/api/products',
    );
    expect(entry?.confidence).toBe('exact');
    expect(entry?.matchedEndpoint?.controller).toBe('ProductsController');
  });

  it('produces partial confidence for GET /api/products/123 → GET products/:id', async () => {
    const { mockFs, mockReader, mockWriter } = makeMocks();
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    const result = await useCase.execute({ backendPath: 'test-backend' });

    const entry = result.entries.find(
      (e) => e.httpCall.urlPattern === '/api/products/123',
    );
    expect(entry?.confidence).toBe('partial');
    expect(entry?.matchedEndpoint?.endpoint.path).toBe('products/:id');
  });

  it('produces none confidence for PUT /api/products (no PUT endpoint exists)', async () => {
    const { mockFs, mockReader, mockWriter } = makeMocks();
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    const result = await useCase.execute({ backendPath: 'test-backend' });

    const entry = result.entries.find((e) => e.httpCall.method === 'PUT');
    expect(entry?.confidence).toBe('none');
    expect(entry?.matchedEndpoint).toBeNull();
  });

  it('produces one entry per httpCall', async () => {
    const { mockFs, mockReader, mockWriter } = makeMocks();
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    const result = await useCase.execute({ backendPath: 'test-backend' });

    expect(result.entries).toHaveLength(3);
  });

  it('throws RouteMapError when component-inventory.json is missing', async () => {
    const { mockFs, mockReader, mockWriter } = makeMocks(false);
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    await expect(useCase.execute({ backendPath: 'test-backend' }))
      .rejects.toThrow(RouteMapError);
    await expect(useCase.execute({ backendPath: 'test-backend' }))
      .rejects.toThrow("run 'analyze' first");
  });

  it('produces empty entries when no angular services have httpCalls', async () => {
    const emptyInventory: ComponentInventory = {
      ...stubInventory,
      angular: { ...stubInventory.angular, services: [] },
    };
    const mockFs: FileSystemPort = {
      exists: vi.fn(() => true),
      isDirectory: vi.fn(() => true),
    };
    const mockReader: InventoryReaderPort = { read: vi.fn(async () => emptyInventory) };
    const mockWriter: RouteMapWriterPort = { write: vi.fn(async () => undefined) };
    const useCase = new BuildRouteMapUseCase(mockFs, mockReader, mockWriter);

    const result = await useCase.execute({ backendPath: 'test-backend' });

    expect(result.entries).toHaveLength(0);
  });
});
