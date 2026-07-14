import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { ScanProjectUseCase, ScanError } from './scan-project.use-case';
import type { FileSystemPort } from '../ports/file-system.port';
import type { ManifestWriterPort } from '../ports/manifest-writer.port';
import type { ProjectScannerPort } from '../ports/project-scanner.port';
import type { FrameworkDetection } from '@ai-web-qa-tester/core-domain';

const frontendAbs = path.resolve('test-frontend');
const backendAbs = path.resolve('test-backend');

const angularDetection: FrameworkDetection = { framework: 'angular', version: '20.0.0' };
const nestjsDetection: FrameworkDetection = { framework: 'nestjs', version: '11.0.0' };

interface MockOpts {
  frontendExists?: boolean;
  frontendIsDir?: boolean;
  backendExists?: boolean;
  backendIsDir?: boolean;
}

function makeMocks(opts: MockOpts = {}) {
  const {
    frontendExists = true,
    frontendIsDir = true,
    backendExists = true,
    backendIsDir = true,
  } = opts;

  const mockFs: FileSystemPort = {
    exists: vi.fn((p: string) => {
      if (p === frontendAbs) return frontendExists;
      if (p === backendAbs) return backendExists;
      return false;
    }),
    isDirectory: vi.fn((p: string) => {
      if (p === frontendAbs) return frontendIsDir;
      if (p === backendAbs) return backendIsDir;
      return false;
    }),
  };

  const mockScanner: ProjectScannerPort = {
    detect: vi.fn(async (p: string) =>
      p === frontendAbs ? angularDetection : nestjsDetection,
    ),
  };

  const mockWriter: ManifestWriterPort = {
    write: vi.fn(async () => undefined),
  };

  return { mockFs, mockScanner, mockWriter };
}

describe('ScanProjectUseCase', () => {
  it('returns a manifest with resolved paths and detections on happy path', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks();
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    const manifest = await useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' });

    expect(manifest.frontendPath).toBe(frontendAbs);
    expect(manifest.backendPath).toBe(backendAbs);
    expect(manifest.frontend).toEqual(angularDetection);
    expect(manifest.backend).toEqual(nestjsDetection);
    expect(manifest.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('calls writer.write with the manifest and resolved backendAbs', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks();
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    const manifest = await useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' });

    expect(mockWriter.write).toHaveBeenCalledOnce();
    expect(mockWriter.write).toHaveBeenCalledWith(manifest, backendAbs);
  });

  it('throws ScanError when frontend path does not exist', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks({ frontendExists: false });
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    await expect(
      useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }),
    ).rejects.toThrow(ScanError);

    await expect(
      useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }),
    ).rejects.toThrow('frontend path not found');
  });

  it('throws ScanError when frontend path is not a directory', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks({ frontendIsDir: false });
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    await expect(
      useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }),
    ).rejects.toThrow('frontend path is not a directory');
  });

  it('throws ScanError when backend path does not exist', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks({ backendExists: false });
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    await expect(
      useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }),
    ).rejects.toThrow('backend path not found');
  });

  it('throws ScanError when backend path is not a directory', async () => {
    const { mockFs, mockScanner, mockWriter } = makeMocks({ backendIsDir: false });
    const useCase = new ScanProjectUseCase(mockFs, mockScanner, mockWriter);

    await expect(
      useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }),
    ).rejects.toThrow('backend path is not a directory');
  });
});
