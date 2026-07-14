import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PackageJsonDetector } from './package-json-detector';

function writePkg(dir: string, content: object): void {
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(content), 'utf8');
}

describe('PackageJsonDetector', () => {
  const tmpDirs: string[] = [];

  function tmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-detector-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  const detector = new PackageJsonDetector();

  it('detects Angular from dependencies and strips ^ prefix', async () => {
    const dir = tmpDir();
    writePkg(dir, { dependencies: { '@angular/core': '^20.3.0' } });

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'angular', version: '20.3.0' });
  });

  it('detects Angular from devDependencies and strips ~ prefix', async () => {
    const dir = tmpDir();
    writePkg(dir, { devDependencies: { '@angular/core': '~20.0.0' } });

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'angular', version: '20.0.0' });
  });

  it('detects NestJS from dependencies', async () => {
    const dir = tmpDir();
    writePkg(dir, { dependencies: { '@nestjs/core': '^11.0.0' } });

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'nestjs', version: '11.0.0' });
  });

  it('detects NestJS from devDependencies', async () => {
    const dir = tmpDir();
    writePkg(dir, { devDependencies: { '@nestjs/core': '~11.1.0' } });

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'nestjs', version: '11.1.0' });
  });

  it('strips >= prefix from version', async () => {
    const dir = tmpDir();
    writePkg(dir, { dependencies: { '@angular/core': '>=20.0.0' } });

    const result = await detector.detect(dir);

    expect(result.version).toBe('20.0.0');
  });

  it('returns unknown when no known framework dep is present', async () => {
    const dir = tmpDir();
    writePkg(dir, { dependencies: { express: '^4.0.0' } });

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'unknown', version: null });
  });

  it('returns unknown when package.json does not exist', async () => {
    const dir = tmpDir();

    const result = await detector.detect(dir);

    expect(result).toEqual({ framework: 'unknown', version: null });
  });

  it('prefers Angular over NestJS when both are present', async () => {
    const dir = tmpDir();
    writePkg(dir, {
      dependencies: {
        '@angular/core': '^20.0.0',
        '@nestjs/core': '^11.0.0',
      },
    });

    const result = await detector.detect(dir);

    expect(result.framework).toBe('angular');
  });
});
