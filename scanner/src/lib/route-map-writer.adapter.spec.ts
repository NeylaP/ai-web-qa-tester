import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RouteMapWriter } from './route-map-writer.adapter';
import type { RouteMap } from '@ai-web-qa-tester/core-domain';

const sampleRouteMap: RouteMap = {
  mappedAt: '2026-07-12T00:00:00.000Z',
  entries: [
    {
      angularService: 'ProductsService',
      httpCall: { method: 'GET', urlPattern: '/api/products' },
      matchedEndpoint: {
        controller: 'ProductsController',
        endpoint: { method: 'GET', path: 'products' },
      },
      confidence: 'exact',
    },
  ],
};

describe('RouteMapWriter', () => {
  const tmpDirs: string[] = [];

  function tmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-rm-writer-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  const writer = new RouteMapWriter();

  it('creates .qa/route-map.json inside targetDir', async () => {
    const dir = tmpDir();

    await writer.write(sampleRouteMap, dir);

    expect(fs.existsSync(path.join(dir, '.qa', 'route-map.json'))).toBe(true);
  });

  it('writes valid JSON that matches the route map shape', async () => {
    const dir = tmpDir();

    await writer.write(sampleRouteMap, dir);

    const raw = fs.readFileSync(path.join(dir, '.qa', 'route-map.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual(sampleRouteMap);
  });
});
