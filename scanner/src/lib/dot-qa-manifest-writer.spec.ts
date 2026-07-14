import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DotQaManifestWriter } from './dot-qa-manifest-writer';
import type { ProjectManifest } from '@ai-web-qa-tester/core-domain';

const sampleManifest: ProjectManifest = {
  frontendPath: '/fake/frontend',
  backendPath: '/fake/backend',
  frontend: { framework: 'angular', version: '20.0.0' },
  backend: { framework: 'nestjs', version: '11.0.0' },
  scannedAt: '2026-07-12T00:00:00.000Z',
};

describe('DotQaManifestWriter', () => {
  const tmpDirs: string[] = [];

  function tmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-writer-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  const writer = new DotQaManifestWriter();

  it('creates .qa/project-manifest.json inside targetDir', async () => {
    const dir = tmpDir();

    await writer.write(sampleManifest, dir);

    expect(fs.existsSync(path.join(dir, '.qa', 'project-manifest.json'))).toBe(true);
  });

  it('writes valid JSON that matches the manifest shape exactly', async () => {
    const dir = tmpDir();

    await writer.write(sampleManifest, dir);

    const raw = fs.readFileSync(path.join(dir, '.qa', 'project-manifest.json'), 'utf8');
    const parsed = JSON.parse(raw) as ProjectManifest;
    expect(parsed).toEqual(sampleManifest);
  });

  it('creates the .qa directory if it does not exist', async () => {
    const dir = tmpDir();
    const qaDir = path.join(dir, '.qa');

    expect(fs.existsSync(qaDir)).toBe(false);

    await writer.write(sampleManifest, dir);

    expect(fs.existsSync(qaDir)).toBe(true);
  });

  it('overwrites an existing manifest without error', async () => {
    const dir = tmpDir();

    await writer.write(sampleManifest, dir);

    const updated: ProjectManifest = { ...sampleManifest, scannedAt: '2026-07-13T00:00:00.000Z' };
    await writer.write(updated, dir);

    const raw = fs.readFileSync(path.join(dir, '.qa', 'project-manifest.json'), 'utf8');
    expect(JSON.parse(raw).scannedAt).toBe('2026-07-13T00:00:00.000Z');
  });
});
