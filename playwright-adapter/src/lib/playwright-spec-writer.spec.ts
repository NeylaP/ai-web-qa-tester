import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PlaywrightSpecWriter } from './playwright-spec-writer';
import type { TestSuite } from '@ai-web-qa-tester/core-domain';

let tmpDir: string;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeSuite(entries: TestSuite['entries']): TestSuite {
  return { generatedAt: '2026-01-01T00:00:00.000Z', entries };
}

describe('PlaywrightSpecWriter', () => {
  it('groups specs by controller → writes test.describe file', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-writer-'));
    const outputDir = path.join(tmpDir, 'tests');
    const suite = makeSuite([
      { title: 'GET /api/products — exact', method: 'GET', endpoint: '/api/products', expectedStatus: 200, confidence: 'exact', skipped: false, controllerName: 'ProductsController' },
      { title: 'POST /api/products — exact', method: 'POST', endpoint: '/api/products', expectedStatus: 201, confidence: 'exact', skipped: false, controllerName: 'ProductsController' },
    ]);

    await new PlaywrightSpecWriter().write(suite, tmpDir, outputDir);

    const files = fs.readdirSync(outputDir);
    expect(files).toContain('ProductsController.spec.ts');
    const content = fs.readFileSync(path.join(outputDir, 'ProductsController.spec.ts'), 'utf8');
    expect(content).toContain("test.describe('ProductsController'");
    expect(content).toContain('toBe(200)');
    expect(content).toContain('toBe(201)');
  });

  it('skipped spec → test.skip with contract-gap comment', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-writer-'));
    const outputDir = path.join(tmpDir, 'tests');
    const suite = makeSuite([
      { title: 'PUT /api/products — none', method: 'PUT', endpoint: '/api/products', expectedStatus: 0, confidence: 'none', skipped: true, controllerName: 'ProductsService' },
    ]);

    await new PlaywrightSpecWriter().write(suite, tmpDir, outputDir);

    const content = fs.readFileSync(path.join(outputDir, 'ProductsService.spec.ts'), 'utf8');
    expect(content).toContain('test.skip(');
    expect(content).toContain('Contract gap');
  });

  it('writes test-suite.json to .qa/', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-writer-'));
    const outputDir = path.join(tmpDir, 'tests');
    const suite = makeSuite([]);

    await new PlaywrightSpecWriter().write(suite, tmpDir, outputDir);

    const jsonPath = path.join(tmpDir, '.qa', 'test-suite.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(parsed.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('requestBody present → used in request call instead of {}', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-writer-'));
    const outputDir = path.join(tmpDir, 'tests');
    const suite = makeSuite([
      { title: 'POST /api/products - exact', method: 'POST', endpoint: '/api/products', expectedStatus: 201, confidence: 'exact', skipped: false, controllerName: 'ProductsController', requestBody: { name: 'Widget', price: 9.99 } },
    ]);

    await new PlaywrightSpecWriter().write(suite, tmpDir, outputDir);

    const content = fs.readFileSync(path.join(outputDir, 'ProductsController.spec.ts'), 'utf8');
    expect(content).toContain('"name":"Widget"');
    expect(content).not.toContain('{ data: {} }');
  });

  it('responseAssertions present → assertion lines in test body', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-writer-'));
    const outputDir = path.join(tmpDir, 'tests');
    const suite = makeSuite([
      { title: 'GET /api/products - exact', method: 'GET', endpoint: '/api/products', expectedStatus: 200, confidence: 'exact', skipped: false, controllerName: 'ProductsController', responseAssertions: ["expect(body).toHaveProperty('id')"] },
    ]);

    await new PlaywrightSpecWriter().write(suite, tmpDir, outputDir);

    const content = fs.readFileSync(path.join(outputDir, 'ProductsController.spec.ts'), 'utf8');
    expect(content).toContain('const body = await response.json()');
    expect(content).toContain("expect(body).toHaveProperty('id')");
  });
});
