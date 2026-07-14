import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ComponentInventoryWriter } from './component-inventory-writer';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';

const sampleInventory: ComponentInventory = {
  analyzedAt: '2026-07-12T00:00:00.000Z',
  angular: {
    components: [{ name: 'AppComponent', selector: 'app-root', filePath: 'src/app.component.ts' }],
    services: [],
    routes: ['', ':id'],
  },
  nestjs: { controllers: [], services: [], dtos: [] },
};

describe('ComponentInventoryWriter', () => {
  const tmpDirs: string[] = [];

  function tmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-inv-writer-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  const writer = new ComponentInventoryWriter();

  it('creates .qa/component-inventory.json inside targetDir', async () => {
    const dir = tmpDir();

    await writer.write(sampleInventory, dir);

    expect(fs.existsSync(path.join(dir, '.qa', 'component-inventory.json'))).toBe(true);
  });

  it('writes valid JSON that matches the inventory shape exactly', async () => {
    const dir = tmpDir();

    await writer.write(sampleInventory, dir);

    const raw = fs.readFileSync(path.join(dir, '.qa', 'component-inventory.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual(sampleInventory);
  });

  it('creates .qa directory if it does not exist', async () => {
    const dir = tmpDir();

    expect(fs.existsSync(path.join(dir, '.qa'))).toBe(false);
    await writer.write(sampleInventory, dir);
    expect(fs.existsSync(path.join(dir, '.qa'))).toBe(true);
  });
});
