import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { TsMorphAngularAnalyzer } from './ts-morph-angular-analyzer';

const labFrontend = path.resolve(__dirname, '../../../lab/frontend');
const tsConfigPath = path.join(labFrontend, 'tsconfig.json');

describe('TsMorphAngularAnalyzer', () => {
  const analyzer = new TsMorphAngularAnalyzer();

  it('detects all @Component classes', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    const names = result.components.map((c) => c.name);
    expect(names).toContain('AppComponent');
    expect(names).toContain('ProductsComponent');
    expect(names).toContain('ProductDetailComponent');
  });

  it('extracts selector from @Component', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    const app = result.components.find((c) => c.name === 'AppComponent');
    expect(app?.selector).toBe('app-root');

    const products = result.components.find((c) => c.name === 'ProductsComponent');
    expect(products?.selector).toBe('app-products');
  });

  it('detects @Injectable services', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    const names = result.services.map((s) => s.name);
    expect(names).toContain('ProductsService');
  });

  it('extracts literal HTTP calls from services', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    const svc = result.services.find((s) => s.name === 'ProductsService');
    expect(svc?.httpCalls.length).toBeGreaterThan(0);

    const methods = svc?.httpCalls.map((h) => h.method) ?? [];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('extracts route path strings', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    expect(result.routes).toContain('');
    expect(result.routes).toContain(':id');
  });

  it('returns file paths as forward-slash relative paths', async () => {
    const result = await analyzer.analyze(labFrontend, tsConfigPath);

    for (const c of result.components) {
      expect(path.isAbsolute(c.filePath)).toBe(false);
      expect(c.filePath).not.toContain('\\');
    }
  });
});
