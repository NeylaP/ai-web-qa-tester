import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RouteMapReader } from './route-map-reader.adapter';

let tmpDir: string;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('RouteMapReader', () => {
  it('reads valid route-map.json from .qa dir', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-map-reader-'));
    const qaDir = path.join(tmpDir, '.qa');
    fs.mkdirSync(qaDir);
    const routeMap = { mappedAt: '2026-01-01T00:00:00.000Z', entries: [] };
    fs.writeFileSync(path.join(qaDir, 'route-map.json'), JSON.stringify(routeMap), 'utf8');

    const reader = new RouteMapReader();
    const result = await reader.read(tmpDir);

    expect(result.mappedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.entries).toHaveLength(0);
  });

  it('throws when route-map.json is missing', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-map-reader-'));
    const reader = new RouteMapReader();
    await expect(reader.read(tmpDir)).rejects.toThrow();
  });
});
