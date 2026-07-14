import { ProjectManifest } from '@ai-web-qa-tester/core-domain';
import * as path from 'node:path';
import { FileSystemPort } from '../ports/file-system.port';
import { ManifestWriterPort } from '../ports/manifest-writer.port';
import { ProjectScannerPort } from '../ports/project-scanner.port';

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}

export interface ScanProjectInput {
  frontendPath: string;
  backendPath: string;
}

export class ScanProjectUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly scanner: ProjectScannerPort,
    private readonly writer: ManifestWriterPort,
  ) {}

  async execute(input: ScanProjectInput): Promise<ProjectManifest> {
    const frontendAbs = path.resolve(input.frontendPath);
    const backendAbs = path.resolve(input.backendPath);

    if (!this.fs.exists(frontendAbs)) {
      throw new ScanError(`frontend path not found: ${frontendAbs}`);
    }
    if (!this.fs.isDirectory(frontendAbs)) {
      throw new ScanError(`frontend path is not a directory: ${frontendAbs}`);
    }
    if (!this.fs.exists(backendAbs)) {
      throw new ScanError(`backend path not found: ${backendAbs}`);
    }
    if (!this.fs.isDirectory(backendAbs)) {
      throw new ScanError(`backend path is not a directory: ${backendAbs}`);
    }

    const [frontend, backend] = await Promise.all([
      this.scanner.detect(frontendAbs),
      this.scanner.detect(backendAbs),
    ]);

    const manifest: ProjectManifest = {
      frontendPath: frontendAbs,
      backendPath: backendAbs,
      frontend,
      backend,
      scannedAt: new Date().toISOString(),
    };

    await this.writer.write(manifest, backendAbs);

    return manifest;
  }
}
