import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { TsMorphNestAnalyzer } from './ts-morph-nest-analyzer';

const labBackend = path.resolve(__dirname, '../../../lab/backend');
const tsConfigPath = path.join(labBackend, 'tsconfig.json');

describe('TsMorphNestAnalyzer', () => {
  const analyzer = new TsMorphNestAnalyzer();

  it('detects @Controller classes', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const names = result.controllers.map((c) => c.name);
    expect(names).toContain('ProductsController');
  });

  it('extracts basePath from @Controller', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const ctrl = result.controllers.find((c) => c.name === 'ProductsController');
    expect(ctrl?.basePath).toBe('products');
  });

  it('extracts all 5 endpoints with correct HTTP methods', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const ctrl = result.controllers.find((c) => c.name === 'ProductsController');
    expect(ctrl?.endpoints).toHaveLength(5);

    const methods = ctrl?.endpoints.map((e) => e.method) ?? [];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PATCH');
    expect(methods).toContain('DELETE');
  });

  it('combines base path and method path for endpoints', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const ctrl = result.controllers.find((c) => c.name === 'ProductsController');
    const paths = ctrl?.endpoints.map((e) => e.path) ?? [];
    expect(paths).toContain('products');
    expect(paths).toContain('products/:id');
  });

  it('detects @Injectable services', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const names = result.services.map((s) => s.name);
    expect(names).toContain('ProductsService');
  });

  it('detects DTOs with their field names', async () => {
    const result = await analyzer.analyze(labBackend, tsConfigPath);

    const createDto = result.dtos.find((d) => d.name === 'CreateProductDto');
    expect(createDto?.fields).toContain('name');
    expect(createDto?.fields).toContain('price');

    const updateDto = result.dtos.find((d) => d.name === 'UpdateProductDto');
    expect(updateDto?.fields).toContain('name');
    expect(updateDto?.fields).toContain('price');
  });
});
