import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ComponentInventoryReader } from './component-inventory-reader.adapter';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';

const sampleInventory: ComponentInventory = {
  analyzedAt: '2026-07-12T00:00:00.000Z',
  angular: { components: [], services: [], routes: [] },
  nestjs: { controllers: [], services: [], dtos: [] },
};

describe('ComponentInventoryReader', () => {
  const tmpDirs: string[] = [];

  function tmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-inv-reader-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  const reader = new ComponentInventoryReader();

  it('reads and parses component-inventory.json from .qa/', async () => {
    const dir = tmpDir();
    fs.mkdirSync(path.join(dir, '.qa'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.qa', 'component-inventory.json'),
      JSON.stringify(sampleInventory),
      'utf8',
    );

    const result = await reader.read(dir);

    expect(result).toEqual(sampleInventory);
  });

  it('throws when component-inventory.json does not exist', async () => {
    const dir = tmpDir();

    await expect(reader.read(dir)).rejects.toThrow();
  });
});
